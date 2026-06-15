const { PrismaClient } = require('@prisma/client');
const log = require('../logger');

const prisma = new PrismaClient();

const activeRooms = new Map();

function roomHandler(io, socket, prisma) {
  socket.on('create-room', async (data, callback) => {
    try {
      const { name, maxPlayers = 10, mafiaCount = 0, commissionerCount = 1, doctorCount = 1 } = data;

      if (!name || name.length < 1 || name.length > 30) {
        return callback({ error: 'Room name must be 1-30 characters' });
      }

      const existingRoom = await prisma.room.findFirst({
        where: { hostId: socket.user.id, status: 'waiting' }
      });

      if (existingRoom) {
        return callback({ error: 'You already have an active room' });
      }

      const room = await prisma.room.create({
        data: {
          name,
          hostId: socket.user.id,
          maxPlayers: Math.min(Math.max(maxPlayers, 5), 10),
          status: 'waiting',
          mafiaCount,
          commissionerCount,
          doctorCount
        }
      });

      await prisma.player.create({
        data: { userId: socket.user.id, roomId: room.id }
      });

      socket.join(`room:${room.id}`);

      activeRooms.set(room.id, {
        players: [socket.user.id],
        host: socket.user.id
      });

      log.room.create(socket.user.nickname, room.id, name, { maxPlayers, mafiaCount, commissionerCount, doctorCount });

      callback({ success: true, roomId: room.id });
      io.emit('room-created', { roomId: room.id, name, host: socket.user.nickname });
    } catch (error) {
      log.log('room', log.ICONS.error, `CREATE ERROR: ${error.message}`);
      callback({ error: 'Failed to create room' });
    }
  });

  socket.on('join-room', async (data, callback) => {
    try {
      const { roomId } = data;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: true }
      });

      if (!room) {
        log.log('room', log.ICONS.error, `JOIN FAILED — room #${roomId} not found`);
        return callback({ error: 'Room not found' });
      }

      const alreadyJoined = room.players.some(p => p.userId === socket.user.id);

      if (alreadyJoined) {
        log.room.rejoin(socket.user.nickname, roomId);
        socket.join(`room:${room.id}`);

        const roomData = activeRooms.get(room.id) || { players: [], host: room.hostId };
        if (!roomData.players.includes(socket.user.id)) {
          roomData.players.push(socket.user.id);
        }
        activeRooms.set(room.id, roomData);

        const players = await prisma.player.findMany({
          where: { roomId: room.id },
          include: { user: { select: { id: true, nickname: true } } }
        });

        io.to(`room:${room.id}`).emit('room-updated', {
          roomId: room.id,
          players: players.map(p => ({
            id: p.user.id,
            nickname: p.user.nickname,
            isHost: p.userId === room.hostId
          }))
        });

        return callback({ success: true });
      }

      if (room.status !== 'waiting') {
        log.log('room', log.ICONS.warn, `JOIN BLOCKED — ${socket.user.nickname} → #${roomId} (game started)`);
        return callback({ error: 'Game already started' });
      }

      if (room.players.length >= room.maxPlayers) {
        log.log('room', log.ICONS.warn, `JOIN BLOCKED — ${socket.user.nickname} → #${roomId} (full)`);
        return callback({ error: 'Room is full' });
      }

      await prisma.player.create({
        data: { userId: socket.user.id, roomId: room.id }
      });

      socket.join(`room:${room.id}`);

      const roomData = activeRooms.get(room.id) || { players: [], host: room.hostId };
      roomData.players.push(socket.user.id);
      activeRooms.set(room.id, roomData);

      const players = await prisma.player.findMany({
        where: { roomId: room.id },
        include: { user: { select: { id: true, nickname: true } } }
      });

      log.room.join(socket.user.nickname, roomId);

      io.to(`room:${room.id}`).emit('room-updated', {
        roomId: room.id,
        players: players.map(p => ({
          id: p.user.id,
          nickname: p.user.nickname,
          isHost: p.userId === room.hostId
        }))
      });

      callback({ success: true });
    } catch (error) {
      log.log('room', log.ICONS.error, `JOIN ERROR: ${error.message}`);
      callback({ error: 'Failed to join room' });
    }
  });

  socket.on('leave-room', async (data, callback) => {
    try {
      const { roomId } = data;

      log.room.leave(socket.user.nickname, roomId);

      await prisma.player.deleteMany({
        where: { userId: socket.user.id, roomId: roomId }
      });

      socket.leave(`room:${roomId}`);

      const roomData = activeRooms.get(roomId);
      if (roomData) {
        roomData.players = roomData.players.filter(id => id !== socket.user.id);
        if (roomData.players.length === 0) {
          activeRooms.delete(roomId);
          await prisma.room.delete({ where: { id: roomId } });
          log.room.delete(roomId);
          io.emit('room-deleted', { roomId });
        } else {
          if (roomData.host === socket.user.id) {
            roomData.host = roomData.players[0];
            log.log('room', log.ICONS.room, `HOST TRANSFER #${roomId} → new host: ${roomData.host}`);
          }
          const players = await prisma.player.findMany({
            where: { roomId },
            include: { user: { select: { id: true, nickname: true } } }
          });
          io.to(`room:${roomId}`).emit('room-updated', {
            roomId,
            players: players.map(p => ({
              id: p.user.id,
              nickname: p.user.nickname,
              isHost: p.userId === roomData.host
            }))
          });
        }
      }

      callback({ success: true });
    } catch (error) {
      log.log('room', log.ICONS.error, `LEAVE ERROR: ${error.message}`);
      callback({ error: 'Failed to leave room' });
    }
  });

  socket.on('get-rooms', async (callback) => {
    try {
      const rooms = await prisma.room.findMany({
        where: { status: 'waiting' },
        include: { _count: { select: { players: true } } }
      });

      const roomList = rooms.map(room => ({
        id: room.id,
        name: room.name,
        players: room._count.players,
        maxPlayers: room.maxPlayers
      }));

      callback({ rooms: roomList });
    } catch (error) {
      callback({ error: 'Failed to get rooms' });
    }
  });

  socket.on('chat-message', async (data) => {
    try {
      const { roomId, message } = data;
      if (!message || message.length > 200) return;

      log.log('room', log.ICONS.info, `CHAT #${roomId} ${socket.user.nickname}: ${message.substring(0, 50)}`);

      io.to(`room:${roomId}`).emit('chat-message', {
        nickname: socket.user.nickname,
        message,
        timestamp: Date.now()
      });
    } catch (error) {
      log.log('room', log.ICONS.error, `CHAT ERROR: ${error.message}`);
    }
  });
}

module.exports = roomHandler;
