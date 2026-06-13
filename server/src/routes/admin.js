const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        login: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ban/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.status(400).json({ error: 'Cannot ban admin' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isBanned: true }
    });

    res.json({ message: 'User banned', user: { id: updatedUser.id, nickname: updatedUser.nickname } });
  } catch (error) {
    console.error('Ban error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/unban/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isBanned: false }
    });

    res.json({ message: 'User unbanned', user: { id: updatedUser.id, nickname: updatedUser.nickname } });
  } catch (error) {
    console.error('Unban error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/room/:roomId/roles', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const players = await prisma.player.findMany({
      where: { roomId: parseInt(roomId) },
      include: {
        user: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    const roles = players.map(p => ({
      userId: p.user.id,
      nickname: p.user.nickname,
      role: p.role,
      isAlive: p.isAlive
    }));

    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
