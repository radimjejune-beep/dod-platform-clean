// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// МИНИМАЛЬНАЯ СТРАНИЦА
function MinimalDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    fetch('https://dod-backend.relaxdev.ru/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        console.log('✅ ПОЛЬЗОВАТЕЛЬ ЗАГРУЖЕН:', data);
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ ОШИБКА:', err);
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>
          <h2>⏳ Загрузка...</h2>
          <p style={{ color: '#667085' }}>Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>✅ СТРАНИЦА РАБОТАЕТ!</h1>
      <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px' }}>
        <p><strong>👤 Пользователь:</strong> {user?.full_name}</p>
        <p><strong>📧 Email:</strong> {user?.email}</p>
        <p><strong>🎭 Роль:</strong> {user?.role}</p>
        <p><strong>🏫 Клуб:</strong> {user?.club_id || 'Не указан'}</p>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          style={{ padding: '10px 20px', background: '#B3262E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          🚪 Выйти
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#174A7E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          🔄 Обновить
        </button>
      </div>
    </div>
  );
}

// МИНИМАЛЬНЫЙ ЛОГИН
function MinimalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>🔐 Вход</h1>
      <p style={{ textAlign: 'center', color: '#667085', marginBottom: '24px' }}>Войдите в систему</p>

      {error && (
        <div style={{ padding: '12px', background: '#FCEBEC', color: '#B3262E', borderRadius: '8px', marginBottom: '16px' }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Введите email"
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #E2E7EF', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #E2E7EF', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #C9A227, #B8921F)', color: '#0B1F3A', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
        >
          {loading ? '⏳ Вход...' : '🔑 Войти'}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Просто проверяем токен
    const token = localStorage.getItem('token');
    setLoading(false);
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>⏳</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<MinimalLogin />} />
        <Route path="/dashboard" element={<MinimalDashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;