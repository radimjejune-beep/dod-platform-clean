// frontend/src/pages/CrmDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function CrmDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeParticipants: 0,
    newThisMonth: 0,
    totalClubs: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    pendingTasks: 0,
    unreadMessages: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [topParticipants, setTopParticipants] = useState([]);
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

      if (!['admin', 'movement_coordinator'].includes(userData.role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // Загружаем данные
      const [users, clubs, events, achievements] = await Promise.all([
        api.getUsers(),
        api.getClubs(),
        api.getEvents(),
        api.getAchievements()
      ]);

      const participants = users.filter(u => u.role === 'participant');
      const activeParticipants = participants.filter(p => p.status === 'active');
      
      // Новые за месяц
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const newThisMonth = participants.filter(p => 
        new Date(p.created_at) > oneMonthAgo
      );

      // Предстоящие мероприятия
      const now = new Date();
      const upcoming = events
        .filter(e => new Date(e.event_date) >= now && e.moderation_status === 'approved')
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 5);

      // Топ участников по активности
      const participantStats = participants.map(p => ({
        ...p,
        eventsCount: 0, // TODO: посчитать из регистраций
        achievementsCount: achievements.filter(a => a.participant_id === p.id).length
      }));
      participantStats.sort((a, b) => (b.eventsCount + b.achievementsCount) - (a.eventsCount + a.achievementsCount));

      setStats({
        totalParticipants: participants.length,
        activeParticipants: activeParticipants.length,
        newThisMonth: newThisMonth.length,
        totalClubs: clubs.length,
        totalEvents: events.length,
        upcomingEvents: upcoming.length,
        pendingTasks: 0,
        unreadMessages: 0
      });

      setUpcomingEvents(upcoming);
      setTopParticipants(participantStats.slice(0, 5));

      // Последняя активность
      const activity = [
        ...newThisMonth.slice(0, 3).map(p => ({
          type: 'new_participant',
          message: `${p.full_name} присоединился к движению`,
          date: p.created_at,
          icon: '👤',
          color: '#16845B'
        })),
        ...upcoming.slice(0, 3).map(e => ({
          type: 'event',
          message: `Мероприятие "${e.title}" скоро начнётся`,
          date: e.event_date,
          icon: '📅',
          color: '#174A7E'
        })),
        ...achievements.slice(0, 2).map(a => ({
          type: 'achievement',
          message: `Новое достижение: ${a.title}`,
          date: a.created_at,
          icon: '🏆',
          color: '#C9A227'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

      setRecentActivity(activity);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <style>{`
          .page-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #F0EDE8;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E4DFD8;
            border-top-color: #C9A227;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crm-page">
      <Navigation profile={profile} />
      <div className="crm-container">
        
        {/* ============================================================
           ЗАГОЛОВОК
           ============================================================ */}
        <div className="crm-header">
          <div className="crm-header-left">
            <h1>🏢 CRM Дашборд</h1>
            <p>Управление участниками, мероприятиями и коммуникациями</p>
          </div>
          <div className="crm-header-actions">
            <Link to="/participants" className="btn-primary">👥 Участники</Link>
            <Link to="/events" className="btn-primary">📅 Мероприятия</Link>
            <Link to="/mass-notifications" className="btn-gold">📨 Рассылка</Link>
          </div>
        </div>

        {/* ============================================================
           МЕТРИКИ
           ============================================================ */}
        <div className="crm-stats">
          <div className="stat-card" style={{ borderTop: '3px solid #174A7E' }}>
            <div className="stat-number">{stats.totalParticipants}</div>
            <div className="stat-label">👥 Всего участников</div>
            <div className="stat-change">+{stats.newThisMonth} за месяц</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #16845B' }}>
            <div className="stat-number">{stats.activeParticipants}</div>
            <div className="stat-label">🟢 Активных</div>
            <div className="stat-change">{Math.round((stats.activeParticipants / stats.totalParticipants) * 100) || 0}% от всех</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #C9A227' }}>
            <div className="stat-number">{stats.totalEvents}</div>
            <div className="stat-label">📅 Мероприятий</div>
            <div className="stat-change">{stats.upcomingEvents} предстоящих</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6B46C1' }}>
            <div className="stat-number">{stats.totalClubs}</div>
            <div className="stat-label">🏫 КЮДов</div>
          </div>
        </div>

        {/* ============================================================
           ОСНОВНОЙ КОНТЕНТ
           ============================================================ */}
        <div className="crm-grid">
          {/* ===== ЛЕВАЯ КОЛОНКА ===== */}
          <div className="crm-left">
            {/* БЛИЖАЙШИЕ МЕРОПРИЯТИЯ */}
            <div className="card">
              <div className="card-header">
                <h3>📅 Ближайшие мероприятия</h3>
                <Link to="/events" className="card-link">Все →</Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="empty-text">Нет предстоящих мероприятий</p>
              ) : (
                <div className="event-list">
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className="event-item">
                      <div className="event-date">
                        {new Date(e.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="event-info">
                        <div className="event-title">{e.title}</div>
                        <div className="event-meta">{e.location || 'Место не указано'}</div>
                      </div>
                      <Link to={`/events/${e.id}`} className="event-link">→</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* АКТИВНОСТЬ */}
            <div className="card">
              <div className="card-header">
                <h3>📋 Последняя активность</h3>
              </div>
              {recentActivity.length === 0 ? (
                <p className="empty-text">Активности пока нет</p>
              ) : (
                <div className="activity-list">
                  {recentActivity.map((item, index) => (
                    <div key={index} className="activity-item">
                      <span className="activity-icon" style={{ background: item.color + '20', color: item.color }}>
                        {item.icon}
                      </span>
                      <div className="activity-content">
                        <div className="activity-message">{item.message}</div>
                        <div className="activity-date">
                          {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== ПРАВАЯ КОЛОНКА ===== */}
          <div className="crm-right">
            {/* ТОП УЧАСТНИКОВ */}
            <div className="card">
              <div className="card-header">
                <h3>🏆 Топ участников</h3>
                <Link to="/participants" className="card-link">Все →</Link>
              </div>
              {topParticipants.length === 0 ? (
                <p className="empty-text">Нет данных</p>
              ) : (
                <div className="top-list">
                  {topParticipants.map((p, index) => (
                    <div key={p.id} className="top-item">
                      <div className="top-rank" style={{
                        background: index === 0 ? '#C9A227' : 
                                   index === 1 ? '#A0A0A0' : 
                                   index === 2 ? '#CD7F32' : '#F4F6F9',
                        color: index < 3 ? '#0A1628' : '#667085'
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div className="top-info">
                        <div className="top-name">{p.full_name}</div>
                        <div className="top-meta">
                          {p.club_name || 'Без клуба'} • 🏆 {p.achievementsCount || 0}
                        </div>
                      </div>
                      <div className="top-score">⭐ {p.eventsCount + p.achievementsCount}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
            <div className="card">
              <div className="card-header">
                <h3>⚡ Быстрые действия</h3>
              </div>
              <div className="quick-actions">
                <Link to="/participants" className="quick-action">
                  <span className="quick-icon">👤</span>
                  <span className="quick-label">Добавить участника</span>
                </Link>
                <Link to="/events" className="quick-action">
                  <span className="quick-icon">📅</span>
                  <span className="quick-label">Создать мероприятие</span>
                </Link>
                <Link to="/mass-notifications" className="quick-action">
                  <span className="quick-icon">📨</span>
                  <span className="quick-label">Сделать рассылку</span>
                </Link>
                <Link to="/reports" className="quick-action">
                  <span className="quick-icon">📊</span>
                  <span className="quick-label">Создать отчёт</span>
                </Link>
                <Link to="/clubs-management" className="quick-action">
                  <span className="quick-icon">🏫</span>
                  <span className="quick-label">Управление КЮДами</span>
                </Link>
                <Link to="/tasks-planner" className="quick-action">
                  <span className="quick-icon">📋</span>
                  <span className="quick-label">Задачи</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        .crm-page {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .crm-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        /* ===== ЗАГОЛОВОК ===== */
        .crm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px 28px;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .crm-header-left h1 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #0A1628;
          margin: 0;
        }

        .crm-header-left p {
          font-size: 14px;
          color: #8A8480;
          margin: 4px 0 0 0;
        }

        .crm-header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* ===== КНОПКИ ===== */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: #0A1628;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
          min-height: 44px;
        }
        .btn-primary:hover {
          background: #1A3555;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.25);
        }

        .btn-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
          font-family: 'Inter', sans-serif;
          min-height: 44px;
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        /* ===== СТАТИСТИКА ===== */
        .crm-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 20px 24px;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.08);
        }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #0A1628;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 13px;
          color: #8A8480;
          margin-top: 4px;
        }

        .stat-change {
          font-size: 12px;
          color: #16845B;
          margin-top: 4px;
        }

        /* ===== СЕТКА ===== */
        .crm-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .crm-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .crm-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ===== КАРТОЧКИ ===== */
        .card {
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0A1628;
          margin: 0;
        }

        .card-link {
          font-size: 13px;
          color: #174A7E;
          text-decoration: none;
        }

        .card-link:hover {
          color: #C9A227;
        }

        .empty-text {
          color: #98A2B3;
          font-size: 14px;
          text-align: center;
          padding: 16px 0;
        }

        /* ===== МЕРОПРИЯТИЯ ===== */
        .event-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .event-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          background: #F8FAFC;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .event-item:hover {
          background: #F4F6F9;
        }

        .event-date {
          font-size: 12px;
          font-weight: 600;
          color: #174A7E;
          min-width: 50px;
        }

        .event-info {
          flex: 1;
          min-width: 0;
        }

        .event-title {
          font-size: 14px;
          font-weight: 500;
          color: #0A1628;
        }

        .event-meta {
          font-size: 12px;
          color: #98A2B3;
        }

        .event-link {
          font-size: 18px;
          color: #A8A29A;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .event-link:hover {
          color: #C9A227;
        }

        /* ===== АКТИВНОСТЬ ===== */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #F4F6F9;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-message {
          font-size: 13px;
          color: #0A1628;
        }

        .activity-date {
          font-size: 11px;
          color: #98A2B3;
          margin-top: 2px;
        }

        /* ===== ТОП УЧАСТНИКОВ ===== */
        .top-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .top-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: #F8FAFC;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .top-item:hover {
          background: #F4F6F9;
        }

        .top-rank {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .top-info {
          flex: 1;
          min-width: 0;
        }

        .top-name {
          font-size: 14px;
          font-weight: 500;
          color: #0A1628;
        }

        .top-meta {
          font-size: 12px;
          color: #98A2B3;
        }

        .top-score {
          font-size: 13px;
          font-weight: 600;
          color: #C9A227;
        }

        /* ===== БЫСТРЫЕ ДЕЙСТВИЯ ===== */
        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .quick-action {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #F8FAFC;
          border-radius: 8px;
          text-decoration: none;
          color: #0A1628;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .quick-action:hover {
          background: #F4F6F9;
          border-color: #C9A227;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(10,22,40,0.06);
        }

        .quick-icon {
          font-size: 20px;
        }

        .quick-label {
          font-size: 13px;
          font-weight: 500;
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .crm-container {
            padding: 20px 24px 32px;
          }

          .crm-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .crm-container {
            padding: 16px;
          }

          .crm-header {
            flex-direction: column;
            align-items: stretch;
          }

          .crm-header-actions {
            flex-direction: column;
          }

          .crm-header-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .crm-stats {
            grid-template-columns: 1fr 1fr;
          }

          .stat-number {
            font-size: 26px;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .event-item {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 480px) {
          .crm-container {
            padding: 12px;
          }

          .crm-stats {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .stat-card {
            padding: 14px 16px;
          }

          .stat-number {
            font-size: 22px;
          }

          .card {
            padding: 16px;
          }

          .top-item {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}