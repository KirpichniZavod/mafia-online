require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
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

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

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
    console.log('Admin account created: Anubis69 / AnubisTheGod');
  }
}

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    
    await seedAdmin();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
