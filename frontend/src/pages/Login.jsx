// frontend/src/pages/Login.jsx

import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('admin@dod.ru');
  const [password, setPassword] = useState('123456');
  const [status, setStatus] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus('⏳ Отправка...');

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim() 
        }),
      });

      const data = await response.json();
      console.log('📦 Ответ сервера:', data);

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setStatus('✅ Успешно!');
        window.location.href = '/dashboard';
      } else {
        setStatus('❌ ' + (data.error || 'Ошибка входа'));
      }
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setStatus('❌ Ошибка: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>🔐 Вход</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '13px' }}>
        admin@dod.ru / 123456
      </p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
        />
        <button 
          type="submit" 
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#0B1F3A', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '16px', 
            cursor: 'pointer' 
          }}
        >
          Войти
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '10px', color: status.includes('✅') ? 'green' : 'red' }}>
        {status}
      </p>
    </div>
  );
}