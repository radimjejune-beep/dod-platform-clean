// frontend/src/pages/Appeals.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Appeals() {
  const [profile, setProfile] = useState(null);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const appealsData = await api.getAppeals();
      setAppeals(appealsData || []);

    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const result = await api.addAppeal({
        subject: form.subject,
        message: form.message,
        priority: form.priority
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Обращение отправлено!');
      setForm({ subject: '', message: '', priority: 'medium' });
      setShowForm(false);
      
      const appealsData = await api.getAppeals();
      setAppeals(appealsData || []);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>📨 Обращения</h1>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 24px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            {showForm ? '✖ Закрыть' : '➕ Создать'}
          </button>
        </div>

        {message && (
          <div style={{ padding: '12px', borderRadius: '10px', marginBottom: '16px', background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC', color: message.includes('✅') ? '#16845B' : '#B3262E' }}>
            {message}
          </div>
        )}

        {showForm && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>✍️ Новое обращение</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Тема" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="low">🟢 Низкий</option>
                <option value="medium">🟡 Средний</option>
                <option value="high">🔴 Высокий</option>
                <option value="urgent">🔥 Срочно</option>
              </select>
              <textarea placeholder="Текст обращения" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="4" required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }} />
              <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#16845B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{loading ? '⏳ Отправка...' : '📤 Отправить'}</button>
            </form>
          </div>
        )}

        {appeals.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid #E2E7EF' }}>
            <p style={{ color: '#667085' }}>Обращений пока нет</p>
          </div>
        ) : (
          appeals.map(a => (
            <div key={a.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '12px', border: '1px solid #E2E7EF' }}>
              <h3 style={{ margin: 0 }}>{a.subject}</h3>
              <p style={{ color: '#667085' }}>{a.message}</p>
              <span style={{ fontSize: '13px', color: '#98A2B3' }}>{new Date(a.created_at).toLocaleDateString('ru-RU')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}