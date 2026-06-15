const { PrismaClient } = require('@prisma/client');
const log = require('../logger');

const prisma = new PrismaClient();
const activeRooms = new Map();

function roomHandler(io, socket, db) {
  const uid = () => parseInt(socket.user.id);

  socket.on('create-room', async (data, callback) => {
    try {
      const { name, maxPlayers = 10, mafiaCount = 0, commissionerCount = 1, doctorCount = 1 } = data;

      if (!name || name.length < 1 || name.length > 30) {
        return callback({ error: 'Room name must be 1-30 characters' });
      }

      const existing = await db.room.findFirst({
        where: { hostId: uid(), status: 'waiting' }
      });

      if (existing) {
        return callback({ error: 'You already have an active room' });
      }

      const mp = Math.min(Math.max(parseInt(maxPlayers) || 10, 5), 10);
      const mc = parseInt(mafiaCount) || 0;
      const cc = parseInt(commissionerCount) || 1;
      const dc = parseInt(doctorCount) || 1;

      const room = await db.room.create({
        data: {
          name: String(name),
          hostId: uid(),
          maxPlayers: mp,
          status: 'waiting',
          mafiaCount: mc,
          commissionerCount: cc,
          doctorCount: dc
        }
      });

      await db.player.create({
        data: { userId: uid(), roomId: room.id }
      });

      socket.join('room:' + room.id);

      activeRooms.set(room.id, { players: [uid()], host: uid() });

      log.room.create(socket.user.nickname, room.id, name, { maxPlayers: mp, mafiaCount: mc, commissionerCount: cc, doctorCount: dc });

      callback({ success: true, roomId: room.id });
      io.emit('room-created', { roomId: room.id, name: name, host: socket.user.nickname });
    } catch (error) {
      log.log('room', log.ICONS.error, 'CREATE ERROR: ' + error.message);
      callback({ error: 'Failed to create room' });
    }
  });

  socket.on('join-room', async (data, callback) => {
    try {
      const roomId = parseInt(data.roomId);

      const room = await db.room.findUnique({
        where: { id: roomId },
        include: { players: true }
      });

      if (!room) {
        return callback({ error: 'Room not found' });
      }

      const alreadyJoined = room.players.some(p => p.userId === uid());

      if (alreadyJoined) {
        socket.join('room:' + roomId);

        const rd = activeRooms.get(roomId) || { players: [], host: room.hostId };
        if (!rd.players.includes(uid())) rd.players.push(uid());
        activeRooms.set(roomId, rd);

        const players = await db.player.findMany({
          where: { roomId: roomId },
          include: { user: { select: { id: true, nickname: true, avatar: true } } }
        });

        const playerList = players.map(p => ({
          id: p.user.id,
          nickname: p.user.nickname,
          isHost: p.userId === room.hostId
        }));

        io.to('room:' + roomId).emit('room-updated', { roomId: roomId, players: playerList });

        log.room.rejoin(socket.user.nickname, roomId);
        return callback({ success: true });
      }

      if (room.status !== 'waiting') {
        return callback({ error: 'Game already started' });
      }

      if (room.players.length >= room.maxPlayers) {
        return callback({ error: 'Room is full' });
      }

      await db.player.create({
        data: { userId: uid(), roomId: roomId }
      });

      socket.join('room:' + roomId);

      const rd = activeRooms.get(roomId) || { players: [], host: room.hostId };
      rd.players.push(uid());
      activeRooms.set(roomId, rd);

      const players = await db.player.findMany({
        where: { roomId: roomId },
        include: { user: { select: { id: true, nickname: true, avatar: true } } }
      });

      const playerList = players.map(p => ({
        id: p.user.id,
        nickname: p.user.nickname,
        isHost: p.userId === room.hostId
      }));

      log.room.join(socket.user.nickname, roomId);

      io.to('room:' + roomId).emit('room-updated', { roomId: roomId, players: playerList });

      callback({ success: true });
    } catch (error) {
      log.log('room', log.ICONS.error, 'JOIN ERROR: ' + error.message);
      callback({ error: 'Failed to join room' });
    }
  });

  socket.on('leave-room', async (data, callback) => {
    try {
      const roomId = parseInt(data.roomId);

      log.room.leave(socket.user.nickname, roomId);

      await db.player.deleteMany({
        where: { userId: uid(), roomId: roomId }
      });

      socket.leave('room:' + roomId);

      const rd = activeRooms.get(roomId);
      if (rd) {
        rd.players = rd.players.filter(id => id !== uid());
        if (rd.players.length === 0) {
          activeRooms.delete(roomId);
          await db.room.delete({ where: { id: roomId } });
          log.room.delete(roomId);
          io.emit('room-deleted', { roomId: roomId });
        } else {
          if (rd.host === uid()) {
            rd.host = rd.players[0];
            log.log('room', log.ICONS.room, 'HOST TRANSFER #' + roomId);
          }
          const players = await db.player.findMany({
            where: { roomId: roomId },
            include: { user: { select: { id: true, nickname: true, avatar: true } } }
          });
          const playerList = players.map(p => ({
            id: p.user.id,
            nickname: p.user.nickname,
            isHost: p.userId === rd.host
          }));
          io.to('room:' + roomId).emit('room-updated', { roomId: roomId, players: playerList });
        }
      }

      callback({ success: true });
    } catch (error) {
      log.log('room', log.ICONS.error, 'LEAVE ERROR: ' + error.message);
      callback({ error: 'Failed to leave room' });
    }
  });

  socket.on('get-rooms', async (callback) => {
    try {
      const rooms = await db.room.findMany({
        where: { status: 'waiting' },
        include: { _count: { select: { players: true } } }
      });

      const roomList = rooms.map(r => ({
        id: r.id,
        name: r.name,
        players: r._count.players,
        maxPlayers: r.maxPlayers
      }));

      callback({ rooms: roomList });
    } catch (error) {
      callback({ error: 'Failed to get rooms' });
    }
  });

  socket.on('chat-message', async (data) => {
    try {
      const roomId = parseInt(data.roomId);
      const message = data.message;
      if (!message || message.length > 200) return;

      log.log('room', log.ICONS.info, 'CHAT #' + roomId + ' ' + socket.user.nickname + ': ' + message.substring(0, 50));

      io.to('room:' + roomId).emit('chat-message', {
        nickname: socket.user.nickname,
        message: message,
        timestamp: Date.now()
      });
    } catch (error) {
      log.log('room', log.ICONS.error, 'CHAT ERROR: ' + error.message);
    }
  });
}

module.exports = roomHandler;
