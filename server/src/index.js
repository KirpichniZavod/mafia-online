require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const log = require('./logger');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const socketHandler = require('./socket');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  log.httpRequest(req, res);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

socketHandler(io, prisma);

const PORT = process.env.PORT || 3001;

async function seedAdmin() {
  const bcrypt = require('bcryptjs');

  const adminExists = await prisma.user.findUnique({
    where: { login: 'Anubis69' }
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('AnubisTheGod', 10);
    await prisma.user.create({
      data: {
        nickname: 'Anubis',
        login: 'Anubis69',
        password: hashedPassword,
        isAdmin: true
      }
    });
    log.log('auth', log.ICONS.admin, 'Admin account seeded: Anubis69 / AnubisTheGod');
  } else {
    log.log('auth', log.ICONS.admin, 'Admin account exists: Anubis69');
  }
}

async function start() {
  try {
    await prisma.$connect();
    log.log('db', log.ICONS.db, 'Database connected');

    await seedAdmin();

    server.listen(PORT, () => {
      log.log('server', log.ICONS.success, `Server running on port ${PORT}`);
      console.log('');
      console.log(`${log.COLORS.cyan}╔══════════════════════════════════════════╗${log.COLORS.reset}`);
      console.log(`${log.COLORS.cyan}║${log.COLORS.reset}  🎮 Mafia Online Server                  ${log.COLORS.cyan}║${log.COLORS.reset}`);
      console.log(`${log.COLORS.cyan}║${log.COLORS.reset}  Port: ${PORT}                              ${log.COLORS.cyan}║${log.COLORS.reset}`);
      console.log(`${log.COLORS.cyan}║${log.COLORS.reset}  Client: ${process.env.CLIENT_URL || 'not set'}  ${log.COLORS.cyan}║${log.COLORS.reset}`);
      console.log(`${log.COLORS.cyan}╚══════════════════════════════════════════╝${log.COLORS.reset}`);
      console.log('');
    });
  } catch (error) {
    log.log('server', log.ICONS.error, 'Failed to start server', { error: error.message });
    process.exit(1);
  }
}

start();
