function Banned({ reason, until }) {
  const formatTime = (until) => {
    if (!until) return 'Навсегда';
    const d = new Date(until);
    const now = new Date();
    if (d < now) return 'Истёк';
    const diff = Math.ceil((d - now) / 1000);
    if (diff < 60) return `${diff} секунд`;
    if (diff < 3600) return `${Math.floor(diff / 60)} минут`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} часов`;
    return `${Math.floor(diff / 86400)} дней`;
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '500px',
        textAlign: 'center',
        background: 'rgba(231, 76, 60, 0.15)',
        border: '2px solid var(--danger)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Вы забанены</h1>

        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          {reason && (
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              <strong>Причина:</strong> {reason}
            </p>
          )}
          <p style={{ fontSize: '1.1rem', color: 'var(--warning)' }}>
            <strong>Срок:</strong> {formatTime(until)}
          </p>
          {until && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              До: {new Date(until).toLocaleString('ru-RU')}
            </p>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Если вы считаете, что это ошибка, обратитесь к администратору.
        </p>
      </div>
    </div>
  );
}

export default Banned;
