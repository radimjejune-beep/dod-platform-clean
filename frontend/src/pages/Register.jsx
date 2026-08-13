// frontend/src/pages/Register.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('participant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://dod-backend.relaxdev.ru/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          phone: '',
          school: '',
          class_name: '',
          birth_date: '2000-01-01',
          is_minor: false,
          consents: {
            agree_to_terms: true,
            agree_personal_data: true,
            agree_minor_data: false,
            agree_image_use: false,
            agree_photo_publication: false
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>📝 Регистрация</h2>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>❌ {error}</p>}
      {success && <p style={{ color: 'green', textAlign: 'center' }}>✅ Регистрация успешна! Перенаправление...</p>}
      {!success && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ФИО"
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
            required
          />
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          >
            <option value="participant">👤 Участник</option>
            <option value="parent">👨‍👩‍👦 Родитель</option>
            <option value="club_coordinator">🏫 Координатор КЮДа</option>
            <option value="tutor">📚 Тьютор</option>
            <option value="movement_coordinator">⭐ Координатор движения</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#999' : '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
      )}
    </div>
  );
}