// frontend/src/pages/Login.jsx

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://dod-backend.relaxdev.ru/api';

export default function Login() {
  const [email, setEmail] = useState('newadmin@dod.ru');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ===== ПРОВЕРКА СЕССИИ ПРИ ЗАГРУЗКЕ =====
  useEffect(() => {
    const token = localStorage.getItem('token');
    const sessionId = sessionStorage.getItem('sessionId');
    
    // Если есть токен, но нет сессии — выходим
    if (token && !sessionId) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('🔒 Сессия истекла, требуется повторный вход');
    }
    
    // Если есть и токен и сессия — перенаправляем
    if (token && sessionId) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user && user.role) {
        redirectByRole(user.role);
      }
    }
  }, []);

  const redirectByRole = (role) => {
    const routes = {
      'participant': '/participant-dashboard',
      'parent': '/parent-dashboard',
      'club_coordinator': '/club-coordinator-dashboard',
      'tutor': '/tutor-dashboard',
      'admin': '/dashboard',
      'movement_coordinator': '/dashboard',
      'president': '/dashboard',
      'vice_president': '/dashboard'
    };
    navigate(routes[role] || '/dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Вход:', { email, password });
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка входа');
      }

      const data = await response.json();
      console.log('✅ Успешный вход:', data);

      // ===== СОХРАНЯЕМ ТОКЕН В LOCAL STORAGE =====
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // ===== СОЗДАЁМ СЕССИЮ В SESSION STORAGE =====
      const sessionId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
      sessionStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('userId', data.user.id);
      sessionStorage.setItem('userRole', data.user.role);
      sessionStorage.setItem('loginTime', new Date().toISOString());

      console.log('✅ Сессия создана:', sessionId);

      // ===== ПЕРЕНАПРАВЛЕНИЕ =====
      const userRole = data.user.role;
      redirectByRole(userRole);

    } catch (err) {
      console.error('❌ Ошибка входа:', err);
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '32px',
        animation: 'fadeIn 0.5s ease',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            fontSize: '24px',
            boxShadow: '0 4px 16px rgba(11, 31, 58, 0.3)'
          }}>
            🌍
          </div>
          <h1 style={{ fontSize: '20px', color: '#172033', marginBottom: '2px' }}>
            Детское общественное движение
          </h1>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
            «Дипломаты будущего»
          </h2>
          <p style={{
            fontSize: '10px',
            color: '#C9A227',
            fontWeight: '600',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Ассоциация российских дипломатов
          </p>
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#667085'
          }}>
            Вход в систему
          </div>
          <div style={{
            marginTop: '4px',
            fontSize: '11px',
            color: '#98A2B3'
          }}>
            🔒 Сессия действует только пока открыта вкладка
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#FCEBEC',
            color: '#B3262E',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email или логин</label>
            <input
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@mail.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите пароль"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              marginTop: '8px'
            }}
          >
            {loading ? '⏳ Вход...' : '🔑 Войти'}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#667085'
        }}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{
            color: '#0B1F3A',
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: '2px solid #C9A227',
            paddingBottom: '2px'
          }}>
            Зарегистрироваться
          </Link>
        </p>

        <div style={{
          marginTop: '20px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #C9A227, transparent)',
          borderRadius: '2px'
        }} />

        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#98A2B3'
        }}>
          🔒 Для безопасности сессия завершается при закрытии вкладки
        </div>
      </div>
    </div>
  );
}