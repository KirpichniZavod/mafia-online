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
        isAdmin: true, isBanned: true, banReason: true, banUntil: true,
        createdAt: true, wins: true, losses: true, gamesPlayed: true
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
    const { reason, duration } = req.body;

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

    let banUntil = null;
    if (duration && duration !== 'permanent') {
      const seconds = parseInt(duration);
      if (!isNaN(seconds) && seconds > 0) {
        banUntil = new Date(Date.now() + seconds * 1000);
      }
    }

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        isBanned: true,
        banReason: reason || null,
        banUntil
      }
    });

    const durationText = banUntil ? `until ${banUntil.toISOString()}` : 'permanent';
    log.auth.adminAction(req.user.nickname, 'BAN', `${user.nickname} (${durationText})`, ip);

    res.json({
      message: 'User banned',
      user: { id: user.id, nickname: user.nickname },
      banUntil,
      reason
    });
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
      data: { isBanned: false, banReason: null, banUntil: null }
    });

    log.auth.adminAction(req.user.nickname, 'UNBAN', updatedUser.nickname, ip);

    res.json({ message: 'User unbanned', user: { id: updatedUser.id, nickname: updatedUser.nickname } });
  } catch (error) {
    log.log('admin', log.ICONS.error, `UNBAN ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/rooms', async (req, res) => {
  const ip = log.getClientIP(req);
  log.auth.adminAction(req.user.nickname, 'VIEW ROOMS', 'all', ip);
  try {
    const rooms = await prisma.room.findMany({
      include: {
        _count: { select: { players: true } },
        players: {
          include: { user: { select: { id: true, nickname: true } } }
        }
      }
    });
    res.json(rooms);
  } catch (error) {
    log.log('admin', log.ICONS.error, `GET ROOMS ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/room/:roomId', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
      include: { players: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await prisma.player.deleteMany({ where: { roomId: parseInt(roomId) } });
    await prisma.room.delete({ where: { id: parseInt(roomId) } });

    log.auth.adminAction(req.user.nickname, 'DELETE ROOM', `#${roomId} "${room.name}" (${room.players.length} players)`, ip);

    res.json({ message: 'Room deleted', roomId: parseInt(roomId) });
  } catch (error) {
    log.log('admin', log.ICONS.error, `DELETE ROOM ERROR: ${error.message}`);
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

router.post('/kick/:roomId/:userId', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { roomId, userId } = req.params;

    await prisma.player.deleteMany({
      where: { roomId: parseInt(roomId), userId: parseInt(userId) }
    });

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) }, select: { nickname: true } });
    log.auth.adminAction(req.user.nickname, 'KICK', `${user?.nickname} from room #${roomId}`, ip);

    res.json({ message: 'Player kicked' });
  } catch (error) {
    log.log('admin', log.ICONS.error, `KICK ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/make-admin/:userId', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { userId } = req.params;
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isAdmin: true }
    });
    log.auth.adminAction(req.user.nickname, 'MAKE ADMIN', user.nickname, ip);
    res.json({ message: 'User is now admin', user: { id: user.id, nickname: user.nickname } });
  } catch (error) {
    log.log('admin', log.ICONS.error, `MAKE ADMIN ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/remove-admin/:userId', async (req, res) => {
  const ip = log.getClientIP(req);
  try {
    const { userId } = req.params;
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isAdmin: false }
    });
    log.auth.adminAction(req.user.nickname, 'REMOVE ADMIN', user.nickname, ip);
    res.json({ message: 'Admin removed', user: { id: user.id, nickname: user.nickname } });
  } catch (error) {
    log.log('admin', log.ICONS.error, `REMOVE ADMIN ERROR: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
