import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import config from '../config';

function Lobby({ user, token }) {
  const [rooms, setRooms] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io(config.serverUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      loadRooms(newSocket);
    });

    newSocket.on('room-created', () => {
      loadRooms(newSocket);
    });

    newSocket.on('room-deleted', () => {
      loadRooms(newSocket);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token]);

  const loadRooms = (sock) => {
    sock.emit('get-rooms', (response) => {
      if (response.rooms) {
        setRooms(response.rooms);
      }
    });
  };

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError('Введите название комнаты');
      return;
    }

    socket.emit('create-room', { name: roomName, maxPlayers }, (response) => {
      if (response.error) {
        setError(response.error);
      } else if (response.success) {
        navigate(`/game/${response.roomId}`);
      }
    });
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('join-room', { roomId }, (response) => {
      if (response.error) {
        setError(response.error);
      } else if (response.success) {
        navigate(`/game/${roomId}`);
      }
    });
  };

  return (
    <div>
      <div className="flex-between mb-2">
        <h1>Лобби</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Создать комнату
        </button>
      </div>

      {error && <div className="error mb-2">{error}</div>}

      <div className="card">
        <h2 className="mb-2">Доступные комнаты</h2>
        
        {rooms.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Нет доступных комнат. Создайте первую!
          </p>
        ) : (
          <div className="grid">
            {rooms.map((room) => (
              <div 
                key={room.id} 
                className="card"
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem'
                }}
              >
                <div>
                  <h3>{room.name}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {room.players} / {room.maxPlayers} игроков
                  </p>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  Войти
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 className="mb-2">Новая комната</h2>
            
            <div className="form-group">
              <label className="form-label">Название</label>
              <input
                type="text"
                className="input"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Введите название"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Максимум игроков (5-10)</label>
              <input
                type="number"
                className="input"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Math.min(10, Math.max(5, parseInt(e.target.value) || 5)))}
                min="5"
                max="10"
              />
            </div>
            
            <div className="flex gap-1">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setRoomName('');
                  setError('');
                }}
                style={{ flex: 1 }}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateRoom}
                style={{ flex: 1 }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
