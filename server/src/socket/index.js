const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const log = require('../logger');
const roomHandler = require('./room');
const gameHandler = require('./game');

const prisma = new PrismaClient();

function socketHandler(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

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

    socket.on('disconnect', async (reason) => {
      log.socketDisconnect(socket, reason);

      try {
        const playerRooms = await prisma.player.findMany({
          where: { userId: parseInt(socket.user.id) },
          include: { room: true }
        });

        for (const player of playerRooms) {
          if (player.room.status === 'waiting') {
            await prisma.player.delete({ where: { id: player.id } });

            const remainingPlayers = await prisma.player.findMany({
              where: { roomId: player.roomId },
              include: { user: { select: { id: true, nickname: true, avatar: true } } }
            });

            if (remainingPlayers.length === 0) {
              await prisma.room.delete({ where: { id: player.roomId } });
              io.emit('room-deleted', { roomId: player.roomId });
              log.room.delete(player.roomId);
            } else {
              const newHost = remainingPlayers[0];
              if (player.room.hostId === parseInt(socket.user.id)) {
                await prisma.room.update({
                  where: { id: player.roomId },
                  data: { hostId: newHost.userId }
                });
              }
              const playerList = remainingPlayers.map(p => ({
                id: p.user.id, nickname: p.user.nickname, avatar: p.user.avatar,
                isHost: p.userId === newHost.userId || p.userId === player.room.hostId
              }));
              io.to('room:' + player.roomId).emit('room-updated', { roomId: player.roomId, players: playerList });
            }
          }
        }
      } catch (e) {
        log.log('socket', log.ICONS.error, 'Disconnect cleanup error: ' + e.message);
      }
    });

    socket.on('join-socket-room', (data) => {
      const roomId = parseInt(data.roomId);
      socket.join('room:' + roomId);
    });

    roomHandler(io, socket, prisma);
    gameHandler(io, socket, prisma);
  });
}

module.exports = socketHandler;
