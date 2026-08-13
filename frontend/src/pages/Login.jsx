// frontend/src/pages/Login.jsx

import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('admin@dod.ru');
  const [password, setPassword] = useState('123456');
  const [status, setStatus] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus('⏳ Отправка...');

    // Показываем, что отправляем
    const payload = { email, password };
    console.log('📤 ОТПРАВЛЯЕМ:', JSON.stringify(payload));

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 СТАТУС ОТВЕТА:', response.status);

      const data = await response.json();
      console.log('📥 ОТВЕТ СЕРВЕРА:', data);

      setStatus(`Статус: ${response.status} | ${JSON.stringify(data)}`);

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
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
        Email: admin@dod.ru | Пароль: 123456
      </p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
          Войти
        </button>
      </form>
      <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '8px', marginTop: '10px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {status || 'Результат появится здесь...'}
      </pre>
      <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
        Откройте консоль (F12 → Console) чтобы увидеть логи
      </p>
    </div>
  );
}