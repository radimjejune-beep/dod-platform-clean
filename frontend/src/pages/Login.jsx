// frontend/src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('newadmin@dod.ru');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('📤 Отправка:', { email, password });

      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('📥 Ответ сервера (полный):', JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      // ===== ЖЁСТКОЕ ИСПРАВЛЕНИЕ ТОКЕНА =====
      let rawToken = data.token;
      console.log('🔴 Сырой токен:', rawToken);
      console.log('🔴 Длина сырого токена:', rawToken?.length);
      
      // Убираем всё лишнее (если там есть запятые или кавычки)
      let cleanToken = rawToken;
      
      // Заменяем все запятые на точки
      cleanToken = cleanToken.replace(/,/g, '.');
      
      // Если есть лишние кавычки - убираем
      cleanToken = cleanToken.replace(/^"|"$/g, '');
      
      // Если есть пробелы - убираем
      cleanToken = cleanToken.trim();
      
      console.log('🟢 Очищенный токен:', cleanToken);
      console.log('🟢 Длина очищенного токена:', cleanToken?.length);
      
      // Проверяем, что токен содержит точки (должен быть JWT)
      if (!cleanToken.includes('.')) {
        console.error('❌ Токен не содержит точек! Это не JWT!');
        throw new Error('Неверный формат токена');
      }

      // Сохраняем в localStorage
      localStorage.setItem('token', cleanToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // ПРОВЕРЯЕМ, ЧТО СОХРАНИЛОСЬ
      const savedToken = localStorage.getItem('token');
      console.log('💾 Сохранённый токен:', savedToken);
      console.log('💾 Длина сохранённого:', savedToken?.length);
      
      // Проверяем, что в сохранённом нет запятых
      if (savedToken && savedToken.includes(',')) {
        console.error('❌ В сохранённом токене ЕСТЬ запятая! Исправляем снова...');
        const fixedToken = savedToken.replace(/,/g, '.');
        localStorage.setItem('token', fixedToken);
        console.log('✅ Токен исправлен повторно:', fixedToken);
      }

      // Дополнительная проверка - пытаемся сразу запросить /me
      console.log('🔄 Проверяем /me...');
      try {
        const meResponse = await fetch('https://dod-backend.relaxdev.ru/api/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const meData = await meResponse.json();
        console.log('📥 Ответ /me:', meData);
        
        if (meData.id) {
          console.log('✅ Авторизация подтверждена!');
          navigate('/dashboard');
          return;
        } else {
          console.warn('⚠️ /me не вернул пользователя');
        }
      } catch (meErr) {
        console.error('❌ Ошибка при проверке /me:', meErr);
      }

      // Если /me не сработал, но у нас есть токен - всё равно идём на дашборд
      navigate('/dashboard');
      
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>🔐 Вход</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '13px' }}>newadmin@dod.ru / 123456</p>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>❌ {error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: loading ? '#999' : '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}// frontend/src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://dod-backend.relaxdev.ru/api';

export default function Login() {
  const [email, setEmail] = useState('newadmin@dod.ru');
  const [password, setPassword] = useState('123456');
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка входа');
      }

      const data = await response.json();
      console.log('✅ Успешный вход:', data);

      // Сохраняем токен
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // ===== ПЕРЕНАПРАВЛЕНИЕ В ЗАВИСИМОСТИ ОТ РОЛИ =====
      const userRole = data.user.role;
      console.log('👤 Роль пользователя:', userRole);

      if (userRole === 'participant') {
        navigate('/participant-dashboard');
      } else if (userRole === 'parent') {
        navigate('/parent-dashboard');
      } else if (userRole === 'club_coordinator') {
        navigate('/club-coordinator-dashboard');
      } else if (userRole === 'tutor') {
        navigate('/tutor-dashboard');
      } else {
        navigate('/dashboard');
      }
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
      </div>
    </div>
  );
}