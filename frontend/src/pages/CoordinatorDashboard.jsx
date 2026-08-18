// frontend/src/pages/CoordinatorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function CoordinatorDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClubs: 0,
    totalParticipants: 0,
    totalEvents: 0,
    totalAchievements: 0,
    pendingAppeals: 0,
    pendingTasks: 0,
    newParticipantsThisMonth: 0,
    eventsThisMonth: 0,
    consentsPending: 0,
    topClubs: [],
    recentActivity: [],
    monthlyData: []
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

      if (userData.role !== 'movement_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [users, clubs, events, achievements, appeals] = await Promise.all([
        api.getUsers(),
        api.getClubs(),
        api.getEvents(),
        api.getAchievements(),
        api.getAppeals()
      ]);

      const participants = users.filter(u => u.role === 'participant');
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const newParticipants = participants.filter(p => {
        const date = new Date(p.created_at);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });

      const eventsThisMonth = events.filter(e => {
        const date = new Date(e.event_date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });

      const consentsPending = participants.filter(p => 
        !p.consent_personal_data || !p.consent_photo_publication || !p.consent_event_participation
      );

      const clubsWithStats = clubs.map(club => ({
        ...club,
        participants: participants.filter(p => p.club_id === club.id).length,
        events: events.filter(e => e.club_id === club.id).length
      }));
      clubsWithStats.sort((a, b) => b.participants - a.participants);

      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthEvents = events.filter(e => {
          const d = new Date(e.event_date);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        });
        monthlyData.push({
          month: date.toLocaleString('ru-RU', { month: 'short' }),
          count: monthEvents.length
        });
      }

      const activity = [
        ...newParticipants.slice(0, 3).map(p => ({
          type: 'join',
          title: `${p.full_name} присоединился к движению`,
          date: p.created_at,
          icon: '👤',
          color: '#16845B'
        })),
        ...eventsThisMonth.slice(0, 3).map(e => ({
          type: 'event',
          title: `Создано мероприятие: ${e.title}`,
          date: e.event_date,
          icon: '📅',
          color: '#174A7E'
        })),
        ...achievements.slice(0, 2).map(a => ({
          type: 'achievement',
          title: `Новое достижение: ${a.title}`,
          date: a.created_at,
          icon: '🏆',
          color: '#C9A227'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

      setStats({
        totalClubs: clubs.length,
        totalParticipants: participants.length,
        totalEvents: events.length,
        totalAchievements: achievements.length,
        pendingAppeals: appeals.filter(a => a.status === 'pending' || a.status === 'in_progress').length,
        pendingTasks: 0,
        newParticipantsThisMonth: newParticipants.length,
        eventsThisMonth: eventsThisMonth.length,
        consentsPending: consentsPending.length,
        topClubs: clubsWithStats.slice(0, 5),
        recentActivity: activity,
        monthlyData: monthlyData
      });

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxMonthly = Math.max(...stats.monthlyData.map(d => d.count), 1);

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
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="number">{stats.totalParticipants}</div>
            <div className="label">👥 Участников</div>
            <div style={{ fontSize: '11px', color: '#16845B' }}>
              +{stats.newParticipantsThisMonth} за месяц
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="number">{stats.totalClubs}</div>
            <div className="label">🏫 КЮДов</div>
            <div style={{ fontSize: '11px', color: '#667085' }}>
              📊 {stats.topClubs.length} активных
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="number">{stats.eventsThisMonth}</div>
            <div className="label">📅 Мероприятий за месяц</div>
            <div style={{ fontSize: '11px', color: '#667085' }}>
              Всего: {stats.totalEvents}
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="number">{stats.totalAchievements}</div>
            <div className="label">🏆 Достижений</div>
          </div>
        </div>

        {(stats.pendingAppeals > 0 || stats.consentsPending > 0 || stats.pendingTasks > 0) && (
          <div style={{
            padding: '14px 20px',
            background: '#FBF4DC',
            borderLeft: '4px solid #C9A227',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>
              ⚠️ <strong>Требуют внимания:</strong>
              {stats.pendingAppeals > 0 && ` 📨 ${stats.pendingAppeals} обращений`}
              {stats.consentsPending > 0 && ` 📝 ${stats.consentsPending} участников без согласий`}
              {stats.pendingTasks > 0 && ` 📋 ${stats.pendingTasks} заданий`}
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {stats.pendingAppeals > 0 && (
                <button className="btn-primary" style={{ padding: '4px 16px', fontSize: '12px' }} onClick={() => navigate('/appeals')}>
                  📨 Обращения
                </button>
              )}
              {stats.consentsPending > 0 && (
                <button className="btn-primary" style={{ padding: '4px 16px', fontSize: '12px', background: '#6B46C1', color: 'white' }} onClick={() => navigate('/consents-management')}>
                  📝 Согласия
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📈 Активность по месяцам
            </h3>
            {stats.monthlyData.length === 0 || stats.monthlyData.every(d => d.count === 0) ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>Нет данных</p>
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
                  {stats.monthlyData.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      height: '100%'
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${(item.count / maxMonthly) * 100}%`,
                        minHeight: item.count > 0 ? '4px' : '0',
                        background: 'linear-gradient(180deg, #C9A227, #E8D9A8)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s ease'
                      }} />
                      <div style={{
                        fontSize: '10px',
                        color: '#667085',
                        marginTop: '4px',
                        textAlign: 'center'
                      }}>
                        {item.month}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#667085', marginTop: '8px', textAlign: 'center' }}>
                  Всего мероприятий: {stats.monthlyData.reduce((a, b) => a + b.count, 0)}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🏆 Топ-5 КЮДов
            </h3>
            {stats.topClubs.length === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>Нет данных</p>
            ) : (
              stats.topClubs.map((club, index) => (
                <div key={club.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: index < stats.topClubs.length - 1 ? '1px solid #F4F6F9' : 'none',
                  background: index === 0 ? '#FBF4DC' : 'transparent',
                  borderRadius: index === 0 ? '8px' : '0'
                }}>
                  <span style={{ fontWeight: index === 0 ? '600' : '400' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    {' '}
                    {club.name}
                  </span>
                  <span style={{ color: '#667085' }}>👥 {club.participants}</span>
                </div>
              ))
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '12px' }}
              onClick={() => navigate('/clubs-management')}
            >
              Все КЮДы →
            </button>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📋 Последняя активность
            </h3>
            {stats.recentActivity.length === 0 ? (
              <p style={{ color: '#98A2B3', textAlign: 'center', padding: '20px' }}>Активности пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${activity.color}`
                  }}>
                    <span style={{ fontSize: '20px' }}>{activity.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: '#0B1F3A' }}>{activity.title}</div>
                      <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                        📅 {new Date(activity.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
              ⚡ Быстрые действия
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/clubs-management')}>
                🏫 Управление КЮДами
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/mass-notifications')}>
                📨 Массовые уведомления
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#6B46C1', color: 'white' }} onClick={() => navigate('/consents-management')}>
                📝 Управление согласиями
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#C9A227', color: '#0B1F3A' }} onClick={() => navigate('/documents-center')}>
                📁 Центр документов
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/tasks-planner')}>
                📅 Планировщик задач
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}