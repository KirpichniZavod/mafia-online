const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const PRESET_AVATARS = [
  '🎭', '🦊', '🐺', '💀', '🃏', '🎪', '🌙', '⚡', '🗡️', '🔫',
  '👑', '🏆', '🎯', '🎲', '🔮', '💎', '🔥', '❄️', '🌊', '🌸',
  '🐱', '🐶', '🦁', '🐻', '🐸', '🐧', '🦋', '🐉', '👻', '🤖'
];

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, GIF, WEBP allowed'));
    }
  }
});

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nickname: true, login: true, isAdmin: true, isBanned: true, banReason: true, banUntil: true,
        theme: true, avatar: true, wins: true, losses: true, gamesPlayed: true, createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/avatars/presets', (req, res) => {
  res.json(PRESET_AVATARS);
});

router.put('/avatar', async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar || !PRESET_AVATARS.includes(avatar)) {
      return res.status(400).json({ error: 'Invalid preset avatar' });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar }
    });
    res.json({ success: true, avatar });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/avatar/upload', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl }
    });
    res.json({ success: true, avatar: avatarUrl });
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
      select: { wins: true, losses: true, gamesPlayed: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const games = await prisma.gameHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { gamesPlayed: { gte: 5 } },
      select: { id: true, nickname: true, wins: true, losses: true, gamesPlayed: true, avatar: true },
      orderBy: { wins: 'desc' },
      take: 20
    });
    const leaderboard = users.map(u => ({
      ...u,
      winRate: Math.round((u.wins / u.gamesPlayed) * 100),
      rating: u.wins * 2 - u.losses + Math.floor(u.gamesPlayed * 0.1)
    })).sort((a, b) => b.rating - a.rating);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
