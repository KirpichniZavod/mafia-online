const jwt = require('jsonwebtoken');
const roomHandler = require('./room');
const gameHandler = require('./game');

function socketHandler(io, prisma) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.nickname}`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.nickname}`);
    });

    socket.on('join-socket-room', (data) => {
      const { roomId } = data;
      socket.join(`room:${roomId}`);
      console.log(`${socket.user.nickname} joined socket room ${roomId}`);
    });

    roomHandler(io, socket, prisma);
    gameHandler(io, socket, prisma);
  });
}

module.exports = socketHandler;
