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
  const [mafiaCount, setMafiaCount] = useState(1);
  const [commissionerCount, setCommissionerCount] = useState(1);
  const [doctorCount, setDoctorCount] = useState(1);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io(config.serverUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
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

    const totalSpecial = mafiaCount + commissionerCount + doctorCount;
    if (totalSpecial > maxPlayers) {
      setError('Сумма специальных ролей не может превышать максимум игроков');
      return;
    }

    socket.emit('create-room', {
      name: roomName,
      maxPlayers,
      mafiaCount,
      commissionerCount,
      doctorCount
    }, (response) => {
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
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
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

            <h3 className="mb-1" style={{ color: 'var(--accent-secondary)' }}>Настройки ролей</h3>

            <div className="form-group">
              <label className="form-label">Мафия: {mafiaCount}</label>
              <input
                type="range"
                min="1"
                max={Math.floor(maxPlayers / 3)}
                value={mafiaCount}
                onChange={(e) => setMafiaCount(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Комиссар: {commissionerCount}</label>
              <input
                type="range"
                min="0"
                max="3"
                value={commissionerCount}
                onChange={(e) => setCommissionerCount(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Врач: {doctorCount}</label>
              <input
                type="range"
                min="0"
                max="3"
                value={doctorCount}
                onChange={(e) => setDoctorCount(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Остальные игроки будут мирными. Мафия: {mafiaCount}, Комиссар: {commissionerCount}, Врач: {doctorCount}, Мирные: {maxPlayers - mafiaCount - commissionerCount - doctorCount}
            </p>

            <div className="flex gap-1 mt-2">
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
