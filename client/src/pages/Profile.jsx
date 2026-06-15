import { useState, useEffect } from 'react';
import config from '../config';

const PRESET_AVATARS = [
  '🎭', '🦊', '🐺', '💀', '🃏', '🎪', '🌙', '⚡', '🗡️', '🔫',
  '👑', '🏆', '🎯', '🎲', '🔮', '💎', '🔥', '❄️', '🌊', '🌸',
  '🐱', '🐶', '🦁', '🐻', '🐸', '🐧', '🦋', '🐉', '👻', '🤖'
];

function Profile({ user, token, onThemeChange }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`${config.serverUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleThemeChange = async (theme) => {
    await fetch(`${config.serverUrl}/api/profile/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ theme })
    });
    document.documentElement.setAttribute('data-theme', theme);
    if (onThemeChange) onThemeChange(theme);
  };

  const handlePresetAvatar = async (avatar) => {
    await fetch(`${config.serverUrl}/api/profile/avatar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar })
    });
    setProfile({ ...profile, avatar });
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${config.serverUrl}/api/profile/avatar/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data.avatar) {
      setProfile({ ...profile, avatar: data.avatar });
    }
    setUploading(false);
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><p>Загрузка...</p></div>;
  if (!profile) return <div className="flex-center" style={{ minHeight: '60vh' }}><p>Ошибка загрузки профиля</p></div>;

  const winRate = profile.gamesPlayed > 0 ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0;
  const isCustomAvatar = profile.avatar && !PRESET_AVATARS.includes(profile.avatar);

  return (
    <div>
      <h1 className="mb-2">Профиль</h1>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isCustomAvatar ? '0' : '2.5rem', overflow: 'hidden'
            }}>
              {isCustomAvatar ? (
                <img src={config.serverUrl + profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.avatar || '👤'
              )}
            </div>
            <div>
              <h2>{profile.nickname}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Логин: {profile.login}</p>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Зарегистрирован: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
          </div>
          {profile.isAdmin && (
            <span style={{
              display: 'inline-block', marginTop: '1rem', padding: '0.25rem 0.75rem',
              background: 'var(--accent-primary)', borderRadius: '12px', fontSize: '0.85rem'
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
        <h2 className="mb-2">Аватар</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {PRESET_AVATARS.map(a => (
            <button
              key={a}
              onClick={() => handlePresetAvatar(a)}
              style={{
                width: '48px', height: '48px', fontSize: '1.5rem',
                background: profile.avatar === a ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                border: profile.avatar === a ? '2px solid var(--accent-glow)' : '2px solid var(--border-color)',
                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {a}
            </button>
          ))}
        </div>
        <div>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            {uploading ? 'Загрузка...' : 'Загрузить своё фото'}
            <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={handleUploadAvatar} hidden />
          </label>
          <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
            JPG, PNG, GIF, WEBP — до 2 МБ
          </span>
        </div>
      </div>

      <div className="card mt-2">
        <h2 className="mb-2">Тема оформления</h2>
        <div className="theme-switcher" style={{ gap: '1rem' }}>
          <button className={`btn ${profile.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleThemeChange('dark')}>Тёмная</button>
          <button className={`btn ${profile.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleThemeChange('light')}>Светлая</button>
          <button className={`btn ${profile.theme === 'lemon' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleThemeChange('lemon')}>Лимонная</button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
