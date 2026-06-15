const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nickname: true,
        login: true,
        isAdmin: true,
        theme: true,
        avatar: true,
        wins: true,
        losses: true,
        gamesPlayed: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['dark', 'light', 'lemon'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { theme }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        wins: true,
        losses: true,
        gamesPlayed: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
