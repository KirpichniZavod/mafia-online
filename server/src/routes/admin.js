const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const log = require('../logger');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  const ip = log.getClientIP(req);
  log.auth.adminAction(req.user.nickname, 'VIEW USERS', 'all', ip);
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, nickname: true, login: true,
        isAdmin: true, isBanned: true, createdAt: true,
        wins: true, losses: true, gamesPlayed: true
      }
    });
    res.json(users);
  } catch (error) {
    log.log('admin', log.ICONS.error, `GET USERS ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ban/:userId', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isAdmin) {
      log.log('admin', log.ICONS.warn, `BAN BLOCKED — cannot ban admin ${user.nickname}`);
      return res.status(400).json({ error: 'Cannot ban admin' });
    }

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isBanned: true }
    });

    log.auth.adminAction(req.user.nickname, 'BAN', user.nickname, ip);

    res.json({ message: 'User banned', user: { id: user.id, nickname: user.nickname } });
  } catch (error) {
    log.log('admin', log.ICONS.error, `BAN ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/unban/:userId', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { userId } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isBanned: false }
    });

    log.auth.adminAction(req.user.nickname, 'UNBAN', updatedUser.nickname, ip);

    res.json({ message: 'User unbanned', user: { id: updatedUser.id, nickname: updatedUser.nickname } });
  } catch (error) {
    log.log('admin', log.ICONS.error, `UNBAN ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/room/:roomId/roles', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { roomId } = req.params;

    log.auth.adminAction(req.user.nickname, 'VIEW ROLES', `room #${roomId}`, ip);

    const players = await prisma.player.findMany({
      where: { roomId: parseInt(roomId) },
      include: { user: { select: { id: true, nickname: true } } }
    });

    const roles = players.map(p => ({
      userId: p.user.id,
      nickname: p.user.nickname,
      role: p.role,
      isAlive: p.isAlive
    }));

    res.json(roles);
  } catch (error) {
    log.log('admin', log.ICONS.error, `VIEW ROLES ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
