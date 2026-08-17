// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMenuItems } from '../hooks/useMenuItems';
import api from '../lib/api';

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

  const navigate = useNavigate();

  // ============================================================
  // ЕДИНОЕ МЕНЮ (ОБЩЕЕ С НАВИГАЦИЕЙ)
  // ============================================================
  const menuItems = useMenuItems(profile);

  // Вкладки — это те же пункты меню
  const tabs = menuItems;

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

        // Если активная вкладка не существует в меню — сбрасываем на дашборд
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
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );
  }

  // ============================================================
  // РЕНДЕР КОНТЕНТА ВКЛАДКИ
  // ============================================================
  const renderTabContent = () => {
    // Если вкладка не найдена — показываем общий контент
    return (
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
            <h4 className="card-title">Статистика</h4>
            <div className="dashboard-mini-stats">
              <div>
                <span className="stat-number" style={{ fontSize: '24px' }}>{stats.events}</span>
                <span className="stat-label">Мероприятий</span>
              </div>
              <div>
                <span className="stat-number" style={{ fontSize: '24px' }}>{stats.participants}</span>
                <span className="stat-label">Участников</span>
              </div>
              <div>
                <span className="stat-number" style={{ fontSize: '24px' }}>{stats.achievements}</span>
                <span className="stat-label">Достижений</span>
              </div>
              <div>
                <span className="stat-number" style={{ fontSize: '24px' }}>{stats.clubs}</span>
                <span className="stat-label">Клубов</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="card-title">Быстрый доступ</h4>
            <div className="quick-actions-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {tabs.slice(0, 6).map((tab) => (
                <Link key={tab.id} to={tab.path} className="quick-action-card" style={{ padding: '12px', minHeight: '60px' }}>
                  <span className="label" style={{ fontSize: '12px' }}>{tab.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

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

      {/* ВКЛАДКИ — ТЕ ЖЕ, ЧТО И В НАВИГАЦИИ */}
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

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .quick-action-card {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: #F8F6F2;
          border-radius: 8px;
          text-decoration: none;
          color: #0A1628;
          transition: all 0.3s ease;
          text-align: center;
          cursor: pointer;
          min-height: 50px;
          font-size: 13px;
          font-weight: 500;
        }

        .quick-action-card:hover {
          background: #FBF4DC;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(10,22,40,0.06);
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

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
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

          .dashboard-tab {
            padding: 6px 14px;
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
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}