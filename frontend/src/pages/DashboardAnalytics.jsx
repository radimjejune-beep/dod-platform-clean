// frontend/src/pages/DashboardAnalytics.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function DashboardAnalytics() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalClubs: 0,
    totalEvents: 0
  });
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

      const users = await api.getUsers();
      const clubs = await api.getClubs();
      const events = await api.getEvents();

      setStats({
        totalParticipants: users.filter(u => u.role === 'participant').length,
        totalClubs: clubs.length,
        totalEvents: events.length
      });

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
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>📊 Аналитика</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E2E7EF' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>{stats.totalParticipants}</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Участников</div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E2E7EF' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>{stats.totalClubs}</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>КЮДов</div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E2E7EF' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0B1F3A' }}>{stats.totalEvents}</div>
            <div style={{ fontSize: '14px', color: '#667085' }}>Мероприятий</div>
          </div>
        </div>
      </div>
    </div>
  );
}