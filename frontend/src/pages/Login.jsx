// frontend/src/pages/Login.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>🔐 Вход</h2>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>❌ {error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
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
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}