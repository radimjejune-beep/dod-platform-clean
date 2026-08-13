// frontend/src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('admin@dod.ru');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Попытка входа:', email);

      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('📦 Ответ сервера:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '50px auto', 
      padding: '30px', 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🔐 Вход</h2>
      
      {error && (
        <div style={{ 
          padding: '12px', 
          background: '#fee', 
          color: '#c00', 
          borderRadius: '8px', 
          marginBottom: '16px', 
          textAlign: 'center' 
        }}>
          ❌ {error}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '8px', 
              border: '1px solid #ddd', 
              fontSize: '16px' 
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '8px', 
              border: '1px solid #ddd', 
              fontSize: '16px' 
            }}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#999' : '#0B1F3A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Вход...' : '🔑 Войти'}
        </button>
      </form>
    </div>
  );
}