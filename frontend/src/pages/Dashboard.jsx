// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMenuItems } from '../hooks/useMenuItems';
import api from '../lib/api';
import Footer from '../components/Footer';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: 0,
    clubs: 0,
    events: 0,
    participants: 0,
    achievements: 0,
  });
  const [club, setClub] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentParticipants, setRecentParticipants] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);

  const navigate = useNavigate();

  // ============================================================
  // ЕДИНОЕ МЕНЮ (ОБЩЕЕ С НАВИГАЦИЕЙ)
  // ============================================================
  const menuItems = useMenuItems(profile);
  const tabs = menuItems;

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================================
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

        const clubsData = await api.getClubs().catch(() => []);
        let userClub = null;
        if (user.club_id) {
          userClub = clubsData.find(c => c.id === user.club_id);
        }
        if (!userClub && user.role === 'club_coordinator') {
          userClub = clubsData.find(c => c.coordinator_id === user.id || c.leader_id === user.id);
        }
        setClub(userClub);

        const [users, clubs, events, participants, achievements] = await Promise.all([
          api.getUsers().catch(() => []),
          api.getClubs().catch(() => []),
          api.getEvents().catch(() => []),
          api.getParticipants().catch(() => []),
          api.getAchievements().catch(() => []),
        ]);

        setStats({
          users: users.length || 0,
          clubs: clubs.length || 0,
          events: events.length || 0,
          participants: participants.length || 0,
          achievements: achievements.length || 0,
        });

        setRecentEvents(events.slice(0, 5));
        setRecentParticipants(participants.slice(0, 5));
        setRecentAchievements(achievements.slice(0, 5));

        // Если активная вкладка не существует — сбрасываем на первую
        const tabExists = tabs.some(t => t.id === activeTab);
        if (!tabExists && tabs.length > 0) {
          setActiveTab(tabs[0].id);
        }

      } catch (err) {
        console.error('Ошибка загрузки:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, tabs, activeTab]);

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

  // ============================================================
  // БЫСТРЫЕ ДЕЙСТВИЯ ПО РОЛИ
  // ============================================================
  const getQuickActions = () => {
    const role = profile?.role;
    const actions = [];

    if (role === 'admin') {
      actions.push(
        { path: '/admin/users', label: 'Пользователи', icon: '👥' },
        { path: '/clubs', label: 'КЮДы', icon: '🏫' },
        { path: '/events', label: 'Мероприятия', icon: '📅' },
        { path: '/participants', label: 'Участники', icon: '👤' },
        { path: '/achievements', label: 'Достижения', icon: '🏆' },
        { path: '/reports', label: 'Отчёты', icon: '📋' },
        { path: '/analytics', label: 'Аналитика', icon: '📊' },
        { path: '/appeals', label: 'Обращения', icon: '📨' },
      );
    }

    if (role === 'club_coordinator') {
      actions.push(
        { path: '/clubs', label: 'Мой КЮД', icon: '🏫' },
        { path: '/events', label: 'Мероприятия', icon: '📅' },
        { path: '/participants', label: 'Участники', icon: '👤' },
        { path: '/manage-achievements', label: 'Достижения', icon: '🏆' },
        { path: '/reports', label: 'Отчёты', icon: '📋' },
        { path: '/appeals', label: 'Обращения', icon: '📨' },
      );
      if (club) {
        actions.push(
          { path: `/club/${club.id}/president`, label: 'Назначить президента', icon: '👑' },
        );
      }
    }

    if (role === 'participant') {
      actions.push(
        { path: '/events', label: 'Мероприятия', icon: '📅' },
        { path: '/calendar', label: 'Календарь', icon: '📆' },
        { path: '/my-achievements', label: 'Достижения', icon: '🏆' },
        { path: '/my-reviews', label: 'Оценки', icon: '📊' },
      );
    }

    if (role === 'tutor') {
      actions.push(
        { path: '/events', label: 'Мероприятия', icon: '📅' },
        { path: '/participants', label: 'Участники', icon: '👤' },
        { path: '/achievements', label: 'Достижения', icon: '🏆' },
        { path: '/my-reviews', label: 'Оценки', icon: '📊' },
        { path: '/my-journal', label: 'Журнал', icon: '📓' },
      );
    }

    if (role === 'president' || role === 'vice_president') {
      actions.push(
        { path: '/clubs', label: 'КЮДы', icon: '🏫' },
        { path: '/events', label: 'Мероприятия', icon: '📅' },
        { path: '/participants', label: 'Участники', icon: '👤' },
        { path: '/president-tasks', label: 'Задания', icon: '👑' },
      );
    }

    if (role === 'parent') {
      actions.push(
        { path: '/events', label: 'Мероприятия', icon: '📅' },
        { path: '/calendar', label: 'Календарь', icon: '📆' },
        { path: '/my-achievements', label: 'Достижения детей', icon: '🏆' },
      );
    }

    return actions;
  };

  const quickActions = getQuickActions();

  // ============================================================
  // РЕНДЕР КОНТЕНТА ВКЛАДКИ
  // ============================================================
  const renderTabContent = () => {
    const activeTabData = tabs.find(t => t.id === activeTab);

    if (!activeTabData || activeTab === 'dashboard') {
      return renderOverview();
    }

    return (
      <div className="dashboard-tab-content">
        <div className="dashboard-tab-page">
          <div className="tab-header">
            <h3 className="tab-title">{activeTabData.label}</h3>
            <Link to={activeTabData.path} className="btn btn-primary btn-sm">
              Перейти к разделу →
            </Link>
          </div>
          <div className="card tab-card">
            <p className="tab-hint">
              Перейдите на страницу «{activeTabData.label}» для полного доступа
            </p>
            <Link to={activeTabData.path} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              Открыть {activeTabData.label.toLowerCase()}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ВКЛАДКА: ОБЗОР (ГЛАВНАЯ СТРАНИЦА ДАШБОРДА)
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
          {club && (
            <div className="profile-info-item">
              <span className="profile-info-label">КЮД</span>
              <span className="profile-info-value">{club.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <h4 className="card-title">Статистика платформы</h4>
          <div className="dashboard-mini-stats">
            <div>
              <span className="stat-number">{stats.events}</span>
              <span className="stat-label">Мероприятий</span>
            </div>
            <div>
              <span className="stat-number">{stats.participants}</span>
              <span className="stat-label">Участников</span>
            </div>
            <div>
              <span className="stat-number">{stats.achievements}</span>
              <span className="stat-label">Достижений</span>
            </div>
            <div>
              <span className="stat-number">{stats.clubs}</span>
              <span className="stat-label">Клубов</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="card-title">Быстрые действия</h4>
          <div className="quick-actions-grid">
            {quickActions.slice(0, 6).map((action) => (
              <Link key={action.path} to={action.path} className="quick-action-card">
                <span className="quick-icon">{action.icon}</span>
                <span className="quick-label">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      {/* ПРИВЕТСТВИЕ */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <h1>Привет, {profile?.full_name || 'Пользователь'} 👋</h1>
          <p>Добро пожаловать в платформу «Дипломаты будущего»</p>
        </div>
        <div className="dashboard-welcome-role">
          <span className="dashboard-role-badge">{profile?.role}</span>
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

      {/* ВКЛАДКИ — ТЕ ЖЕ, ЧТО В МЕНЮ */}
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

      <Footer />

      <style>{`
        /* ============================================================
           ОСНОВНЫЕ СТИЛИ
           ============================================================ */
        .dashboard-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
          background: #F0EDE8;
          min-height: 100vh;
        }

        /* ============================================================
           ПРИВЕТСТВИЕ
           ============================================================ */
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
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .dashboard-role-badge {
          display: inline-block;
          padding: 4px 16px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #E8D9A8;
          text-transform: capitalize;
        }

        /* ============================================================
           СТАТИСТИКА
           ============================================================ */
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
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

        /* ============================================================
           ВКЛАДКИ
           ============================================================ */
        .dashboard-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E4DFD8;
          padding-bottom: 4px;
          flex-wrap: wrap;
          background: white;
          padding: 4px 4px 0 4px;
          border-radius: 12px 12px 0 0;
          border: 1px solid #E4DFD8;
          border-bottom: none;
        }

        .dashboard-tab {
          padding: 10px 20px;
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
          position: relative;
        }

        .dashboard-tab.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #C9A227;
        }

        /* ============================================================
           КОНТЕНТ ВКЛАДКИ
           ============================================================ */
        .dashboard-tab-content {
          width: 100%;
        }

        .dashboard-tab-page {
          width: 100%;
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .tab-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
          margin: 0;
        }

        .tab-card {
          padding: 24px;
          text-align: center;
        }

        .tab-hint {
          color: #98A2B3;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .dashboard-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
          margin-bottom: 16px;
        }

        /* ============================================================
           КАРТОЧКИ
           ============================================================ */
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

        /* ============================================================
           ПРОФИЛЬ В ДАШБОРДЕ
           ============================================================ */
        .dashboard-profile-card {
          background: white;
          padding: 24px 28px;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
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

        /* ============================================================
           СЕТКА
           ============================================================ */
        .dashboard-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .dashboard-mini-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .dashboard-mini-stats div {
          text-align: center;
          padding: 12px;
          background: #F8F6F2;
          border-radius: 8px;
        }

        .dashboard-mini-stats .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #0A1628;
          display: block;
        }

        .dashboard-mini-stats .stat-label {
          font-size: 12px;
          color: #8A8480;
        }

        /* ============================================================
           БЫСТРЫЕ ДЕЙСТВИЯ
           ============================================================ */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .quick-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          text-decoration: none;
          color: #0A1628;
          transition: all 0.3s ease;
          min-height: 80px;
          text-align: center;
          cursor: pointer;
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.10);
          border-color: #C9A227;
        }

        .quick-icon {
          font-size: 24px;
          line-height: 1;
        }

        .quick-label {
          font-size: 13px;
          font-weight: 500;
          color: #6B6561;
          line-height: 1.3;
        }

        /* ============================================================
           КНОПКИ
           ============================================================ */
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

        .btn-gold {
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          box-shadow: 0 2px 16px rgba(201, 162, 39, 0.25);
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
        }

        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
        }

        /* ============================================================
           СПИННЕР
           ============================================================ */
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

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .dashboard-page {
            padding: 20px 24px 32px;
          }
          .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .dashboard-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-page {
            padding: 16px;
          }

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

          .dashboard-tab {
            padding: 8px 14px;
            font-size: 13px;
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

          .dashboard-mini-stats {
            grid-template-columns: 1fr 1fr;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          }
        }

        @media (max-width: 480px) {
          .dashboard-page {
            padding: 12px;
          }

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
            padding: 6px 10px;
            font-size: 12px;
          }

          .dashboard-section-title {
            font-size: 17px;
          }

          .dashboard-profile-card {
            padding: 14px 16px;
          }

          .card {
            padding: 12px 14px;
          }

          .dashboard-mini-stats {
            grid-template-columns: 1fr;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .quick-action-card {
            padding: 12px 8px;
            min-height: 60px;
          }
          .quick-icon {
            font-size: 20px;
          }
          .quick-label {
            font-size: 11px;
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

          .tab-header {
            flex-direction: column;
            align-items: stretch;
          }
          .tab-header .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}