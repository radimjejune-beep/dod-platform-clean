// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState({
    users: 0,
    clubs: 0,
    events: 0,
    participants: 0,
    achievements: 0,
    appeals: 0,
    reports: 0,
  });

  const [recentEvents, setRecentEvents] = useState([]);
  const [recentParticipants, setRecentParticipants] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [recentAppeals, setRecentAppeals] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

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

        const [users, clubs, events, participants, achievements, appeals, reports] = await Promise.all([
          api.getUsers().catch(() => []),
          api.getClubs().catch(() => []),
          api.getEvents().catch(() => []),
          api.getParticipants().catch(() => []),
          api.getAchievements().catch(() => []),
          api.getAppeals().catch(() => []),
          api.getReports().catch(() => []),
        ]);

        setStats({
          users: users.length || 0,
          clubs: clubs.length || 0,
          events: events.length || 0,
          participants: participants.length || 0,
          achievements: achievements.length || 0,
          appeals: appeals.length || 0,
          reports: reports.length || 0,
        });

        setRecentEvents(events.slice(0, 5));
        setRecentParticipants(participants.slice(0, 5));
        setRecentAchievements(achievements.slice(0, 5));
        setRecentAppeals(appeals.slice(0, 5));
        setRecentReports(reports.slice(0, 5));
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
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );
  }

  const role = profile?.role || 'user';
  const isPresident = profile?.is_president || false;

  // ============================================================
  // ВКЛАДКИ В ЗАВИСИМОСТИ ОТ РОЛИ
  // ============================================================
  const getTabs = () => {
    const tabs = [];

    // Обзор есть у всех
    tabs.push({ id: 'overview', label: 'Обзор' });

    // Мероприятия есть у всех
    tabs.push({ id: 'events', label: 'Мероприятия' });

    // Участники
    if (['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'participants', label: 'Участники' });
    }

    // Достижения
    if (['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'achievements', label: 'Достижения' });
    }

    // Клубы
    if (['admin', 'movement_coordinator', 'president', 'vice_president', 'club_coordinator'].includes(role)) {
      tabs.push({ id: 'clubs', label: 'КЮДы' });
    }

    // Отчёты
    if (['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'reports', label: 'Отчёты' });
    }

    // Обращения
    if (['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'appeals', label: 'Обращения' });
    }

    // Аналитика
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'analytics', label: 'Аналитика' });
    }

    // Задания президента
    if (role === 'participant' && isPresident) {
      tabs.push({ id: 'president-tasks', label: 'Задания' });
    }
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'president-tasks', label: 'Задания' });
    }

    // Рейтинг
    if (['admin', 'movement_coordinator', 'president', 'vice_president', 'club_coordinator'].includes(role)) {
      tabs.push({ id: 'rating', label: 'Рейтинг' });
    }

    // Документы
    if (['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'].includes(role)) {
      tabs.push({ id: 'documents', label: 'Документы' });
    }

    // Пользователи (только админ)
    if (role === 'admin') {
      tabs.push({ id: 'users', label: 'Пользователи' });
    }

    // Быстрые действия есть у всех
    tabs.push({ id: 'actions', label: 'Быстрые действия' });

    return tabs;
  };

  const tabs = getTabs();

  // ============================================================
  // БЫСТРЫЕ ДЕЙСТВИЯ ПО РОЛИ
  // ============================================================
  const quickActions = {
    admin: [
      { path: '/admin/users', label: 'Пользователи', icon: '👥' },
      { path: '/clubs', label: 'КЮДы', icon: '🏫' },
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/participants', label: 'Участники', icon: '👤' },
      { path: '/achievements', label: 'Достижения', icon: '🏆' },
      { path: '/reports', label: 'Отчёты', icon: '📋' },
      { path: '/analytics', label: 'Аналитика', icon: '📊' },
      { path: '/appeals', label: 'Обращения', icon: '📨' },
      { path: '/documents-center', label: 'Документы', icon: '📁' },
    ],
    club_coordinator: [
      { path: '/clubs', label: 'Мой КЮД', icon: '🏫' },
      { path: '/events', label: 'Мероприятия', icon: '📅' },
      { path: '/participants', label: 'Участники', icon: '👤' },
      { path: '/manage-achievements', label: 'Достижения', icon: '🏆' },
      { path: '/reports', label: 'Отчёты', icon: '📋' },
      { path: '/appeals', label: 'Обращения', icon: '📨' },
      { path: '/documents-center', label: 'Документы', icon: '📁' },
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

  // ============================================================
  // РЕНДЕР КОНТЕНТА ВКЛАДКИ
  // ============================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'events':
        return renderEvents();
      case 'participants':
        return renderParticipants();
      case 'achievements':
        return renderAchievements();
      case 'clubs':
        return renderClubs();
      case 'reports':
        return renderReports();
      case 'appeals':
        return renderAppeals();
      case 'analytics':
        return renderAnalytics();
      case 'president-tasks':
        return renderPresidentTasks();
      case 'rating':
        return renderRating();
      case 'documents':
        return renderDocuments();
      case 'users':
        return renderUsers();
      case 'actions':
        return renderActions();
      default:
        return renderOverview();
    }
  };

  // ============================================================
  // КОМПОНЕНТЫ ВКЛАДОК
  // ============================================================

  const renderOverview = () => (
    <div className="dashboard-tab-content">
      <div className="dashboard-profile-card">
        <h3 className="dashboard-section-title">Ваш профиль</h3>
        <div className="dashboard-profile-info">
          <div className="profile-info-item">
            <span className="profile-info-label">Email</span>
            <span className="profile-info-value">{profile?.email}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label">Роль</span>
            <span className="profile-info-value">{profile?.role}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label">Статус</span>
            <span className="profile-info-value badge badge-active">Активен</span>
          </div>
          {profile?.club_name && (
            <div className="profile-info-item">
              <span className="profile-info-label">КЮД</span>
              <span className="profile-info-value">{profile.club_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <h4 className="card-title">Последние мероприятия</h4>
          {recentEvents.length === 0 ? (
            <p className="text-muted">Нет мероприятий</p>
          ) : (
            <ul className="dashboard-list">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <span className="list-title">{e.title}</span>
                  <span className="list-meta">{new Date(e.event_date).toLocaleDateString('ru-RU')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h4 className="card-title">Последние участники</h4>
          {recentParticipants.length === 0 ? (
            <p className="text-muted">Нет участников</p>
          ) : (
            <ul className="dashboard-list">
              {recentParticipants.map((p) => (
                <li key={p.id}>
                  <span className="list-title">{p.full_name}</span>
                  <span className="list-meta">{p.role || 'Участник'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Все мероприятия</h3>
        <Link to="/events" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        {recentEvents.length === 0 ? (
          <p className="text-muted">Мероприятий пока нет</p>
        ) : (
          <ul className="dashboard-list">
            {recentEvents.map((e) => (
              <li key={e.id}>
                <span className="list-title">{e.title}</span>
                <span className="list-meta">{new Date(e.event_date).toLocaleDateString('ru-RU')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderParticipants = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Все участники</h3>
        <Link to="/participants" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        {recentParticipants.length === 0 ? (
          <p className="text-muted">Участников пока нет</p>
        ) : (
          <ul className="dashboard-list">
            {recentParticipants.map((p) => (
              <li key={p.id}>
                <span className="list-title">{p.full_name}</span>
                <span className="list-meta">{p.role || 'Участник'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Последние достижения</h3>
        <Link to="/achievements" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        {recentAchievements.length === 0 ? (
          <p className="text-muted">Достижений пока нет</p>
        ) : (
          <ul className="dashboard-list">
            {recentAchievements.map((a) => (
              <li key={a.id}>
                <span className="list-title">{a.title}</span>
                <span className="list-meta">{a.participant_name || 'Участник'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderClubs = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">КЮДы</h3>
        <Link to="/clubs" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        <p className="text-muted">Управление клубами юных дипломатов</p>
        <div style={{ marginTop: '12px' }}>
          <span className="stat-number" style={{ fontSize: '28px' }}>{stats.clubs}</span>
          <span className="stat-label" style={{ marginLeft: '8px' }}>всего клубов</span>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Отчёты</h3>
        <Link to="/reports" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        {recentReports.length === 0 ? (
          <p className="text-muted">Отчётов пока нет</p>
        ) : (
          <ul className="dashboard-list">
            {recentReports.map((r) => (
              <li key={r.id}>
                <span className="list-title">{r.title}</span>
                <span className="list-meta">{r.status || 'Черновик'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderAppeals = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Обращения</h3>
        <Link to="/appeals" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        {recentAppeals.length === 0 ? (
          <p className="text-muted">Обращений пока нет</p>
        ) : (
          <ul className="dashboard-list">
            {recentAppeals.map((a) => (
              <li key={a.id}>
                <span className="list-title">{a.subject}</span>
                <span className="list-meta">{a.status || 'Ожидает'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Аналитика</h3>
        <Link to="/analytics" className="btn btn-primary btn-sm">Перейти</Link>
      </div>
      <div className="dashboard-grid-2">
        <div className="card">
          <h4 className="card-title">Статистика</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div><span className="stat-number" style={{ fontSize: '24px' }}>{stats.events}</span><span className="stat-label" style={{ display: 'block' }}>Мероприятий</span></div>
            <div><span className="stat-number" style={{ fontSize: '24px' }}>{stats.participants}</span><span className="stat-label" style={{ display: 'block' }}>Участников</span></div>
            <div><span className="stat-number" style={{ fontSize: '24px' }}>{stats.achievements}</span><span className="stat-label" style={{ display: 'block' }}>Достижений</span></div>
            <div><span className="stat-number" style={{ fontSize: '24px' }}>{stats.clubs}</span><span className="stat-label" style={{ display: 'block' }}>Клубов</span></div>
          </div>
        </div>
        <div className="card">
          <h4 className="card-title">Активность</h4>
          <p className="text-muted">Подробная аналитика доступна в разделе</p>
          <Link to="/analytics" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>Открыть аналитику</Link>
        </div>
      </div>
    </div>
  );

  const renderPresidentTasks = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Задания президента</h3>
        <Link to="/president-tasks" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        <p className="text-muted">Управление заданиями для президентов клубов</p>
        <Link to="/president-tasks" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>Перейти к заданиям</Link>
      </div>
    </div>
  );

  const renderRating = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Рейтинг</h3>
        <Link to="/club-rating" className="btn btn-primary btn-sm">Смотреть все</Link>
      </div>
      <div className="card">
        <p className="text-muted">Рейтинг участников и клубов</p>
        <Link to="/club-rating" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>Перейти к рейтингу</Link>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Центр документов</h3>
        <Link to="/documents-center" className="btn btn-primary btn-sm">Перейти</Link>
      </div>
      <div className="card">
        <p className="text-muted">Официальные документы и материалы</p>
        <Link to="/documents-center" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>Открыть центр документов</Link>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="dashboard-tab-content">
      <div className="flex-between mb-2">
        <h3 className="dashboard-section-title">Пользователи</h3>
        <Link to="/admin/users" className="btn btn-primary btn-sm">Управление</Link>
      </div>
      <div className="card">
        <p className="text-muted">Управление пользователями платформы</p>
        <div style={{ marginTop: '12px' }}>
          <span className="stat-number" style={{ fontSize: '28px' }}>{stats.users}</span>
          <span className="stat-label" style={{ marginLeft: '8px' }}>всего пользователей</span>
        </div>
        <Link to="/admin/users" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>Управление пользователями</Link>
      </div>
    </div>
  );

  const renderActions = () => (
    <div className="dashboard-tab-content">
      <h3 className="dashboard-section-title">Быстрые действия</h3>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <Link key={action.path} to={action.path} className="quick-action-card">
            <span className="icon">{action.icon}</span>
            <span className="label">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  // ============================================================
  // ОСНОВНОЙ РЕНДЕР
  // ============================================================
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
          <div className="stat-number">{stats.achievements}</div>
          <div className="stat-label">Достижений</div>
        </div>
      </div>

      {/* ВКЛАДКИ */}
      <div className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* КОНТЕНТ ВКЛАДКИ */}
      {renderTabContent()}

      <style>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0;
          width: 100%;
        }

        .dashboard-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
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

        .stat-card {
          background: white;
          padding: 22px 24px;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(135deg, #C9A227, #E8D9A8);
          opacity: 0.4;
          transition: opacity 0.3s ease;
        }

        .stat-card:hover {
          box-shadow: 0 8px 32px rgba(10,22,40,0.10);
          transform: translateY(-4px);
        }
        .stat-card:hover::before {
          opacity: 1;
        }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 700;
          color: #0A1628;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .stat-label {
          font-size: 13px;
          color: #8A8480;
          margin-top: 4px;
          font-weight: 400;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .dashboard-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E4DFD8;
          padding-bottom: 4px;
          flex-wrap: wrap;
        }

        .dashboard-tab {
          padding: 8px 20px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: #8A8480;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px 8px 0 0;
          font-family: 'Inter', sans-serif;
        }

        .dashboard-tab:hover {
          color: #0A1628;
          background: #F8F6F2;
        }

        .dashboard-tab.active {
          color: #0A1628;
          font-weight: 600;
          background: #FBF4DC;
        }

        .dashboard-tab-content {
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
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          width: 100%;
          margin-bottom: 24px;
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

        .dashboard-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          transition: all 0.3s ease;
        }

        .card:hover {
          box-shadow: 0 8px 32px rgba(10,22,40,0.08);
          transform: translateY(-2px);
        }

        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 600;
          color: #0A1628;
          margin-bottom: 12px;
        }

        .dashboard-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .dashboard-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #F0EDE8;
          flex-wrap: wrap;
          gap: 8px;
        }

        .dashboard-list li:last-child {
          border-bottom: none;
        }

        .list-title {
          font-weight: 500;
          color: #0A1628;
        }

        .list-meta {
          font-size: 13px;
          color: #8A8480;
        }

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
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-decoration: none;
          color: #0A1628;
          transition: all 0.3s ease;
          min-height: 100px;
          text-align: center;
          cursor: pointer;
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.10);
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

        .text-muted {
          color: #A8A29A;
        }

        .flex-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .mb-2 {
          margin-bottom: 16px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 22px;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          letter-spacing: 0.01em;
          min-height: 40px;
          min-width: 80px;
          white-space: nowrap;
        }

        .btn-primary {
          background: #0A1628;
          color: white;
          box-shadow: 0 4px 16px rgba(10,22,40,0.15);
        }
        .btn-primary:hover {
          background: #1A3555;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.25);
        }

        .btn-outline {
          background: transparent;
          color: #0A1628;
          border: 1.5px solid #C9A227;
          box-shadow: none;
        }
        .btn-outline:hover {
          background: #FBF4DC;
          transform: translateY(-2px);
        }

        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
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
          .dashboard-grid-2 {
            grid-template-columns: 1fr;
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

          .dashboard-tabs {
            gap: 2px;
          }
          .dashboard-tab {
            padding: 6px 14px;
            font-size: 13px;
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

          .card {
            padding: 16px 18px;
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

          .dashboard-tab {
            padding: 4px 10px;
            font-size: 12px;
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

          .card {
            padding: 12px 14px;
          }

          .btn {
            padding: 6px 12px;
            font-size: 12px;
            min-height: 32px;
            min-width: 50px;
          }
          .btn-sm {
            padding: 4px 10px;
            font-size: 11px;
            min-height: 26px;
            min-width: 40px;
          }
        }
      `}</style>
    </div>
  );
}