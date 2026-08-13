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
}