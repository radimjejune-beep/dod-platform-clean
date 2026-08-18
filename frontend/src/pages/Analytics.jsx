// frontend/src/pages/Analytics.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Analytics() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalClubs: 0,
    totalEvents: 0,
    totalAchievements: 0
  });
  const [topClubs, setTopClubs] = useState([]);
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

      if (userData.role !== 'admin' && userData.role !== 'movement_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [users, clubs, events, achievements] = await Promise.all([
        api.getUsers(),
        api.getClubs(),
        api.getEvents(),
        api.getAchievements()
      ]);

      setStats({
        totalParticipants: users.filter(u => u.role === 'participant').length,
        totalClubs: clubs.length,
        totalEvents: events.length,
        totalAchievements: achievements.length
      });

      const clubsWithCount = clubs.map(club => {
        const count = users.filter(u => u.club_id === club.id).length;
        return { ...club, participantsCount: count };
      });
      clubsWithCount.sort((a, b) => b.participantsCount - a.participantsCount);
      setTopClubs(clubsWithCount.slice(0, 5));
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {/* ❌ УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="number">{stats.totalParticipants}</div>
            <div className="label">👥 Участников</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.totalClubs}</div>
            <div className="label">🏫 КЮДов</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.totalEvents}</div>
            <div className="label">📅 Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.totalAchievements}</div>
            <div className="label">🏆 Достижений</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            🏆 Топ-5 КЮДов по количеству участников
          </h3>
          {topClubs.length === 0 ? (
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
              Нет данных
            </p>
          ) : (
            <div>
              {topClubs.map((club, index) => (
                <div
                  key={club.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: index < topClubs.length - 1 ? '1px solid #F4F6F9' : 'none',
                    background: index === 0 ? '#FBF4DC' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontWeight: 'bold',
                      fontSize: '18px',
                      color: index === 0 ? '#C9A227' : index === 1 ? '#A0A0A0' : index === 2 ? '#CD7F32' : '#667085'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: '500' }}>{club.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#667085' }}>
                      👥 {club.participantsCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
            🚀 Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/clubs')}>
              🏫 Управлять КЮДами
            </button>
            <button className="btn-primary" onClick={() => navigate('/participants')}>
              👥 Участники
            </button>
            <button className="btn-primary" onClick={() => navigate('/events')}>
              📅 Мероприятия
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}