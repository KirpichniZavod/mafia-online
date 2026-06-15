import { useState, useEffect } from 'react';
import config from '../config';

function Admin({ user, token }) {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState('users');
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const loadUsers = async () => {
    const res = await fetch(`${config.serverUrl}/api/admin/users`, { headers });
    const data = await res.json();
    setUsers(data);
  };

  const loadRooms = async () => {
    const res = await fetch(`${config.serverUrl}/api/admin/rooms`, { headers });
    const data = await res.json();
    setRooms(data);
  };

  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers();
      loadRooms();
    }
  }, [user]);

  const handleBan = async () => {
    if (!banModal) return;
    const res = await fetch(`${config.serverUrl}/api/admin/ban/${banModal.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: banReason || null, duration: banDuration })
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setSuccess(`${banModal.nickname} забанен`);
      setBanModal(null);
      setBanReason('');
      setBanDuration('permanent');
      loadUsers();
    }
  };

  const handleUnban = async (userId) => {
    const res = await fetch(`${config.serverUrl}/api/admin/unban/${userId}`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setSuccess(`${data.user.nickname} разбанен`);
      loadUsers();
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Удалить комнату?')) return;
    const res = await fetch(`${config.serverUrl}/api/admin/room/${roomId}`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setSuccess('Комната удалена');
      loadRooms();
    }
  };

  const formatBanTime = (until) => {
    if (!until) return 'Навсегда';
    const d = new Date(until);
    const now = new Date();
    if (d < now) return 'Истёк';
    const diff = Math.ceil((d - now) / 1000);
    if (diff < 60) return `${diff}с`;
    if (diff < 3600) return `${Math.floor(diff / 60)}м`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
    return `${Math.floor(diff / 86400)}д`;
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="card text-center">
          <h2>Доступ запрещён</h2>
          <p style={{ color: 'var(--text-muted)' }}>Только для администраторов</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2">Админ-панель</h1>

      {error && <div className="error mb-2">{error}</div>}
      {success && <div className="success mb-2">{success}</div>}

      <div className="flex gap-1 mb-2">
        <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>
          Игроки ({users.length})
        </button>
        <button className={`btn ${tab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('rooms')}>
          Комнаты ({rooms.length})
        </button>
      </div>

      {tab === 'users' && (
        <div className="card">
          <h2 className="mb-2">Игроки</h2>
          <div className="grid">
            {users.map(u => (
              <div key={u.id} className="card" style={{
                padding: '1rem',
                background: u.isBanned ? 'rgba(231, 76, 60, 0.15)' : 'rgba(13, 6, 24, 0.5)'
              }}>
                <div className="flex-between">
                  <div>
                    <strong>{u.nickname}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({u.login})</span>
                    {u.isAdmin && <span style={{ color: 'var(--accent-glow)', marginLeft: '0.5rem' }}>👑</span>}
                    {u.isBanned && (
                      <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                        🔒 {u.banReason && `(${u.banReason})`} {u.banUntil && formatBanTime(u.banUntil)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!u.isAdmin && !u.isBanned && (
                      <button className="btn btn-danger btn-small" onClick={() => { setBanModal(u); setError(''); setSuccess(''); }}>
                        Забанить
                      </button>
                    )}
                    {u.isBanned && (
                      <button className="btn btn-secondary btn-small" onClick={() => handleUnban(u.id)}>
                        Разбанить
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Игр: {u.gamesPlayed} | Побед: {u.wins} | Поражений: {u.losses}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="card">
          <h2 className="mb-2">Комнаты</h2>
          {rooms.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Нет активных комнат</p>
          ) : (
            <div className="grid">
              {rooms.map(r => (
                <div key={r.id} className="card" style={{ padding: '1rem' }}>
                  <div className="flex-between">
                    <div>
                      <strong>#{r.id} {r.name}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        {r.players.length}/{r.maxPlayers} | {r.status}
                      </span>
                    </div>
                    <button className="btn btn-danger btn-small" onClick={() => handleDeleteRoom(r.id)}>
                      Удалить
                    </button>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Игроки: {r.players.map(p => p.user.nickname).join(', ') || 'нет'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {banModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 className="mb-2">Бан: {banModal.nickname}</h2>

            <div className="form-group">
              <label className="form-label">Причина</label>
              <input
                type="text" className="input" value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Опционально"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Срок</label>
              <select className="input" value={banDuration} onChange={(e) => setBanDuration(e.target.value)}>
                <option value="10">10 секунд</option>
                <option value="60">1 минута</option>
                <option value="300">5 минут</option>
                <option value="3600">1 час</option>
                <option value="86400">1 день</option>
                <option value="604800">7 дней</option>
                <option value="permanent">Навсегда</option>
              </select>
            </div>

            <div className="flex gap-1">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setBanModal(null); setBanReason(''); }}>
                Отмена
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleBan}>
                Забанить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
