import { HashRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Profile from './pages/Profile';
import Privacy from './pages/Privacy';
import Admin from './pages/Admin';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, [token]);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="app">
        <header className="header">
          <Link to="/" className="logo">Мафия Онлайн</Link>
          <nav className="nav-links">
            <div className="theme-switcher">
              <button
                className={`theme-btn theme-dark ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Тёмная тема"
              />
              <button
                className={`theme-btn theme-light ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="Светлая тема"
              />
              <button
                className={`theme-btn theme-lemon ${theme === 'lemon' ? 'active' : ''}`}
                onClick={() => setTheme('lemon')}
                title="Лимонная тема"
              />
            </div>
            {user ? (
              <>
                {user.isAdmin && <Link to="/admin" className="nav-link" style={{ color: 'var(--accent-glow)' }}>👑 Админ</Link>}
                <Link to="/profile" className="nav-link">{user.nickname}</Link>
                <Link to="/lobby" className="nav-link">Лобби</Link>
                <button className="btn btn-secondary btn-small" onClick={handleLogout}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Войти</Link>
                <Link to="/register" className="nav-link">Регистрация</Link>
              </>
            )}
          </nav>
        </header>

        <main className="container">
          <Routes>
            <Route path="/" element={
              user ? <Navigate to="/lobby" /> : <Navigate to="/login" />
            } />
            <Route
              path="/login"
              element={
                user ? <Navigate to="/lobby" /> :
                <Login onLogin={handleLogin} />
              }
            />
            <Route
              path="/register"
              element={
                user ? <Navigate to="/lobby" /> :
                <Register onLogin={handleLogin} />
              }
            />
            <Route
              path="/lobby"
              element={
                user ? <Lobby user={user} token={token} /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/game/:roomId"
              element={
                user ? <Game user={user} token={token} /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/profile"
              element={
                user ? <Profile user={user} token={token} onThemeChange={setTheme} /> :
                <Navigate to="/login" />
              }
            />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="/admin"
              element={
                user?.isAdmin ? <Admin user={user} token={token} /> :
                <Navigate to="/login" />
              }
            />
          </Routes>
        </main>

        <footer className="footer">
          <Link to="/privacy" className="footer-link">Политика конфиденциальности</Link>
          <button className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Правила поведения
          </button>
        </footer>
      </div>
    </Router>
  );
}

export default App;
