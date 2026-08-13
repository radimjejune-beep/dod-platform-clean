// frontend/src/pages/ManageAchievements.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ManageAchievements() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', achievement_date: '', participant_id: '' });
  const [participants, setParticipants] = useState([]);
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

      const achievementsData = await api.getAchievements();
      setAchievements(achievementsData || []);

      const participantsData = await api.getParticipants();
      setParticipants(participantsData || []);

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
      const result = await api.addAchievement({
        participant_id: form.participant_id,
        title: form.title,
        description: form.description,
        achievement_date: form.achievement_date
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Достижение добавлено!');
      setForm({ title: '', description: '', achievement_date: '', participant_id: '' });
      setShowForm(false);
      
      const achievementsData = await api.getAchievements();
      setAchievements(achievementsData || []);
      
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>🏆 Управление достижениями</h1>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 24px', background: '#0B1F3A', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            {showForm ? '✖' : '➕ Добавить'}
          </button>
        </div>

        {message && <div style={{ padding: '12px', borderRadius: '10px', margin: '16px 0', background: '#E8F5EF', color: '#16845B' }}>{message}</div>}

        {showForm && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF', marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <select value={form.participant_id} onChange={(e) => setForm({ ...form, participant_id: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="">Выберите участника</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <input type="text" placeholder="Название достижения" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }} />
              <input type="date" value={form.achievement_date} onChange={(e) => setForm({ ...form, achievement_date: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#16845B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Добавить</button>
            </form>
          </div>
        )}

        {achievements.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid #E2E7EF' }}>
            <p style={{ color: '#667085' }}>Достижений пока нет</p>
          </div>
        ) : (
          achievements.map(a => (
            <div key={a.id} style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', marginBottom: '12px', border: '1px solid #E2E7EF' }}>
              <h4 style={{ margin: 0 }}>{a.title}</h4>
              <p style={{ color: '#667085' }}>{a.description}</p>
              <span style={{ fontSize: '13px', color: '#98A2B3' }}>{a.achievement_date ? new Date(a.achievement_date).toLocaleDateString('ru-RU') : '—'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}