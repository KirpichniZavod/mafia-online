const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const log = require('../logger');

const router = express.Router();
const prisma = new PrismaClient();

const NICKNAME_REGEX = /^[a-zA-Zа-яА-ЯёЁ0-9_-]{1,20}$/;

router.post('/register', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { nickname, login, password } = req.body;

    if (!nickname || !login || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!NICKNAME_REGEX.test(nickname)) {
      return res.status(400).json({
        error: 'Nickname must be 1-20 characters: letters, numbers, _ or -'
      });
    }

    if (login.length < 3) {
      return res.status(400).json({ error: 'Login must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ nickname }, { login }] }
    });

    if (existingUser) {
      const reason = existingUser.nickname === nickname ? 'Nickname taken' : 'Login taken';
      log.log('auth', log.ICONS.warn, `REGISTER FAILED — ${reason}: ${nickname}/${login}`, { ip });
      return res.status(400).json({ error: existingUser.nickname === nickname ? 'Nickname already taken' : 'Login already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { nickname, login, password: hashedPassword }
    });

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    log.auth.register(nickname, ip);

    res.status(201).json({
      token,
      user: { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin }
    });
  } catch (error) {
    log.log('auth', log.ICONS.error, `REGISTER ERROR: ${error.message}`, { ip });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      log.auth.loginFailed(login, 'not found', ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isBanned) {
      if (user.banUntil && new Date(user.banUntil) < new Date()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isBanned: false, banReason: null, banUntil: null }
        });
      } else {
        log.auth.banned(login, ip);
        return res.status(403).json({
          error: 'banned',
          banned: true,
          reason: user.banReason || null,
          until: user.banUntil ? user.banUntil.toISOString() : null
        });
      }
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      log.auth.loginFailed(login, 'wrong password', ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    log.auth.login(user.nickname, ip);

    res.json({
      token,
      user: { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin }
    });
  } catch (error) {
    log.log('auth', log.ICONS.error, `LOGIN ERROR: ${error.message}`, { ip });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
