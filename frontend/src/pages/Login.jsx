// frontend/src/pages/Login.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import logo from '../assets/Image.png';
import ardLogo from '../assets/АРДЛОГО.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMustChangePassword(false);

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      // Проверяем, нужно ли сменить пароль
      if (response.status === 403 && data.must_change_password === true) {
        setMustChangePassword(true);
        setResetToken(data.reset_token);
        setError('');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      // Успешный вход
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const sessionId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
        sessionStorage.setItem('sessionId', sessionId);
        sessionStorage.setItem('userId', data.user.id);
        sessionStorage.setItem('userRole', data.user.role);
        
        redirectByRole(data.user.role);
      }
      
    } catch (err) {
      console.error('❌ Ошибка входа:', err);
      setError(err.message || 'Неверный email или пароль');
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError('');
    setError('');

    // Проверка сложности пароля
    if (newPassword.length < 8) {
      setPasswordError('Пароль должен содержать минимум 8 символов');
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError('Пароль должен содержать заглавную букву');
      setLoading(false);
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError('Пароль должен содержать строчную букву');
      setLoading(false);
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('Пароль должен содержать цифру');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка смены пароля');
      }

      // Пароль изменён успешно
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const sessionId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
        sessionStorage.setItem('sessionId', sessionId);
        sessionStorage.setItem('userId', data.user.id);
        sessionStorage.setItem('userRole', data.user.role);
        
        redirectByRole(data.user.role);
      } else {
        // Если токен не пришёл — перенаправляем на логин
        setMustChangePassword(false);
        setError('Пароль изменён! Войдите снова.');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

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

  // Форма смены пароля
  if (mustChangePassword) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="login-logo">
                <img src={logo} alt="ДОД" />
              </div>
              <h1>Дипломаты будущего</h1>
              <p className="login-subtitle">Ассоциация российских дипломатов</p>
              <div className="login-divider" />
              <p className="login-warning">⚠️ Необходимо изменить временный пароль</p>
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {passwordError && (
              <div className="login-error" style={{ borderLeftColor: '#C9A227', background: '#FBF4DC', color: '#8A6A00' }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="login-form">
              <div className="form-group">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Подтверждение пароля</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '⏳ Сохранение...' : '🔑 Установить новый пароль'}
              </button>

              <p className="login-hint">
                Пароль должен содержать заглавную и строчную буквы, цифру
              </p>
            </form>
          </div>
        </div>

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(160deg, #0B1F3A 0%, #051224 100%);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .login-page::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: 
              radial-gradient(ellipse at 30% 30%, rgba(201, 162, 39, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 70%, rgba(23, 74, 126, 0.05) 0%, transparent 50%);
            animation: floatBg 30s ease-in-out infinite alternate;
          }

          @keyframes floatBg {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-30px, 30px) scale(1.05); }
            100% { transform: translate(30px, -30px) scale(0.95); }
          }

          .login-container {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 440px;
          }

          .login-card {
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 48px 40px;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 162, 39, 0.08);
            animation: slideUp 0.6s ease;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .login-header {
            text-align: center;
            margin-bottom: 32px;
          }

          .login-logo {
            width: 72px;
            height: 72px;
            margin: 0 auto 16px;
            background: linear-gradient(135deg, #0B1F3A, #174A7E);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(201, 162, 39, 0.3);
            box-shadow: 0 4px 20px rgba(11, 31, 58, 0.2);
          }

          .login-logo img {
            height: 40px;
            width: auto;
            filter: brightness(0) invert(1);
          }

          .login-header h1 {
            font-family: 'Playfair Display', serif;
            font-size: 26px;
            font-weight: 700;
            color: #0B1F3A;
            letter-spacing: -0.5px;
            margin: 0 0 4px;
          }

          .login-subtitle {
            font-size: 12px;
            color: #98A2B3;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0 0 12px;
          }

          .login-divider {
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #C9A227, #E8D9A8);
            margin: 0 auto 16px;
            border-radius: 2px;
          }

          .login-warning {
            font-size: 14px;
            color: #B3262E;
            font-weight: 500;
          }

          .login-error {
            padding: 14px 18px;
            background: #FCEBEC;
            color: #B3262E;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 14px;
            text-align: center;
            border-left: 4px solid #B3262E;
            font-weight: 500;
          }

          .login-form .form-group {
            margin-bottom: 18px;
          }

          .login-form .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #0B1F3A;
            margin-bottom: 6px;
            letter-spacing: 0.3px;
          }

          .login-form .form-group input {
            width: 100%;
            padding: 14px 16px;
            border: 1.5px solid #D5DCE7;
            border-radius: 12px;
            font-size: 15px;
            outline: none;
            transition: all 0.3s ease;
            background: #F8FAFC;
            color: #0B1F3A;
            font-family: inherit;
          }

          .login-form .form-group input:focus {
            border-color: #C9A227;
            background: white;
            box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.08);
          }

          .login-form .form-group input::placeholder {
            color: #98A2B3;
          }

          .login-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #C9A227, #B8921F);
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            color: #0B1F3A;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(201, 162, 39, 0.25);
            letter-spacing: 0.5px;
            font-family: inherit;
          }

          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 35px rgba(201, 162, 39, 0.35);
          }

          .login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }

          .login-hint {
            text-align: center;
            font-size: 12px;
            color: #98A2B3;
            margin-top: 16px;
          }

          @media (max-width: 480px) {
            .login-card { padding: 32px 24px; margin: 0 10px; }
            .login-header h1 { font-size: 22px; }
            .login-logo { width: 60px; height: 60px; }
            .login-logo img { height: 32px; }
          }
        `}</style>
      </div>
    );
  }

  // Основная форма входа
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src={logo} alt="ДОД" />
            </div>
            <h1>Дипломаты будущего</h1>
            <p className="login-subtitle">Ассоциация российских дипломатов</p>
            <div className="login-divider" />
            <p className="login-welcome">Добро пожаловать в систему</p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '⏳ Вход...' : '🔑 Войти в систему'}
            </button>

            <p className="login-hint">
              🔒 Только авторизованные пользователи. Аккаунты создаются администрацией.
            </p>
          </form>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #0B1F3A 0%, #051224 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .login-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: 
            radial-gradient(ellipse at 30% 30%, rgba(201, 162, 39, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, rgba(23, 74, 126, 0.05) 0%, transparent 50%);
          animation: floatBg 30s ease-in-out infinite alternate;
        }

        @keyframes floatBg {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.05); }
          100% { transform: translate(30px, -30px) scale(0.95); }
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px 40px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 162, 39, 0.08);
          animation: slideUp 0.6s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          width: 72px;
          height: 72px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(201, 162, 39, 0.3);
          box-shadow: 0 4px 20px rgba(11, 31, 58, 0.2);
        }

        .login-logo img {
          height: 40px;
          width: auto;
          filter: brightness(0) invert(1);
        }

        .login-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: #0B1F3A;
          letter-spacing: -0.5px;
          margin: 0 0 4px;
        }

        .login-subtitle {
          font-size: 12px;
          color: #98A2B3;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 0 0 12px;
        }

        .login-divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #C9A227, #E8D9A8);
          margin: 0 auto 16px;
          border-radius: 2px;
        }

        .login-welcome {
          font-size: 15px;
          color: #667085;
          font-weight: 400;
        }

        .login-error {
          padding: 14px 18px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
          text-align: center;
          border-left: 4px solid #B3262E;
          font-weight: 500;
        }

        .login-form .form-group {
          margin-bottom: 18px;
        }

        .login-form .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #0B1F3A;
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }

        .login-form .form-group input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #D5DCE7;
          border-radius: 12px;
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
          background: #F8FAFC;
          color: #0B1F3A;
          font-family: inherit;
        }

        .login-form .form-group input:focus {
          border-color: #C9A227;
          background: white;
          box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.08);
        }

        .login-form .form-group input::placeholder {
          color: #98A2B3;
        }

        .login-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #C9A227, #B8921F);
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          color: #0B1F3A;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(201, 162, 39, 0.25);
          letter-spacing: 0.5px;
          font-family: inherit;
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 35px rgba(201, 162, 39, 0.35);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-hint {
          text-align: center;
          font-size: 12px;
          color: #98A2B3;
          margin-top: 16px;
        }

        @media (max-width: 480px) {
          .login-card { padding: 32px 24px; margin: 0 10px; }
          .login-header h1 { font-size: 22px; }
          .login-logo { width: 60px; height: 60px; }
          .login-logo img { height: 32px; }
        }
      `}</style>
    </div>
  );
}