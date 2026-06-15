const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const games = new Map();

function gameHandler(io, socket, prisma) {
  socket.on('start-game', async (data, callback) => {
    try {
      const { roomId } = data;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: { include: { user: true } } }
      });

      if (!room) {
        return callback({ error: 'Room not found' });
      }

      if (room.hostId !== socket.user.id) {
        return callback({ error: 'Only host can start the game' });
      }

      if (room.players.length < 5) {
        return callback({ error: 'Need at least 5 players to start' });
      }

      const roles = assignRoles(room.players.length, room);

      for (let i = 0; i < room.players.length; i++) {
        await prisma.player.update({
          where: { id: room.players[i].id },
          data: { role: roles[i], isAlive: true }
        });
      }

      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'active' }
      });

      const game = {
        phase: 'night',
        dayNumber: 1,
        votes: {},
        mafiaTarget: null,
        commissionerTarget: null,
        doctorTarget: null,
        actionsComplete: new Set()
      };

      games.set(roomId, game);

      io.to(`room:${roomId}`).emit('game-started', { roomId });

      io.to(`room:${roomId}`).emit('phase-change', {
        phase: 'night',
        dayNumber: 1
      });

      callback({ success: true });
    } catch (error) {
      console.error('Start game error:', error);
      callback({ error: 'Failed to start game' });
    }
  });

  socket.on('get-role', async (data, callback) => {
    try {
      const { roomId } = data;

      const player = await prisma.player.findFirst({
        where: {
          userId: socket.user.id,
          roomId
        }
      });

      if (!player) {
        return callback({ error: 'Not in this room' });
      }

      callback({ role: player.role, isAlive: player.isAlive });
    } catch (error) {
      console.error('Get role error:', error);
      callback({ error: 'Failed to get role' });
    }
  });

  socket.on('mafia-kill', async (data, callback) => {
    try {
      const { roomId, targetId } = data;
      const game = games.get(roomId);

      if (!game || game.phase !== 'night') {
        return callback({ error: 'Not night phase' });
      }

      const player = await prisma.player.findFirst({
        where: {
          userId: socket.user.id,
          roomId,
          role: 'mafia',
          isAlive: true
        }
      });

      if (!player) {
        return callback({ error: 'Not a living mafia member' });
      }

      game.mafiaTarget = targetId;
      game.actionsComplete.add(`mafia-${socket.user.id}`);

      io.to(`room:${roomId}`).emit('mafia-action-received');

      callback({ success: true });

      checkNightComplete(io, roomId, game);
    } catch (error) {
      console.error('Mafia kill error:', error);
      callback({ error: 'Failed to process action' });
    }
  });

  socket.on('commissioner-check', async (data, callback) => {
    try {
      const { roomId, targetId } = data;
      const game = games.get(roomId);

      if (!game || game.phase !== 'night') {
        return callback({ error: 'Not night phase' });
      }

      const player = await prisma.player.findFirst({
        where: {
          userId: socket.user.id,
          roomId,
          role: 'commissioner',
          isAlive: true
        }
      });

      if (!player) {
        return callback({ error: 'Not a living commissioner' });
      }

      const target = await prisma.player.findFirst({
        where: {
          userId: targetId,
          roomId
        }
      });

      if (!target) {
        return callback({ error: 'Target not found' });
      }

      const isMafia = target.role === 'mafia';

      socket.emit('check-result', { targetId, isMafia });

      game.commissionerAction = { targetId, isMafia };
      game.actionsComplete.add('commissioner');

      callback({ success: true });

      checkNightComplete(io, roomId, game);
    } catch (error) {
      console.error('Commissioner check error:', error);
      callback({ error: 'Failed to process action' });
    }
  });

  socket.on('doctor-heal', async (data, callback) => {
    try {
      const { roomId, targetId } = data;
      const game = games.get(roomId);

      if (!game || game.phase !== 'night') {
        return callback({ error: 'Not night phase' });
      }

      const player = await prisma.player.findFirst({
        where: {
          userId: socket.user.id,
          roomId,
          role: 'doctor',
          isAlive: true
        }
      });

      if (!player) {
        return callback({ error: 'Not a living doctor' });
      }

      game.doctorTarget = targetId;
      game.actionsComplete.add('doctor');

      callback({ success: true });

      checkNightComplete(io, roomId, game);
    } catch (error) {
      console.error('Doctor heal error:', error);
      callback({ error: 'Failed to process action' });
    }
  });

  socket.on('day-vote', async (data, callback) => {
    try {
      const { roomId, targetId } = data;
      const game = games.get(roomId);

      if (!game || game.phase !== 'day') {
        return callback({ error: 'Not day phase' });
      }

      const player = await prisma.player.findFirst({
        where: {
          userId: socket.user.id,
          roomId,
          isAlive: true
        }
      });

      if (!player) {
        return callback({ error: 'Not a living player' });
      }

      game.votes[socket.user.id] = targetId;

      io.to(`room:${roomId}`).emit('vote-cast', {
        voterId: socket.user.id,
        totalVotes: Object.keys(game.votes).length
      });

      callback({ success: true });

      const alivePlayers = await prisma.player.findMany({
        where: { roomId, isAlive: true }
      });

      if (Object.keys(game.votes).length >= alivePlayers.length) {
        processVotes(io, roomId, game);
      }
    } catch (error) {
      console.error('Vote error:', error);
      callback({ error: 'Failed to cast vote' });
    }
  });

  socket.on('get-players', async (data, callback) => {
    try {
      const { roomId } = data;

      const players = await prisma.player.findMany({
        where: { roomId },
        include: { user: { select: { id: true, nickname: true } } }
      });

      const playerList = players.map(p => ({
        id: p.user.id,
        nickname: p.user.nickname,
        role: p.role,
        isAlive: p.isAlive
      }));

      callback({ players: playerList });
    } catch (error) {
      console.error('Get players error:', error);
      callback({ error: 'Failed to get players' });
    }
  });
}

function checkNightComplete(io, roomId, game) {
  const requiredActions = ['mafia-0', 'commissioner', 'doctor'];

  const mafiaComplete = [...game.actionsComplete].some(a => a.startsWith('mafia-'));
  const commissionerComplete = game.actionsComplete.has('commissioner');
  const doctorComplete = game.actionsComplete.has('doctor');

  if (mafiaComplete && commissionerComplete && doctorComplete) {
    processNight(io, roomId, game);
  }
}

async function processNight(io, roomId, game) {
  const killed = game.mafiaTarget;
  const healed = game.doctorTarget;

  let actualKilled = null;

  if (killed && killed !== healed) {
    await prisma.player.update({
      where: { userId: killed },
      data: { isAlive: false }
    });
    actualKilled = killed;
  }

  game.mafiaTarget = null;
  game.commissionerAction = null;
  game.doctorTarget = null;
  game.actionsComplete.clear();

  const players = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { id: true, nickname: true } } }
  });

  io.to(`room:${roomId}`).emit('night-result', {
    killedId: actualKilled,
    players: players.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      isAlive: p.isAlive
    }))
  });

  const winner = await checkWinCondition(roomId, players);
  
  if (winner) {
    await endGame(io, roomId, winner, players);
    return;
  }

  game.phase = 'day';
  game.dayNumber++;
  game.votes = {};

  io.to(`room:${roomId}`).emit('phase-change', {
    phase: 'day',
    dayNumber: game.dayNumber
  });
}

async function processVotes(io, roomId, game) {
  const voteCounts = {};

  for (const [voter, target] of Object.entries(game.votes)) {
    if (target !== null) {
      voteCounts[target] = (voteCounts[target] || 0) + 1;
    }
  }

  let maxVotes = 0;
  let eliminatedId = null;

  for (const [target, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = parseInt(target);
    }
  }

  if (eliminatedId) {
    await prisma.player.update({
      where: { userId: eliminatedId },
      data: { isAlive: false }
    });
  }

  const players = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { id: true, nickname: true } } }
  });

  io.to(`room:${roomId}`).emit('vote-result', {
    eliminatedId,
    voteCounts,
    players: players.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      isAlive: p.isAlive
    }))
  });

  const winner = await checkWinCondition(roomId, players);
  
  if (winner) {
    await endGame(io, roomId, winner, players);
    return;
  }

  game.phase = 'night';
  game.votes = {};

  setTimeout(() => {
    io.to(`room:${roomId}`).emit('phase-change', {
      phase: 'night',
      dayNumber: game.dayNumber
    });
  }, 3000);
}

async function checkWinCondition(roomId, players) {
  const alivePlayers = players.filter(p => p.isAlive);
  const mafiaCount = alivePlayers.filter(p => p.role === 'mafia').length;
  const townCount = alivePlayers.filter(p => p.role !== 'mafia').length;

  if (mafiaCount === 0) {
    return 'town';
  }

  if (mafiaCount >= townCount) {
    return 'mafia';
  }

  return null;
}

async function endGame(io, roomId, winner, players) {
  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'finished' }
  });

  for (const p of players) {
    const isWinner = (winner === 'town' && p.role !== 'mafia') || (winner === 'mafia' && p.role === 'mafia');
    await prisma.user.update({
      where: { id: p.user.id },
      data: {
        gamesPlayed: { increment: 1 },
        wins: isWinner ? { increment: 1 } : undefined,
        losses: !isWinner ? { increment: 1 } : undefined
      }
    });
  }

  games.delete(roomId);

  io.to(`room:${roomId}`).emit('game-ended', {
    winner,
    players: players.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      role: p.role,
      isAlive: p.isAlive
    }))
  });
}

function assignRoles(playerCount, room) {
  const mCount = room.mafiaCount || Math.floor(playerCount / 4) || 1;
  const cCount = room.commissionerCount || 1;
  const dCount = room.doctorCount || 1;
  const roles = [];

  for (let i = 0; i < mCount; i++) {
    roles.push('mafia');
  }
  for (let i = 0; i < cCount; i++) {
    roles.push('commissioner');
  }
  for (let i = 0; i < dCount; i++) {
    roles.push('doctor');
  }

  while (roles.length < playerCount) {
    roles.push('civilian');
  }

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return roles;
}

module.exports = gameHandler;
