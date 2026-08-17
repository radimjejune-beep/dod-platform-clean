// frontend/src/pages/Dashboard.jsx — ОБНОВЛЕННЫЙ

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    clubs: 0,
    events: 0,
    participants: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const user = await api.getMe();
        setProfile(user);

        const [users, clubs, events, participants] = await Promise.all([
          api.getUsers().catch(() => []),
          api.getClubs().catch(() => []),
          api.getEvents().catch(() => []),
          api.getParticipants().catch(() => [])
        ]);

        setStats({
          users: users.length || 0,
          clubs: clubs.length || 0,
          events: events.length || 0,
          participants: participants.length || 0
        });

      } catch (err) {
        console.error('Ошибка загрузки:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const role = profile?.role || 'user';

  const quickActions = {
    admin: [
      { path: '/admin/users', label: 'Пользователи', icon: '👥' },
      { path: '/clubs', label: 'КЮДы', icon: '🏫' },
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/participants', label: 'Участники', icon: '👤' },
      { path: '/achievements', label: 'Достижения', icon: '🏆' },
      { path: '/reports', label: 'Отчёты', icon: '📋' },
      { path: '/analytics', label: 'Аналитика', icon: '📊' },
    ],
    club_coordinator: [
      { path: '/clubs', label: 'Мой КЮД', icon: '🏫' },
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/participants', label: 'Участники', icon: '👤' },
      { path: '/manage-achievements', label: 'Достижения', icon: '🏆' },
      { path: '/reports', label: 'Отчёты', icon: '📋' },
      { path: '/appeals', label: 'Обращения', icon: '📨' },
    ],
    participant: [
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/calendar', label: 'Календарь', icon: '📆' },
      { path: '/my-achievements', label: 'Достижения', icon: '🏆' },
      { path: '/my-reviews', label: 'Оценки', icon: '📊' },
    ],
    tutor: [
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/participants', label: 'Участники', icon: '👤' },
      { path: '/achievements', label: 'Достижения', icon: '🏆' },
      { path: '/my-reviews', label: 'Оценки', icon: '📊' },
      { path: '/my-journal', label: 'Журнал', icon: '📓' },
    ],
    parent: [
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/calendar', label: 'Календарь', icon: '📆' },
      { path: '/my-achievements', label: 'Достижения', icon: '🏆' },
    ],
    president: [
      { path: '/clubs', label: 'КЮДы', icon: '🏫' },
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/participants', label: 'Участники', icon: '👤' },
      { path: '/president-tasks', label: 'Задания', icon: '👑' },
      { path: '/club-rating', label: 'Рейтинг', icon: '🏆' },
    ],
  };

  const actions = quickActions[role] || quickActions.participant;

  return (
    <div className="dashboard">
      {/* ПРИВЕТСТВИЕ */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <h1>Привет, {profile?.full_name || 'Пользователь'} 👋</h1>
          <p>Добро пожаловать в платформу «Дипломаты будущего»</p>
        </div>
        <div className="dashboard-welcome-role">
          <span className="dashboard-role-badge">{role}</span>
        </div>
      </div>

      {/* СТАТИСТИКА */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.participants}</div>
          <div className="stat-label">Участников</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.clubs}</div>
          <div className="stat-label">Клубов</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.events}</div>
          <div className="stat-label">Мероприятий</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.users}</div>
          <div className="stat-label">Пользователей</div>
        </div>
      </div>

      {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div className="dashboard-actions">
        <h2 className="dashboard-section-title">Быстрые действия</h2>
        <div className="quick-actions-grid">
          {actions.map((action) => (
            <Link key={action.path} to={action.path} className="quick-action-card">
              <span className="icon">{action.icon}</span>
              <span className="label">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ПРОФИЛЬ */}
      {profile && (
        <div className="dashboard-profile-card">
          <h2 className="dashboard-section-title">Ваш профиль</h2>
          <div className="dashboard-profile-info">
            <div className="profile-info-item">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{profile.email}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Роль</span>
              <span className="profile-info-value">{profile.role}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Статус</span>
              <span className="profile-info-value badge badge-active">Активен</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0;
          width: 100%;
        }

        .dashboard-welcome {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
          padding: 24px 28px;
          background: linear-gradient(135deg, #0A1628, #1A3555);
          border-radius: 12px;
          color: white;
          width: 100%;
        }

        .dashboard-welcome-content h1 {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
          color: white;
        }

        .dashboard-welcome-content p {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          margin: 0;
        }

        .dashboard-role-badge {
          display: inline-block;
          padding: 4px 16px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #E8D9A8;
          text-transform: capitalize;
        }

        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
          width: 100%;
        }

        .dashboard-actions {
          margin-bottom: 28px;
          width: 100%;
        }

        .dashboard-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
          margin-bottom: 16px;
        }

        .dashboard-profile-card {
          background: white;
          padding: 24px 28px;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10, 22, 40, 0.06);
          width: 100%;
        }

        .dashboard-profile-info {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 12px;
        }

        .profile-info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .profile-info-label {
          font-size: 12px;
          font-weight: 500;
          color: #A8A29A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .profile-info-value {
          font-size: 14px;
          font-weight: 500;
          color: #0A1628;
        }

        .badge {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .badge-active {
          background: #E8F5EF;
          color: #1A7A4C;
        }

        /* ============================================================
           БЫСТРЫЕ ДЕЙСТВИЯ — ПРЕМИАЛЬНЫЕ КАРТОЧКИ
           ============================================================ */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }

        .quick-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10, 22, 40, 0.04);
          text-decoration: none;
          color: #0A1628;
          transition: all 0.3s ease;
          min-height: 100px;
          text-align: center;
          cursor: pointer;
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(10, 22, 40, 0.10);
          border-color: #C9A227;
        }

        .quick-action-card .icon {
          font-size: 28px;
          line-height: 1;
        }

        .quick-action-card .label {
          font-size: 13px;
          font-weight: 500;
          color: #6B6561;
          line-height: 1.3;
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .quick-actions-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .dashboard-welcome {
            padding: 18px 20px;
            flex-direction: column;
            align-items: flex-start;
          }
          .dashboard-welcome-content h1 {
            font-size: 22px;
          }
          .dashboard-stats {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .stat-number {
            font-size: 26px;
          }
          .stat-card {
            padding: 16px 18px;
          }
          .quick-actions-grid {
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 12px;
          }
          .quick-action-card {
            padding: 16px 10px;
            min-height: 80px;
          }
          .quick-action-card .icon {
            font-size: 24px;
          }
          .quick-action-card .label {
            font-size: 12px;
          }
          .dashboard-profile-card {
            padding: 18px 20px;
          }
          .dashboard-profile-info {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .dashboard-welcome {
            padding: 14px 16px;
          }
          .dashboard-welcome-content h1 {
            font-size: 18px;
          }
          .dashboard-welcome-content p {
            font-size: 13px;
          }
          .dashboard-stats {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .stat-number {
            font-size: 22px;
          }
          .stat-card {
            padding: 12px 14px;
            border-radius: 8px;
          }
          .stat-label {
            font-size: 11px;
          }
          .dashboard-section-title {
            font-size: 17px;
          }
          .quick-actions-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .quick-action-card {
            padding: 12px 8px;
            min-height: 70px;
            border-radius: 8px;
          }
          .quick-action-card .icon {
            font-size: 20px;
          }
          .quick-action-card .label {
            font-size: 11px;
          }
          .dashboard-profile-card {
            padding: 14px 16px;
          }
        }
      `}</style>
    </div>
  );
}