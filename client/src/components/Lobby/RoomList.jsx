function RoomList({ rooms, onJoin }) {
  if (rooms.length === 0) {
    return (
      <div className="card">
        <p className="text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
          Нет доступных комнат. Создайте первую!
        </p>
      </div>
    );
  }

  return (
    <div className="grid">
      {rooms.map((room) => (
        <div 
          key={room.id}
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem'
          }}
        >
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>{room.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {room.players} / {room.maxPlayers} игроков
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => onJoin(room.id)}
          >
            Войти
          </button>
        </div>
      ))}
    </div>
  );
}

export default RoomList;
