// frontend/src/pages/AdminInvite.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function AdminInvite() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ invited_name: '', invited_email: '', invited_password: '', role: 'club_coordinator', club_id: '' });
  const [clubs, setClubs] = useState([]);
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

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

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
      setMessage('✅ Приглашение создано!');
      setForm({ invited_name: '', invited_email: '', invited_password: '', role: 'club_coordinator', club_id: '' });
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
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>🎫 Приглашения</h1>
        {message && <div style={{ padding: '12px', borderRadius: '10px', margin: '16px 0', background: '#E8F5EF', color: '#16845B' }}>{message}</div>}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF' }}>
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="ФИО приглашаемого" value={form.invited_name} onChange={(e) => setForm({ ...form, invited_name: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="email" placeholder="Email" value={form.invited_email} onChange={(e) => setForm({ ...form, invited_email: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="text" placeholder="Пароль" value={form.invited_password} onChange={(e) => setForm({ ...form, invited_password: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="club_coordinator">🏫 Координатор КЮДа</option>
              <option value="tutor">📚 Тьютор</option>
              <option value="movement_coordinator">⭐ Координатор движения</option>
              <option value="admin">🔧 Администратор</option>
            </select>
            {form.role === 'club_coordinator' && (
              <select value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="">Без клуба</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Создать приглашение</button>
          </form>
        </div>
      </div>
    </div>
  );
}