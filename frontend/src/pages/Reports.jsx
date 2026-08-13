// frontend/src/pages/Reports.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Reports() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ report_month: '', report_text: '', events_count: 0, participants_count: 0 });
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
      setMessage('✅ Отчёт создан!');
      setForm({ report_month: '', report_text: '', events_count: 0, participants_count: 0 });
      setShowForm(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>📋 Отчёты</h1>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 24px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            {showForm ? '✖' : '➕ Создать'}
          </button>
        </div>

        {message && (
          <div style={{ padding: '12px', borderRadius: '10px', margin: '16px 0', background: '#E8F5EF', color: '#16845B' }}>{message}</div>
        )}

        {showForm && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF', marginBottom: '20px' }}>
            <h3>📝 Новый отчёт</h3>
            <form onSubmit={handleSubmit}>
              <input type="month" value={form.report_month} onChange={(e) => setForm({ ...form, report_month: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <textarea placeholder="Текст отчёта" value={form.report_text} onChange={(e) => setForm({ ...form, report_text: e.target.value })} rows="4" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="number" placeholder="Мероприятий" value={form.events_count} onChange={(e) => setForm({ ...form, events_count: parseInt(e.target.value) || 0 })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <input type="number" placeholder="Участников" value={form.participants_count} onChange={(e) => setForm({ ...form, participants_count: parseInt(e.target.value) || 0 })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '10px 24px', background: '#16845B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Создать</button>
            </form>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid #E2E7EF' }}>
          <p style={{ color: '#667085' }}>Отчётов пока нет</p>
        </div>
      </div>
    </div>
  );
}