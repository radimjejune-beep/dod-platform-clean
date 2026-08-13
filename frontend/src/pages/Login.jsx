// frontend/src/pages/Login.jsx

import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('admin@dod.ru');
  const [password, setPassword] = useState('123456');
  const [result, setResult] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    console.log('📤 Отправляем:', { email, password });

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('📥 Ответ:', data);

      setResult(JSON.stringify(data, null, 2));

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setResult('Ошибка: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '12px' }}>
      <h2>🔐 Вход</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px' }}>
          Войти
        </button>
      </form>
      <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '8px', marginTop: '10px', fontSize: '12px', overflow: 'auto' }}>
        {result || 'Результат появится здесь...'}
      </pre>
    </div>
  );
}