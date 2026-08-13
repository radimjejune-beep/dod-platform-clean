// frontend/src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = 'https://dod-backend.relaxdev.ru/api';

export default function Login() {
  const [email, setEmail] = useState('admin@dod.ru');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      console.log('✅ Успешный вход:', data);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Ошибка входа:', err);
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F4F6F9 0%, #E8EDF3 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(11, 31, 58, 0.15)'
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
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Email или логин
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@mail.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите пароль"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#6c757d' : '#0B1F3A',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
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
      </div>
    </div>
  );
}