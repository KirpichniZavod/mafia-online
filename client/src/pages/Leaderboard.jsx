import { useState, useEffect } from 'react';
import config from '../config';

const PRESET_AVATARS = ['🎭', '🦊', '🐺', '💀', '🃏', '🎪', '🌙', '⚡', '🗡️', '🔫', '👑', '🏆', '🎯', '🎲', '🔮', '💎', '🔥', '❄️', '🌊', '🌸', '🐱', '🐶', '🦁', '🐻', '🐸', '🐧', '🦋', '🐉', '👻', '🤖'];

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${config.serverUrl}/api/profile/leaderboard`)
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><p>Загрузка...</p></div>;

  return (
    <div>
      <h1 className="mb-2">🏆 Таблица лидеров</h1>
      {players.length === 0 ? (
        <div className="card text-center">
          <p style={{ color: 'var(--text-muted)' }}>Пока нет данных. Сыграйте минимум 5 игр!</p>
        </div>
      ) : (
        <div className="card">
          <div className="grid">
            {players.map((p, i) => (
              <div key={p.id} className="card" style={{
                padding: '1rem',
                background: i === 0 ? 'rgba(255, 215, 0, 0.15)' :
                           i === 1 ? 'rgba(192, 192, 192, 0.15)' :
                           i === 2 ? 'rgba(205, 127, 50, 0.15)' : 'rgba(13, 6, 24, 0.5)',
                border: i < 3 ? `2px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'}` : 'none'
              }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem', minWidth: '30px', textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.5rem', border: '2px solid var(--border-color)'
                    }}>
                      {p.avatar && (PRESET_AVATARS.includes(p.avatar) ? p.avatar : '👤')}
                    </div>
                    <div>
                      <strong>{p.nickname}</strong>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Игр: {p.gamesPlayed} | Винрейт: {p.winRate}%
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', color: 'var(--accent-glow)' }}>{p.rating}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>рейтинг</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
