const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const NICKNAME_REGEX = /^[a-zA-Zа-яА-ЯёЁ0-9_-]{1,20}$/;

router.post('/register', async (req, res) => {
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
      where: {
        OR: [
          { nickname },
          { login }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.nickname === nickname 
          ? 'Nickname already taken' 
          : 'Login already taken' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nickname,
        login,
        password: hashedPassword
      }
    });

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { login }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
