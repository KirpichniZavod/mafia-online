import { useState, useEffect, useRef } from 'react';
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
  const socketRef = useRef(null);

  useEffect(() => {
    const newSocket = io(config.serverUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join-socket-room', { roomId: parseInt(roomId) });
      newSocket.emit('get-role', { roomId: parseInt(roomId) }, (response) => {
        if (response && response.role) {
          setRole(response.role);
          setIsAlive(response.isAlive);
        }
      });

      newSocket.emit('get-players', { roomId: parseInt(roomId) }, (response) => {
        if (response && response.players) {
          setPlayers(response.players);
          const me = response.players.find(p => p.id === user.id);
          if (me) {
            setIsHost(me.isHost);
          }
        }
      });
    });

    newSocket.on('connect_error', (err) => {
      setError('Ошибка подключения к серверу: ' + err.message);
      setConnected(false);
    });

    newSocket.on('room-updated', (data) => {
      setPlayers(data.players);
      const me = data.players.find(p => p.id === user.id);
      if (me) {
        setIsHost(me.isHost);
      }
    });

    newSocket.on('game-started', () => {
      setPhase('night');
      newSocket.emit('get-role', { roomId: parseInt(roomId) }, (response) => {
        if (response && response.role) {
          setRole(response.role);
          setIsAlive(response.isAlive);
        }
      });
      newSocket.emit('get-players', { roomId: parseInt(roomId) }, (response) => {
        if (response && response.players) {
          setPlayers(response.players);
        }
      });
    });

    newSocket.on('phase-change', (data) => {
      setPhase(data.phase);
      setDayNumber(data.dayNumber);
      setSelectedTarget(null);
      newSocket.emit('get-players', { roomId: parseInt(roomId) }, (response) => {
        if (response && response.players) {
          setPlayers(response.players);
        }
      });
    });

    newSocket.on('night-result', (data) => {
      setPlayers(data.players);
    });

    newSocket.on('vote-result', (data) => {
      setPlayers(data.players);
    });

    newSocket.on('check-result', (data) => {
      const target = players.find(p => p.id === data.targetId);
      if (target) {
        alert(`${target.nickname} - ${data.isMafia ? 'МАФИЯ' : 'НЕ мафия'}`);
      }
    });

    newSocket.on('game-ended', (data) => {
      setGameResult(data);
      setPhase('ended');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, roomId, user.id]);

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('start-game', { roomId: parseInt(roomId) }, (response) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave-room', { roomId: parseInt(roomId) }, () => {
        navigate('/lobby');
      });
    } else {
      navigate('/lobby');
    }
  };

  const handleMafiaKill = (targetId) => {
    if (!socket) return;
    socket.emit('mafia-kill', { roomId: parseInt(roomId), targetId }, (response) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleCommissionerCheck = (targetId) => {
    if (!socket) return;
    socket.emit('commissioner-check', { roomId: parseInt(roomId), targetId }, (response) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleDoctorHeal = (targetId) => {
    if (!socket) return;
    socket.emit('doctor-heal', { roomId: parseInt(roomId), targetId }, (response) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleVote = (targetId) => {
    if (!socket) return;
    socket.emit('day-vote', { roomId: parseInt(roomId), targetId }, (response) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const getAlivePlayers = () => {
    return players.filter(p => p.isAlive && p.id !== user.id);
  };

  const renderNightActions = () => {
    if (!role || !isAlive) return null;

    const alivePlayers = getAlivePlayers();

    if (role === 'mafia') {
      return (
        <div className="card mt-2">
          <h3 className="mb-1">Выберите цель для убийства:</h3>
          <div className="grid">
            {alivePlayers.map(player => (
              <button
                key={player.id}
                className={`btn ${selectedTarget === player.id ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => {
                  setSelectedTarget(player.id);
                  handleMafiaKill(player.id);
                }}
              >
                {player.nickname}
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
            {alivePlayers.map(player => (
              <button
                key={player.id}
                className={`btn ${selectedTarget === player.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setSelectedTarget(player.id);
                  handleCommissionerCheck(player.id);
                }}
              >
                {player.nickname}
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
            {players.filter(p => p.isAlive).map(player => (
              <button
                key={player.id}
                className={`btn ${selectedTarget === player.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setSelectedTarget(player.id);
                  handleDoctorHeal(player.id);
                }}
              >
                {player.nickname}
                {player.id === user.id && ' (Вы)'}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDayActions = () => {
    if (!isAlive) return null;

    const alivePlayers = getAlivePlayers();

    return (
      <div className="card mt-2">
        <h3 className="mb-1">Голосование за исключение:</h3>
        <div className="grid">
          {alivePlayers.map(player => (
            <button
              key={player.id}
              className={`btn ${selectedTarget === player.id ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => {
                setSelectedTarget(player.id);
                handleVote(player.id);
              }}
            >
              {player.nickname}
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSelectedTarget(null);
              handleVote(null);
            }}
          >
            Не голосовать
          </button>
        </div>
      </div>
    );
  };

  const renderGameResult = () => {
    if (!gameResult) return null;

    return (
      <div className="card mt-2" style={{
        background: gameResult.winner === 'town'
          ? 'rgba(46, 204, 113, 0.2)'
          : 'rgba(231, 76, 60, 0.2)'
      }}>
        <h2 className="text-center mb-2">
          {gameResult.winner === 'town' ? 'Мирные победили!' : 'Мафия победила!'}
        </h2>
        <div className="grid">
          {gameResult.players.map(player => (
            <div
              key={player.id}
              className="card"
              style={{
                padding: '0.75rem',
                background: player.isAlive ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'
              }}
            >
              <div className="flex-between">
                <span>{player.nickname}</span>
                <span style={{
                  color: player.role === 'mafia' ? 'var(--danger)' :
                         player.role === 'commissioner' ? 'var(--warning)' :
                         player.role === 'doctor' ? 'var(--success)' : 'var(--text-primary)'
                }}>
                  {player.role === 'mafia' ? 'Мафия' :
                   player.role === 'commissioner' ? 'Комиссар' :
                   player.role === 'doctor' ? 'Врач' : 'Мирный'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!connected) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="card text-center">
          <h2>Подключение к серверу...</h2>
          {error && <p className="error mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-2">
        <h1>Комната #{roomId}</h1>
        <button className="btn btn-secondary" onClick={handleLeaveRoom}>
          Покинуть комнату
        </button>
      </div>

      {error && <div className="error mb-2">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <div>
          <div className="card mb-2">
            <h2 className="mb-2">Игроки ({players.filter(p => p.isAlive !== false).length})</h2>
            <div className="grid">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="card"
                  style={{
                    padding: '0.75rem',
                    background: player.id === user.id
                      ? 'rgba(107, 63, 160, 0.3)'
                      : !player.isAlive
                        ? 'rgba(231, 76, 60, 0.2)'
                        : 'rgba(13, 6, 24, 0.5)',
                    opacity: player.isAlive ? 1 : 0.6
                  }}
                >
                  <div className="flex-between">
                    <span>{player.nickname}</span>
                    {!player.isAlive && <span style={{ color: 'var(--danger)' }}>💀</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {phase === 'waiting' && isHost && players.length >= 5 && (
            <button
              className="btn btn-primary"
              onClick={handleStartGame}
              style={{ width: '100%' }}
            >
              Начать игру
            </button>
          )}

          {phase === 'waiting' && isHost && players.length < 5 && (
            <p className="text-center" style={{ color: 'var(--text-muted)' }}>
              Нужно минимум 5 игроков для начала
            </p>
          )}

          {phase === 'night' && isAlive && renderNightActions()}

          {phase === 'day' && isAlive && renderDayActions()}

          {phase === 'night' && (
            <div className="card mt-2">
              <h2 className="mb-2">🌙 Ночь - День {dayNumber}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Мафия действует... Ожидайте утра.
              </p>
            </div>
          )}

          {phase === 'day' && (
            <div className="card mt-2">
              <h2 className="mb-2">☀️ День - День {dayNumber}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Обсуждайте и голосуйте за исключение подозреваемых.
              </p>
            </div>
          )}

          {phase === 'ended' && renderGameResult()}
        </div>

        <div style={{ height: '100%' }}>
          <GameChat socket={socket} roomId={roomId} />
        </div>
      </div>

      {role && phase !== 'waiting' && (
        <div className="card mt-2">
          <p>
            Ваша роль: <strong style={{
              color: role === 'mafia' ? 'var(--danger)' :
                     role === 'commissioner' ? 'var(--warning)' :
                     role === 'doctor' ? 'var(--success)' : 'var(--text-primary)'
            }}>
              {role === 'mafia' ? 'Мафия' :
               role === 'commissioner' ? 'Комиссар' :
               role === 'doctor' ? 'Врач' : 'Мирный'}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default Game;
