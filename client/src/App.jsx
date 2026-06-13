import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

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
            {user ? (
              <>
                <span className="nav-link">Привет, {user.nickname}</span>
                <button className="btn btn-secondary" onClick={handleLogout}>
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
            <Route path="/" element={<Home user={user} />} />
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Home({ user }) {
  return (
    <div className="text-center">
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Мафия Онлайн
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Классическая игра в мафию онлайн с друзьями
      </p>
      {!user && (
        <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Начать игру
        </Link>
      )}
      {user && (
        <Link to="/lobby" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Войти в лобби
        </Link>
      )}
    </div>
  );
}

export default App;
