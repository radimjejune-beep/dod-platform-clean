// frontend/src/pages/MyAchievements.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function MyAchievements() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
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

    } catch (err) {
      console.error('Ошибка:', err);
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
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>🏆 Мои достижения</h1>
        {achievements.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid #E2E7EF', marginTop: '20px' }}>
            <p style={{ color: '#667085' }}>У вас пока нет достижений</p>
          </div>
        ) : (
          achievements.map(a => (
            <div key={a.id} style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', marginTop: '12px', border: '1px solid #E2E7EF' }}>
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