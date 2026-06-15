const jwt = require('jsonwebtoken');
const log = require('../logger');
const roomHandler = require('./room');
const gameHandler = require('./game');

function socketHandler(io, prisma) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      log.log('socket', log.ICONS.error, 'Connection rejected — no token');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      log.log('socket', log.ICONS.error, 'Connection rejected — invalid token');
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    log.socketConnect(socket, socket.handshake);

    socket.on('disconnect', (reason) => {
      log.socketDisconnect(socket, reason);
    });

    socket.on('join-socket-room', (data) => {
      const { roomId } = data;
      socket.join(`room:${roomId}`);
      log.log('socket', log.ICONS.room, `${socket.user.nickname} joined socket room #${roomId}`);
    });

    roomHandler(io, socket, prisma);
    gameHandler(io, socket, prisma);
  });
}

module.exports = socketHandler;
