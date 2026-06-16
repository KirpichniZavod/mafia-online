import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import GameChat from '../components/Chat/GameChat';
import config from '../config';

function Game({ user, token }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState([]);
  const [role, setRole] = useState(null);
  const [isAlive, setIsAlive] = useState(true);
  const [phase, setPhase] = useState('waiting');
  const [dayNumber, setDayNumber] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [actionMade, setActionMade] = useState(false);
  const [nightResult, setNightResult] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectTimer, setReconnectTimer] = useState(0);

  useEffect(() => {
    const newSocket = io(config.serverUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setReconnectTimer(0);
      setReconnecting(false);
      newSocket.emit('join-room', { roomId: parseInt(roomId) }, () => {});
      newSocket.emit('get-role', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.role) {
          setRole(res.role);
          setIsAlive(res.isAlive);
        }
      });
      newSocket.emit('get-players', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.players) {
          setPlayers(res.players);
          const me = res.players.find(p => p.id === user.id);
          if (me) setIsHost(me.isHost);
        }
      });
      newSocket.emit('reconnect-game', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.success) {
          setPhase(res.phase);
          setDayNumber(res.dayNumber);
          setRole(res.role);
          setIsAlive(res.isAlive);
          if (res.timeLeft > 0) setTimeLeft(res.timeLeft);
        }
      });
    });

    newSocket.on('connect_error', (err) => {
      setError('Ошибка подключения: ' + err.message);
      setConnected(false);
    });

    newSocket.on('room-updated', (data) => {
      setPlayers(data.players);
      const me = data.players.find(p => p.id === user.id);
      if (me) setIsHost(me.isHost);
    });

    newSocket.on('game-started', () => {
      setHasStarted(true);
      setPhase('night');
      setDayNumber(1);
      setActionMade(false);
      setNightResult(null);
      setVoteResult(null);
      setLastCheck(null);
      newSocket.emit('get-role', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.role) {
          setRole(res.role);
          setIsAlive(res.isAlive);
        }
      });
      newSocket.emit('get-players', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.players) setPlayers(res.players);
      });
    });

    newSocket.on('phase-change', (data) => {
      setPhase(data.phase);
      setDayNumber(data.dayNumber);
      setSelectedTarget(null);
      setActionMade(false);
      setNightResult(null);
      setVoteResult(null);
      if (data.players) setPlayers(data.players);
      newSocket.emit('get-role', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.role) {
          setRole(res.role);
          setIsAlive(res.isAlive);
        }
      });
      newSocket.emit('get-players', { roomId: parseInt(roomId) }, (res) => {
        if (res && res.players) setPlayers(res.players);
      });
    });

    newSocket.on('timer-tick', (data) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('night-result', (data) => {
      setNightResult(data);
      if (data.players) setPlayers(data.players);
      const me = data.players?.find(p => p.id === user.id);
      if (me) setIsAlive(me.isAlive);
    });

    newSocket.on('vote-result', (data) => {
      setVoteResult(data);
      if (data.players) setPlayers(data.players);
      const me = data.players?.find(p => p.id === user.id);
      if (me) setIsAlive(me.isAlive);
    });

    newSocket.on('check-result', (data) => {
      setLastCheck(data);
    });

    newSocket.on('action-received', () => {});

    newSocket.on('vote-cast', () => {});

    newSocket.on('game-ended', (data) => {
      setGameResult(data);
      setPhase('ended');
      if (data.players) setPlayers(data.players);
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [token, roomId, user.id]);

  const emit = (event, data) => {
    if (!socket) return;
    socket.emit(event, data, (response) => {
      if (response && response.error) setError(response.error);
    });
  };

  const handleStartGame = () => {
    emit('start-game', { roomId: parseInt(roomId) });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      emit('leave-room', { roomId: parseInt(roomId) });
    }
    navigate('/lobby');
  };

  const handleMafiaKill = (targetId) => {
    setSelectedTarget(targetId);
    setActionMade(true);
    emit('mafia-kill', { roomId: parseInt(roomId), targetId });
  };

  const handlecommissionerCheck = (targetId) => {
    setSelectedTarget(targetId);
    setActionMade(true);
    emit('commissioner-check', { roomId: parseInt(roomId), targetId });
  };

  const handleDoctorHeal = (targetId) => {
    setSelectedTarget(targetId);
    setActionMade(true);
    emit('doctor-heal', { roomId: parseInt(roomId), targetId });
  };

  const handleVote = (targetId) => {
    setSelectedTarget(targetId);
    setActionMade(true);
    emit('day-vote', { roomId: parseInt(roomId), targetId });
  };

  const alivePlayers = players.filter(p => p.isAlive && p.id !== user.id);
  const allAlivePlayers = players.filter(p => p.isAlive);
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const renderRoleInfo = () => {
    if (!role || phase === 'waiting' || phase === 'ended') return null;

    const roleNames = { mafia: 'Мафия', commissioner: 'Шериф', doctor: 'Врач', civilian: 'Мирный' };
    const roleColors = { mafia: 'var(--danger)', commissioner: 'var(--warning)', doctor: 'var(--success)', civilian: 'var(--text-primary)' };
    const roleIcons = { mafia: '🗡️', commissioner: '🔍', doctor: '💊', civilian: '👤' };

    return (
      <div className="card mt-2 animate-slideUp">
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="role-icon">{roleIcons[role]}</span>
          Ваша роль: <strong style={{ color: roleColors[role] }}>{roleNames[role]}</strong>
        </p>
        {role === 'mafia' && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Убивайте мирных ночью. Мафия побеждает когда её столько же сколько мирных.</p>}
        {role === 'commissioner' && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Проверяйте игроков ночью. Узнаёте мафию или нет.</p>}
        {role === 'doctor' && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Лечите игроков ночью. Защитите от убийства.</p>}
        {role === 'civilian' && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Голосуйте днём за исключение мафии.</p>}
      </div>
    );
  };

  const renderNightActions = () => {
    if (!role || !isAlive || actionMade) return null;

    if (role === 'mafia') {
      return (
        <div className="card mt-2">
          <h3 className="mb-1">Выберите цель:</h3>
          <div className="grid">
            {alivePlayers.map(p => (
              <button key={p.id} className="btn btn-danger" onClick={() => handleMafiaKill(p.id)}>
                {p.nickname}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (role === 'commissioner') {
      return (
        <div className="card mt-2">
          <h3 className="mb-1">Кого проверить?</h3>
          <div className="grid">
            {alivePlayers.map(p => (
              <button key={p.id} className="btn btn-secondary" onClick={() => handlecommissionerCheck(p.id)}>
                {p.nickname}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (role === 'doctor') {
      return (
        <div className="card mt-2">
          <h3 className="mb-1">Кого лечить?</h3>
          <div className="grid">
            {allAlivePlayers.map(p => (
              <button key={p.id} className="btn btn-secondary" onClick={() => handleDoctorHeal(p.id)}>
                {p.nickname}{p.id === user.id ? ' (Вы)' : ''}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDayActions = () => {
    if (!isAlive || actionMade) return null;

    return (
      <div className="card mt-2">
        <h3 className="mb-1">Голосование за исключение:</h3>
        <div className="grid">
          {alivePlayers.map(p => (
            <button key={p.id} className="btn btn-secondary" onClick={() => handleVote(p.id)}>
              {p.nickname}
            </button>
          ))}
          <button className="btn btn-secondary" onClick={() => handleVote(null)}>
            Не голосовать
          </button>
        </div>
      </div>
    );
  };

  const renderNightResult = () => {
    if (!nightResult) return null;
    return (
      <div className="card mt-2" style={{ background: 'rgba(231, 76, 60, 0.15)' }}>
        <h3>Результаты ночи:</h3>
        {nightResult.killedId ? (
          <p style={{ color: 'var(--danger)' }}>💀 {nightResult.killedNickname} был убит</p>
        ) : nightResult.wasHealed ? (
          <p style={{ color: 'var(--success)' }}>Мафия действовала, но врач спас игрока!</p>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Эта ночь прошла спокойно</p>
        )}
      </div>
    );
  };

  const renderVoteResult = () => {
    if (!voteResult) return null;
    return (
      <div className="card mt-2" style={{ background: 'rgba(243, 156, 18, 0.15)' }}>
        <h3>Результаты голосования:</h3>
        {voteResult.tie ? (
          <p style={{ color: 'var(--warning)' }}>Ничья! Никто не исключён</p>
        ) : voteResult.eliminatedId ? (
          <p style={{ color: 'var(--danger)' }}>🗳️ {voteResult.eliminatedNickname} исключён из игры</p>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Никто не был исключён</p>
        )}
        {voteResult.players && (
          <div className="mt-1" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Голоса: {Object.entries(voteResult.voteCounts).map(([id, count]) => {
              const p = players.find(pl => pl.id === parseInt(id));
              return `${p?.nickname || id}: ${count}`;
            }).join(', ')}
          </div>
        )}
      </div>
    );
  };

  const renderGameResult = () => {
    if (!gameResult) return null;
    const isWin = (gameResult.winner === 'town' && role !== 'mafia') || (gameResult.winner === 'mafia' && role === 'mafia');

    const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

    return (
      <div className="card mt-2 animate-slideUp" style={{
        background: gameResult.winner === 'town' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)'
      }}>
        {isWin && (
          <div className="confetti">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  background: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}
        <h2 className="text-center mb-2" style={{ fontSize: '2rem' }}>
          {isWin ? '🎉 Победа!' : '😢 Поражение'}
        </h2>
        <h3 className="text-center mb-2">
          {gameResult.winner === 'town' ? 'Мирные победили!' : 'Мафия победила!'}
        </h3>
        <div className="grid">
          {gameResult.players.map(p => (
            <div key={p.id} className="card" style={{
              padding: '0.75rem',
              background: p.isAlive ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'
            }}>
              <div className="flex-between">
                <span>{p.nickname} {p.id === user.id && '(Вы)'}</span>
                <span style={{
                  color: p.role === 'mafia' ? 'var(--danger)' :
                         p.role === 'commissioner' ? 'var(--warning)' :
                         p.role === 'doctor' ? 'var(--success)' : 'var(--text-primary)'
                }}>
                  {{ mafia: '🗡️ Мафия', commissioner: '🔍 Шериф', doctor: '💊 Врач', civilian: '👤 Мирный' }[p.role]}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary mt-2" style={{ width: '100%' }} onClick={handleLeaveRoom}>
          Вернуться в лобби
        </button>
      </div>
    );
  };

  const renderLastCheck = () => {
    if (!lastCheck || role !== 'commissioner') return null;
    const target = players.find(p => p.id === lastCheck.targetId);
    return (
      <div className="card mt-2" style={{
        background: lastCheck.isMafia ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)'
      }}>
        <p>🔍 Результат проверки: <strong>{target?.nickname}</strong> — {lastCheck.isMafia ? 'МАФИЯ' : 'не мафия'}</p>
      </div>
    );
  };

  if (!connected) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="card text-center" style={{ animation: 'pulse 2s infinite' }}>
          <h2>Подключение к серверу...</h2>
          {error && <p className="error mt-1">{error}</p>}
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
            Если долго не подключается, попробуйте обновить страницу
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-2">
        <div className="phase-transition">
          <h1>Комната #{roomId}</h1>
          {phase !== 'waiting' && phase !== 'ended' && (
            <p style={{ color: 'var(--text-muted)' }}>
              {phase === 'night' ? '🌙 Ночь' : '☀️ День'} — День {dayNumber}
              {timeLeft > 0 && (
                <span className={timeLeft <= 10 ? 'timer-danger' : timeLeft <= 30 ? 'timer-warning' : ''}>
                  {' — '}{formatTime(timeLeft)}
                </span>
              )}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleLeaveRoom}>Покинуть</button>
      </div>

      {error && <div className="error mb-2">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <div>
          <div className="card mb-2">
            <h2 className="mb-1">Игроки ({allAlivePlayers.length})</h2>
            <div className="grid">
              {players.map(p => (
                <div key={p.id} className="card player-card" style={{
                  padding: '0.75rem',
                  background: p.id === user.id ? 'rgba(107, 63, 160, 0.3)' :
                              !p.isAlive ? 'rgba(231, 76, 60, 0.2)' : 'rgba(13, 6, 24, 0.5)',
                  opacity: p.isAlive ? 1 : 0.6
                }}>
                  <div className="flex-between">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.avatar ? (
                        p.avatar.startsWith('/') ? (
                          <img src={config.serverUrl + p.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.2rem' }}>{p.avatar}</span>
                        )
                      ) : null}
                      {p.nickname}{p.id === user.id ? ' (Вы)' : ''}
                    </span>
                    {!p.isAlive && <span>💀</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {phase === 'waiting' && isHost && players.length >= 2 && user.isAdmin && (
            <button className="btn btn-primary animate-glow" onClick={handleStartGame} style={{ width: '100%' }}>
              👑 Начать игру ({players.length} игроков) — Админ-режим
            </button>
          )}

          {phase === 'waiting' && isHost && !user.isAdmin && players.length >= 5 && (
            <button className="btn btn-primary" onClick={handleStartGame} style={{ width: '100%' }}>
              Начать игру ({players.length} игроков)
            </button>
          )}

          {phase === 'waiting' && isHost && !user.isAdmin && players.length < 5 && (
            <p className="text-center" style={{ color: 'var(--text-muted)' }}>
              Нужно минимум 5 игроков (сейчас {players.length})
            </p>
          )}

          {phase === 'waiting' && isHost && user.isAdmin && players.length < 2 && (
            <p className="text-center" style={{ color: 'var(--text-muted)' }}>
              Минимум 2 игрока (сейчас {players.length})
            </p>
          )}

          {phase === 'night' && renderNightActions()}
          {phase === 'day' && renderDayActions()}
          {nightResult && renderNightResult()}
          {renderLastCheck()}
          {voteResult && renderVoteResult()}
          {phase === 'ended' && renderGameResult()}
          {renderRoleInfo()}

          {phase === 'night' && actionMade && !nightResult && (
            <div className="card mt-2 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Ожидание других игроков...</p>
            </div>
          )}

          {phase === 'day' && actionMade && !voteResult && (
            <div className="card mt-2 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Голос записан. Ожидание...</p>
            </div>
          )}
        </div>

        <div style={{ height: '100%' }}>
          <GameChat socket={socket} roomId={roomId} />
        </div>
      </div>
    </div>
  );
}

export default Game;
