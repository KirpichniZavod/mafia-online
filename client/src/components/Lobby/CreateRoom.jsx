import { useState } from 'react';

function CreateRoom({ socket, onClose }) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Введите название комнаты');
      return;
    }

    socket.emit('create-room', { name, maxPlayers }, (response) => {
      if (response.error) {
        setError(response.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="card">
      <h2 className="mb-2">Новая комната</h2>
      
      {error && <div className="error mb-1">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Название</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите название комнаты"
            maxLength={30}
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
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            Создать
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateRoom;
