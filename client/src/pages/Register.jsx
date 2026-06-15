import { useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';

function Register({ onLogin }) {
  const [nickname, setNickname] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateNickname = (nick) => {
    return /^[a-zA-Zа-яА-ЯёЁ0-9_-]{1,20}$/.test(nick);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateNickname(nickname)) {
      setError('Никнейм: 1-20 символов, буквы, цифры, _ или -');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${config.serverUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, login, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '60vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-center mb-2">Регистрация</h2>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Никнейм</label>
            <input
              type="text"
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="От 1 до 20 символов"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              type="text"
              className="input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Подтвердите пароль</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <p className="text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
          Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--accent-secondary)' }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
