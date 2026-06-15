const { PrismaClient } = require('@prisma/client');
const log = require('../logger');

const prisma = new PrismaClient();

const games = new Map();
const disconnectedPlayers = new Map();

const NIGHT_TIMEOUT = 60000;
const DAY_TIMEOUT = 120000;
const RESULT_DELAY = 5000;
const RECONNECT_TIMEOUT = 60000;

function gameHandler(io, socket, prisma) {
  const uid = () => parseInt(uid());

  socket.on('start-game', async (data, callback) => {
    try {
      const { roomId: rawRoomId } = data;
      const roomId = parseInt(rawRoomId);

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: { include: { user: true } } }
      });

      if (!room) return callback({ error: 'Room not found' });
      if (room.hostId !== uid()) return callback({ error: 'Only host can start' });
      if (room.players.length < 5) return callback({ error: 'Need at least 5 players' });

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
        nightActions: {},
        nightPlayers: new Set(),
        timer: null,
        startTime: Date.now()
      };

      games.set(roomId, game);

      const updatedPlayers = await prisma.player.findMany({
        where: { roomId },
        include: { user: { select: { id: true, nickname: true } } }
      });

      io.to(`room:${roomId}`).emit('game-started', { roomId });

      log.game.start(roomId, room.players.length, roles);

      io.to(`room:${roomId}`).emit('phase-change', {
        phase: 'night',
        dayNumber: 1,
        timeLeft: NIGHT_TIMEOUT / 1000,
        players: updatedPlayers.map(p => ({
          id: p.user.id,
          nickname: p.user.nickname,
          isAlive: p.isAlive
        }))
      });

      startNightTimer(io, roomId, game);

      callback({ success: true });
    } catch (error) {
      console.error('Start game error:', error);
      callback({ error: 'Failed to start game' });
    }
  });

  socket.on('get-role', async (data, callback) => {
    try {
      const rid = parseInt(data.roomId);
      const player = await prisma.player.findFirst({
        where: { userId: uid(), roomId: rid }
      });
      if (!player) return callback({ error: 'Not in room' });
      callback({ role: player.role, isAlive: player.isAlive });
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });

  socket.on('get-players', async (data, callback) => {
    try {
      const rid = parseInt(data.roomId);
      const players = await prisma.player.findMany({
        where: { roomId: rid },
        include: { user: { select: { id: true, nickname: true, avatar: true } } }
      });
      callback({
        players: players.map(p => ({
          id: p.user.id,
          nickname: p.user.nickname,
          avatar: p.user.avatar,
          role: p.role,
          isAlive: p.isAlive
        }))
      });
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });

  socket.on('reconnect-game', async (data, callback) => {
    try {
      const rid = parseInt(data.roomId);
      const game = games.get(rid);
      if (!game) return callback({ error: 'Game not found' });

      const player = await prisma.player.findFirst({
        where: { userId: uid(), roomId: rid },
        include: { user: { select: { id: true, nickname: true, avatar: true } } }
      });
      if (!player) return callback({ error: 'Not in game' });

      socket.join('room:' + rid);

      const discKey = `${rid}-${uid()}`;
      if (disconnectedPlayers.has(discKey)) {
        clearTimeout(disconnectedPlayers.get(discKey).timer);
        disconnectedPlayers.delete(discKey);
        log.log('game', log.ICONS.success, player.user.nickname + ' reconnected to room #' + rid);
      }

      callback({
        success: true,
        phase: game.phase,
        dayNumber: game.dayNumber,
        role: player.role,
        isAlive: player.isAlive,
        timeLeft: Math.max(0, Math.ceil((game.startTime + (game.phase === 'night' ? NIGHT_TIMEOUT : DAY_TIMEOUT) - Date.now()) / 1000))
      });
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });

  socket.on('mafia-kill', async (data, callback) => {
    try {
      const { roomId, targetId: rawTargetId } = data;
      const rid = parseInt(roomId);
      const targetId = parseInt(rawTargetId);
      const game = games.get(rid);
      if (!game || game.phase !== 'night') return callback({ error: 'Not night' });

      const player = await prisma.player.findFirst({
        where: { userId: uid(), roomId: rid, role: 'mafia', isAlive: true }
      });
      if (!player) return callback({ error: 'Not mafia' });

      game.nightActions[uid()] = { type: 'kill', targetId };
      game.nightPlayers.add(uid());

      const targetPlayer = await prisma.player.findFirst({
        where: { userId: targetId, roomId: rid },
        include: { user: { select: { nickname: true } } }
      });
      log.game.mafiaKill(socket.user.nickname, targetPlayer?.user?.nickname || targetId, rid);

      callback({ success: true });

      io.to(`room:${rid}`).emit('action-received', {
        role: 'mafia',
        count: [...game.nightPlayers].filter(id => {
          const p = players_cache.get(`${rid}-${id}`);
          return p && p.role === 'mafia';
        }).length
      });

      checkNightComplete(io, rid, game);
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });

  socket.on('commissioner-check', async (data, callback) => {
    try {
      const { roomId, targetId: rawTargetId } = data;
      const targetId = parseInt(rawTargetId);
      const game = games.get(roomId);
      if (!game || game.phase !== 'night') return callback({ error: 'Not night' });

      const player = await prisma.player.findFirst({
        where: { userId: uid(), roomId: parseInt(roomId), role: 'commissioner', isAlive: true }
      });
      if (!player) return callback({ error: 'Not sheriff' });

      const target = await prisma.player.findFirst({
        where: { userId: targetId, roomId: parseInt(roomId) }
      });
      if (!target) return callback({ error: 'Target not found' });

      const isMafia = target.role === 'mafia';
      socket.emit('check-result', { targetId, isMafia });

      const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { nickname: true } });
      log.game.commissionerCheck(socket.user.nickname, targetUser?.nickname || targetId, isMafia, roomId);

      game.nightActions[uid()] = { type: 'check', targetId };
      game.nightPlayers.add(uid());

      callback({ success: true });
      checkNightComplete(io, roomId, game);
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });

  socket.on('doctor-heal', async (data, callback) => {
    try {
      const { roomId, targetId: rawTargetId } = data;
      const targetId = parseInt(rawTargetId);
      const game = games.get(parseInt(roomId));
      if (!game || game.phase !== 'night') return callback({ error: 'Not night' });

      const player = await prisma.player.findFirst({
        where: { userId: uid(), roomId: parseInt(roomId), role: 'doctor', isAlive: true }
      });
      if (!player) return callback({ error: 'Not doctor' });

      game.nightActions[uid()] = { type: 'heal', targetId };
      game.nightPlayers.add(uid());

      const healTarget = await prisma.user.findUnique({ where: { id: targetId }, select: { nickname: true } });
      log.game.doctorHeal(socket.user.nickname, healTarget?.nickname || targetId, roomId);

      callback({ success: true });
      checkNightComplete(io, parseInt(roomId), game);
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });

  socket.on('day-vote', async (data, callback) => {
    try {
      const { roomId, targetId: rawTargetId } = data;
      const rid = parseInt(roomId);
      const targetId = rawTargetId !== null && rawTargetId !== undefined ? parseInt(rawTargetId) : null;
      const game = games.get(rid);
      if (!game || game.phase !== 'day') return callback({ error: 'Not day' });

      const player = await prisma.player.findFirst({
        where: { userId: uid(), roomId: rid, isAlive: true }
      });
      if (!player) return callback({ error: 'Not alive' });

      game.votes[uid()] = targetId;

      const voteTargetUser = targetId ? await prisma.user.findUnique({ where: { id: targetId }, select: { nickname: true } }) : null;
      log.game.vote(socket.user.nickname, voteTargetUser?.nickname || null, rid);

      const alivePlayers = await prisma.player.findMany({
        where: { roomId: rid, isAlive: true }
      });

      io.to(`room:${rid}`).emit('vote-cast', {
        voterId: uid(),
        totalVotes: Object.keys(game.votes).length,
        totalAlive: alivePlayers.length
      });

      callback({ success: true });

      if (Object.keys(game.votes).length >= alivePlayers.length) {
        if (game.timer) clearTimeout(game.timer);
        processVotes(io, roomId, game);
      }
    } catch (error) {
      callback({ error: 'Failed' });
    }
  });
}

const players_cache = new Map();

function startNightTimer(io, roomId, game) {
  if (game.timer) clearTimeout(game.timer);

  const tick = () => {
    const elapsed = Date.now() - game.startTime;
    const left = Math.max(0, Math.ceil((NIGHT_TIMEOUT - elapsed) / 1000));
    io.to(`room:${roomId}`).emit('timer-tick', { timeLeft: left });

    if (left > 0) {
      game.timer = setTimeout(tick, 1000);
    } else {
      processNight(io, roomId, game);
    }
  };

  game.timer = setTimeout(tick, 1000);
}

function startDayTimer(io, roomId, game) {
  if (game.timer) clearTimeout(game.timer);
  game.startTime = Date.now();

  const tick = () => {
    const elapsed = Date.now() - game.startTime;
    const left = Math.max(0, Math.ceil((DAY_TIMEOUT - elapsed) / 1000));
    io.to(`room:${roomId}`).emit('timer-tick', { timeLeft: left });

    if (left > 0) {
      game.timer = setTimeout(tick, 1000);
    } else {
      processVotes(io, roomId, game);
    }
  };

  game.timer = setTimeout(tick, 1000);
}

async function checkNightComplete(io, roomId, game) {
  const requiredRoles = ['mafia', 'commissioner', 'doctor'];
  const actedRoles = new Set();

  for (const [userId, action] of Object.entries(game.nightActions)) {
    const cacheKey = `${roomId}-${userId}`;
    let player = players_cache.get(cacheKey);
    if (!player) {
      player = await prisma.player.findFirst({
        where: { userId: parseInt(userId), roomId },
        select: { role: true }
      });
      if (player) players_cache.set(cacheKey, player);
    }
    if (player) actedRoles.add(player.role);
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const allRoles = [];
  if ((room.mafiaCount || 1) > 0) allRoles.push('mafia');
  if ((room.commissionerCount || 1) > 0) allRoles.push('commissioner');
  if ((room.doctorCount || 1) > 0) allRoles.push('doctor');

  const allActed = allRoles.every(r => actedRoles.has(r));

  if (allActed) {
    if (game.timer) clearTimeout(game.timer);
    await processNight(io, roomId, game);
  }
}

async function processNight(io, roomId, game) {
  const alivePlayers = await prisma.player.findMany({
    where: { roomId, isAlive: true },
    include: { user: { select: { id: true, nickname: true } } }
  });

  const mafiaIds = alivePlayers.filter(p => p.role === 'mafia').map(p => p.userId);

  let targetId = null;
  let voteCount = {};
  for (const mid of mafiaIds) {
    const action = game.nightActions[mid];
    if (action && action.type === 'kill') {
      voteCount[action.targetId] = (voteCount[action.targetId] || 0) + 1;
    }
  }
  let maxVotes = 0;
  for (const [tid, count] of Object.entries(voteCount)) {
    if (count > maxVotes) {
      maxVotes = count;
      targetId = parseInt(tid);
    }
  }

  let healedId = null;
  for (const [userId, action] of Object.entries(game.nightActions)) {
    if (action.type === 'heal') {
      healedId = action.targetId;
    }
  }

  let killedId = null;
  if (targetId && targetId !== healedId) {
    const targetPlayer = alivePlayers.find(p => p.userId === targetId);
    if (targetPlayer) {
      await prisma.player.update({
        where: { id: targetPlayer.id },
        data: { isAlive: false }
      });
      killedId = targetId;
    }
  }

  game.nightActions = {};
  game.nightPlayers = new Set();

  const updatedPlayers = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { id: true, nickname: true } } }
  });

  const killedPlayer = killedId ? updatedPlayers.find(p => p.userId === killedId) : null;

  log.game.nightResult(roomId, killedPlayer?.user?.nickname || null, targetId === healedId && healedId !== null);

  io.to(`room:${roomId}`).emit('night-result', {
    killedId,
    killedNickname: killedPlayer ? killedPlayer.user.nickname : null,
    wasHealed: targetId === healedId && healedId !== null,
    players: updatedPlayers.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      isAlive: p.isAlive
    }))
  });

  const winner = checkWinCondition(updatedPlayers);

  if (winner) {
    await endGame(io, roomId, winner, updatedPlayers);
    return;
  }

  game.phase = 'day';
  game.dayNumber++;
  game.votes = {};
  game.startTime = Date.now();

  log.game.phaseChange(roomId, 'day', game.dayNumber);

  io.to(`room:${roomId}`).emit('phase-change', {
    phase: 'day',
    dayNumber: game.dayNumber,
    timeLeft: DAY_TIMEOUT / 1000,
    players: updatedPlayers.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      isAlive: p.isAlive
    }))
  });

  startDayTimer(io, roomId, game);
}

async function processVotes(io, roomId, game) {
  if (game.phase !== 'day') return;

  const voteCounts = {};
  for (const [voter, target] of Object.entries(game.votes)) {
    if (target !== null && target !== undefined) {
      voteCounts[target] = (voteCounts[target] || 0) + 1;
    }
  }

  let maxVotes = 0;
  let eliminatedId = null;
  let tie = false;

  for (const [target, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = parseInt(target);
      tie = false;
    } else if (count === maxVotes) {
      tie = true;
    }
  }

  if (tie) eliminatedId = null;

  if (eliminatedId) {
    const player = await prisma.player.findFirst({
      where: { userId: eliminatedId, roomId }
    });
    if (player) {
      await prisma.player.update({
        where: { id: player.id },
        data: { isAlive: false }
      });
    }
  }

  game.votes = {};

  const players = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { id: true, nickname: true } } }
  });

  const eliminatedPlayer = eliminatedId ? players.find(p => p.userId === eliminatedId) : null;

  log.game.voteResult(roomId, eliminatedPlayer?.user?.nickname || null, tie);

  io.to(`room:${roomId}`).emit('vote-result', {
    eliminatedId,
    eliminatedNickname: eliminatedPlayer ? eliminatedPlayer.user.nickname : null,
    tie,
    voteCounts,
    players: players.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      isAlive: p.isAlive,
      role: p.role
    }))
  });

  const winner = checkWinCondition(players);

  if (winner) {
    setTimeout(async () => {
      await endGame(io, roomId, winner, players);
    }, RESULT_DELAY);
    return;
  }

  setTimeout(() => {
    game.phase = 'night';
    game.startTime = Date.now();
    game.votes = {};

    log.game.phaseChange(roomId, 'night', game.dayNumber);

    io.to(`room:${roomId}`).emit('phase-change', {
      phase: 'night',
      dayNumber: game.dayNumber,
      timeLeft: NIGHT_TIMEOUT / 1000,
      players: players.map(p => ({
        id: p.user.id,
        nickname: p.user.nickname,
        isAlive: p.isAlive
      }))
    });

    startNightTimer(io, roomId, game);
  }, RESULT_DELAY);
}

function checkWinCondition(players) {
  const alive = players.filter(p => p.isAlive);
  const mafiaCount = alive.filter(p => p.role === 'mafia').length;
  const townCount = alive.filter(p => p.role !== 'mafia').length;

  if (mafiaCount === 0) return 'town';
  if (mafiaCount >= townCount) return 'mafia';
  return null;
}

async function endGame(io, roomId, winner, players) {
  log.game.end(roomId, winner);

  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'finished' }
  });

  const game = games.get(roomId);
  if (game && game.timer) clearTimeout(game.timer);
  games.delete(roomId);

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

  io.to(`room:${roomId}`).emit('game-ended', {
    winner,
    players: players.map(p => ({
      id: p.user.id,
      nickname: p.user.nickname,
      role: p.role,
      isAlive: p.isAlive
    }))
  });

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    await prisma.gameHistory.create({
      data: {
        roomId,
        winner,
        players: JSON.stringify(players.map(p => ({
          id: p.user.id,
          nickname: p.user.nickname,
          role: p.role,
          isAlive: p.isAlive
        }))),
        duration: game ? Math.floor((Date.now() - game.startTime) / 1000) : 0
      }
    });
  } catch (e) {
    log.log('game', log.ICONS.error, 'Failed to save game history: ' + e.message);
  }
}

function assignRoles(playerCount, room) {
  const mCount = room.mafiaCount || Math.floor(playerCount / 4) || 1;
  const cCount = room.commissionerCount || 1;
  const dCount = room.doctorCount || 1;
  const roles = [];

  for (let i = 0; i < mCount; i++) roles.push('mafia');
  for (let i = 0; i < cCount; i++) roles.push('commissioner');
  for (let i = 0; i < dCount; i++) roles.push('doctor');
  while (roles.length < playerCount) roles.push('civilian');

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return roles;
}

module.exports = gameHandler;
