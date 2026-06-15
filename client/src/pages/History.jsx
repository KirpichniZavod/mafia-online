import { useState, useEffect } from 'react';
import config from '../config';

function History({ token }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${config.serverUrl}/api/profile/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setGames(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}с`;
    return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><p>Загрузка...</p></div>;

  return (
    <div>
      <h1 className="mb-2">История игр</h1>
      {games.length === 0 ? (
        <div className="card text-center">
          <p style={{ color: 'var(--text-muted)' }}>Пока нет игр. Сыграйте первую!</p>
        </div>
      ) : (
        <div className="grid">
          {games.map(g => {
            let players = [];
            try { players = JSON.parse(g.players); } catch (e) {}
            return (
              <div key={g.id} className="card" style={{ padding: '1rem' }}>
                <div className="flex-between">
                  <strong style={{ color: g.winner === 'town' ? 'var(--success)' : 'var(--danger)' }}>
                    {g.winner === 'town' ? 'Мирные победили' : 'Мафия победила'}
                  </strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(g.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Игроки: {players.map(p => `${p.nickname} (${p.role})`).join(', ')}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Длительность: {formatDuration(g.duration)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default History;
