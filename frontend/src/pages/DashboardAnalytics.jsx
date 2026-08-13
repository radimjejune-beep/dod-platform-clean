// frontend/src/pages/DashboardAnalytics.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function DashboardAnalytics() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalClubs: 0,
    totalEvents: 0,
    totalAchievements: 0,
    newParticipantsThisMonth: 0,
    topClubs: [],
    monthlyLabels: [],
    monthlyActivity: []
  });
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

      // ============================================================
      // ТОЛЬКО АДМИН И КООРДИНАТОР ДВИЖЕНИЯ
      // ============================================================
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

      // Общая статистика
      const participants = users.filter(u => u.role === 'participant');
      
      // Новые участники за месяц
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const newParticipants = participants.filter(p => 
        new Date(p.created_at) > oneMonthAgo
      );

      // Топ клубов
      const clubsWithCount = clubs.map(club => {
        const count = participants.filter(p => p.club_id === club.id).length;
        const clubEvents = events.filter(e => e.club_id === club.id).length;
        return { ...club, participantsCount: count, eventsCount: clubEvents, rating: count * 5 + clubEvents * 10 };
      });
      clubsWithCount.sort((a, b) => b.rating - a.rating);

      // Активность по месяцам (последние 6 месяцев)
      const monthlyLabels = [];
      const monthlyActivity = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        monthlyLabels.push(date.toLocaleString('ru-RU', { month: 'short' }));
        
        const monthEvents = events.filter(e => {
          const eventDate = new Date(e.event_date);
          return eventDate.getMonth() === date.getMonth() && 
                 eventDate.getFullYear() === date.getFullYear();
        });
        monthlyActivity.push(monthEvents.length);
      }

      setStats({
        totalParticipants: participants.length,
        totalClubs: clubs.length,
        totalEvents: events.length,
        totalAchievements: achievements.length,
        newParticipantsThisMonth: newParticipants.length,
        topClubs: clubsWithCount.slice(0, 5),
        monthlyLabels,
        monthlyActivity
      });

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

  const maxMonthly = Math.max(...stats.monthlyActivity, 1);

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📊</span>
          <div>
            <h1>Аналитика движения</h1>
            <p>Статистика и показатели ДОД «Дипломаты будущего»</p>
          </div>
        </div>

        {/* СТАТИСТИКА В ЦИФРАХ */}
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
          <div className="stat-card" style={{ borderTop: '4px solid #C9A227' }}>
            <div className="number" style={{ color: '#C9A227' }}>{stats.newParticipantsThisMonth}</div>
            <div className="label">⭐ Новых за месяц</div>
          </div>
        </div>

        {/* ТОП-5 КЮДОВ + ГРАФИК */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Топ-5 КЮДов
            </h3>
            {stats.topClubs.length === 0 ? (
              <p style={{ color: '#667085' }}>Нет данных</p>
            ) : (
              stats.topClubs.map((club, index) => (
                <div key={club.id} className="list-item" style={{
                  borderLeftColor: index === 0 ? '#C9A227' : '#667085',
                  background: index === 0 ? '#FBF4DC' : 'transparent'
                }}>
                  <div className="title">
                    #{index + 1} {club.name}
                  </div>
                  <div className="subtitle">
                    👥 {club.participantsCount} участников • 📅 {club.eventsCount} мероприятий
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📈 Активность по месяцам
            </h3>
            {stats.monthlyActivity.length === 0 || stats.monthlyActivity.every(v => v === 0) ? (
              <p style={{ color: '#667085' }}>Нет данных</p>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  height: '120px',
                  paddingBottom: '4px',
                  gap: '4px'
                }}>
                  {stats.monthlyActivity.map((count, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      height: '100%'
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${(count / maxMonthly) * 100}%`,
                        minHeight: count > 0 ? '4px' : '0',
                        background: '#174A7E',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s ease'
                      }} />
                      <div style={{
                        fontSize: '10px',
                        color: '#667085',
                        marginTop: '4px',
                        textAlign: 'center'
                      }}>
                        {stats.monthlyLabels[index] || ''}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#667085', marginTop: '8px', textAlign: 'center' }}>
                  Всего мероприятий: {stats.monthlyActivity.reduce((a, b) => a + b, 0)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            🚀 Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/clubs')}>
              🏫 КЮДы
            </button>
            <button className="btn-primary" onClick={() => navigate('/participants')}>
              👥 Участники
            </button>
            <button className="btn-primary" onClick={() => navigate('/events')}>
              📅 Мероприятия
            </button>
            <button className="btn-primary" onClick={() => navigate('/reports')}>
              📋 Отчёты
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}