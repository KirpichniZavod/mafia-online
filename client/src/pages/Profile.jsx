import { useState, useEffect } from 'react';
import config from '../config';

function Profile({ user, token, onThemeChange }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${config.serverUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleThemeChange = async (theme) => {
    await fetch(`${config.serverUrl}/api/profile/theme`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ theme })
    });
    document.documentElement.setAttribute('data-theme', theme);
    if (onThemeChange) onThemeChange(theme);
  };

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '60vh' }}><p>Загрузка...</p></div>;
  }

  if (!profile) {
    return <div className="flex-center" style={{ minHeight: '60vh' }}><p>Ошибка загрузки профиля</p></div>;
  }

  const winRate = profile.gamesPlayed > 0
    ? Math.round((profile.wins / profile.gamesPlayed) * 100)
    : 0;

  return (
    <div>
      <h1 className="mb-2">Профиль</h1>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h2 className="mb-2">{profile.nickname}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Логин: {profile.login}</p>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Зарегистрирован: {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
          </p>
          {profile.isAdmin && (
            <span style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              background: 'var(--accent-primary)',
              borderRadius: '12px',
              fontSize: '0.85rem'
            }}>
              Администратор
            </span>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2">Статистика</h2>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="text-center">
              <div style={{ fontSize: '2rem', color: 'var(--success)' }}>{profile.wins}</div>
              <div style={{ color: 'var(--text-muted)' }}>Победы</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: '2rem', color: 'var(--danger)' }}>{profile.losses}</div>
              <div style={{ color: 'var(--text-muted)' }}>Поражения</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: '2rem', color: 'var(--accent-glow)' }}>{winRate}%</div>
              <div style={{ color: 'var(--text-muted)' }}>Винрейт</div>
            </div>
          </div>
          <p className="text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
            Всего игр: {profile.gamesPlayed}
          </p>
        </div>
      </div>

      <div className="card mt-2">
        <h2 className="mb-2">Тема оформления</h2>
        <div className="theme-switcher" style={{ gap: '1rem' }}>
          <button
            className={`btn ${profile.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('dark')}
          >
            Тёмная
          </button>
          <button
            className={`btn ${profile.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('light')}
          >
            Светлая
          </button>
          <button
            className={`btn ${profile.theme === 'lemon' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('lemon')}
          >
            Лимонная
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
