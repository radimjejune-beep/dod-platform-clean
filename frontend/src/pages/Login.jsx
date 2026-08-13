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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const sessionId = sessionStorage.getItem('sessionId');
    
    if (token && !sessionId) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
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

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const sessionId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
      sessionStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('userId', data.user.id);
      sessionStorage.setItem('userRole', data.user.role);

      redirectByRole(data.user.role);

    } catch (err) {
      console.error('❌ Ошибка входа:', err);
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Фоновый слой */}
      <div className="login-bg">
        <div className="login-bg-overlay" />
        <div className="login-bg-particles">
          <span>✦</span><span>✦</span><span>✦</span><span>✦</span>
          <span>✦</span><span>✦</span><span>✦</span><span>✦</span>
        </div>
      </div>

      {/* Карточка входа */}
      <div className="login-card">
        <div className="login-card-inner">
          {/* Герб / Лого */}
          <div className="login-emblem">
            <div className="login-emblem-icon">🌍</div>
            <div className="login-emblem-line" />
          </div>

          <div className="login-header">
            <h1>Детское общественное движение</h1>
            <h2>«Дипломаты будущего»</h2>
            <p className="login-subtitle">Ассоциация российских дипломатов</p>
            <div className="login-divider" />
            <p className="login-welcome">Добро пожаловать в систему</p>
          </div>

          {error && (
            <div className="login-error">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-form-group">
              <label>Email или логин</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@mail.com"
              />
            </div>

            <div className="login-form-group">
              <label>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Введите пароль"
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-btn-loader" />
              ) : (
                '🔑 Войти в систему'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Нет аккаунта?{' '}
              <Link to="/register" className="login-register-link">
                Зарегистрироваться
              </Link>
            </p>
            <p className="login-security">
              🔒 Сессия действует только пока открыта вкладка
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
        }

        /* ===== ФОН ===== */
        .login-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(ellipse at 20% 30%, rgba(201, 162, 39, 0.05) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, rgba(23, 74, 126, 0.05) 0%, transparent 60%),
            linear-gradient(145deg, #0B1F3A 0%, #07152B 100%);
          z-index: 0;
        }

        .login-bg-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            repeating-linear-gradient(0deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 3px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 3px);
          background-size: 40px 40px;
        }

        .login-bg-particles {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .login-bg-particles span {
          position: absolute;
          color: rgba(201, 162, 39, 0.08);
          font-size: 20px;
          animation: float 20s infinite linear;
        }

        .login-bg-particles span:nth-child(1) { top: 10%; left: 10%; animation-delay: 0s; }
        .login-bg-particles span:nth-child(2) { top: 30%; left: 85%; animation-delay: 3s; }
        .login-bg-particles span:nth-child(3) { top: 70%; left: 15%; animation-delay: 6s; }
        .login-bg-particles span:nth-child(4) { top: 85%; left: 70%; animation-delay: 9s; }
        .login-bg-particles span:nth-child(5) { top: 50%; left: 50%; animation-delay: 2s; }
        .login-bg-particles span:nth-child(6) { top: 15%; left: 50%; animation-delay: 5s; }
        .login-bg-particles span:nth-child(7) { top: 60%; left: 90%; animation-delay: 8s; }
        .login-bg-particles span:nth-child(8) { top: 90%; left: 30%; animation-delay: 11s; }

        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.6; }
          25% { transform: translate(30px, -20px) rotate(90deg); opacity: 1; }
          50% { transform: translate(-20px, 30px) rotate(180deg); opacity: 0.6; }
          75% { transform: translate(40px, 10px) rotate(270deg); opacity: 1; }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 0.6; }
        }

        /* ===== КАРТОЧКА ВХОДА ===== */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px 36px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 162, 39, 0.1);
          animation: slideUp 0.6s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-card-inner {
          position: relative;
        }

        /* ===== ГЕРБ ===== */
        .login-emblem {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          margin-bottom: 20px;
        }

        .login-emblem-icon {
          width: 64px;
          height: 64px;
          background: var(--gold-gradient, linear-gradient(135deg, #C9A227, #E8D9A8));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 4px 20px rgba(201, 162, 39, 0.3);
        }

        .login-emblem-line {
          width: 60px;
          height: 2px;
          background: var(--gold-gradient, linear-gradient(135deg, #C9A227, #E8D9A8));
          margin-top: 12px;
          border-radius: 2px;
        }

        /* ===== ЗАГОЛОВКИ ===== */
        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-header h1 {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #667085;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 0 0 4px;
        }

        .login-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0 0 4px;
          letter-spacing: 0.5px;
        }

        .login-subtitle {
          font-size: 11px;
          color: #C9A227;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin: 4px 0 0;
        }

        .login-divider {
          width: 40px;
          height: 2px;
          background: var(--gold-gradient, linear-gradient(135deg, #C9A227, #E8D9A8));
          margin: 12px auto;
          border-radius: 2px;
        }

        .login-welcome {
          font-size: 13px;
          color: #667085;
          margin: 0;
        }

        /* ===== ФОРМА ===== */
        .login-form-group {
          margin-bottom: 16px;
        }

        .login-form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #0B1F3A;
          margin-bottom: 4px;
        }

        .login-form-group input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #D5DCE7;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: #F8FAFC;
          color: #0B1F3A;
        }

        .login-form-group input:focus {
          border-color: #C9A227;
          background: white;
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.1);
        }

        .login-form-group input::placeholder {
          color: #98A2B3;
        }

        /* ===== КНОПКА ===== */
        .login-btn {
          width: 100%;
          padding: 12px;
          background: var(--gold-gradient, linear-gradient(135deg, #C9A227, #E8D9A8));
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          color: #0B1F3A;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(201, 162, 39, 0.25);
          margin-top: 4px;
          letter-spacing: 0.5px;
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(201, 162, 39, 0.35);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-btn-loader {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(11, 31, 58, 0.2);
          border-top-color: #0B1F3A;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ===== ОШИБКА ===== */
        .login-error {
          padding: 12px 16px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          text-align: center;
          border-left: 4px solid #B3262E;
        }

        /* ===== ФУТЕР ===== */
        .login-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #F4F6F9;
        }

        .login-footer p {
          font-size: 14px;
          color: #667085;
          margin: 0;
        }

        .login-register-link {
          color: #0B1F3A;
          font-weight: 600;
          text-decoration: none;
          border-bottom: 2px solid #C9A227;
          padding-bottom: 2px;
          transition: all 0.2s ease;
        }

        .login-register-link:hover {
          color: #174A7E;
          border-bottom-color: #174A7E;
        }

        .login-security {
          font-size: 12px !important;
          color: #98A2B3 !important;
          margin-top: 8px !important;
        }

        /* ===== АДАПТИВ ===== */
        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px;
          }
          .login-header h2 {
            font-size: 20px;
          }
          .login-emblem-icon {
            width: 48px;
            height: 48px;
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}