const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const log = require('../logger');
const roomHandler = require('./room');
const gameHandler = require('./game');

const prisma = new PrismaClient();

function socketHandler(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      log.log('socket', log.ICONS.error, 'Connection rejected — no token');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { isBanned: true, banReason: true, banUntil: true }
      });

      if (user && user.isBanned) {
        if (user.banUntil && new Date(user.banUntil) < new Date()) {
          await prisma.user.update({
            where: { id: decoded.id },
            data: { isBanned: false, banReason: null, banUntil: null }
          });
        } else {
          log.log('socket', log.ICONS.warn, 'BANNED USER BLOCKED: ' + decoded.nickname);
          return next(new Error(JSON.stringify({ banned: true, reason: user.banReason, until: user.banUntil })));
        }
      }

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

      for (const [roomId, game] of games.entries()) {
        if (game.phase === 'night' || game.phase === 'day') {
          const playerInGame = prisma.player.findFirst({
            where: { userId: parseInt(socket.user.id), roomId, isAlive: true }
          });
          if (playerInGame) {
            const discKey = `${roomId}-${socket.user.id}`;
            const timer = setTimeout(() => {
              games.get(roomId)?.disconnectedPlayers?.delete(discKey);
              log.log('game', log.ICONS.warn, socket.user.nickname + ' disconnected timeout in room #' + roomId);
            }, 60000);
            games.get(roomId).disconnectedPlayers = games.get(roomId).disconnectedPlayers || new Map();
            games.get(roomId).disconnectedPlayers.set(discKey, { timer, userId: socket.user.id });
          }
        }
      }
    });

    socket.on('join-socket-room', (data) => {
      const roomId = parseInt(data.roomId);
      socket.join('room:' + roomId);
      log.log('socket', log.ICONS.room, socket.user.nickname + ' joined socket room #' + roomId);
    });

    roomHandler(io, socket, prisma);
    gameHandler(io, socket, prisma);
  });
}

module.exports = socketHandler;
