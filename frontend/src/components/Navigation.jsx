// frontend/src/components/Navigation.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Notifications from './Notifications';

export default function Navigation({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const isActive = (path) => location.pathname === path;
  const role = profile?.role || 'participant';

  // ============================================================
  // ВЫХОД
  // ============================================================
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  // ============================================================
  // АВАТАР
  // ============================================================
  const getAvatar = () => {
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="Аватар" className="nav-avatar" />;
    }
    const initial = profile?.full_name?.charAt(0) || '?';
    return (
      <div className="nav-avatar-letter">
        {initial.toUpperCase()}
      </div>
    );
  };

  // ============================================================
  // ГРУППИРОВКА ПУНКТОВ МЕНЮ
  // ============================================================
  const getMenuGroups = () => {
    const allGroups = {
      main: [
        { path: '/dashboard', label: '📊 Дашборд', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/participant-dashboard', label: '📊 Мой кабинет', roles: ['participant'] },
        { path: '/parent-dashboard', label: '📊 Кабинет родителя', roles: ['parent'] },
        { path: '/club-coordinator-dashboard', label: '📊 Управление клубом', roles: ['club_coordinator'] },
        { path: '/tutor-dashboard', label: '📊 Кабинет тьютора', roles: ['tutor'] },
      ],
      events: [
        { path: '/events', label: '📅 Мероприятия', roles: ['all'] },
        { path: '/calendar', label: '📅 Календарь', roles: ['all'] },
      ],
      participants: [
        { path: '/participants', label: '👥 Участники', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
      ],
      clubs: [
        { path: '/clubs', label: '🏫 КЮДы', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/club-analytics', label: '📊 Аналитика', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],
      achievements: [
        { path: '/achievements', label: '🏆 Достижения', roles: ['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/my-achievements', label: '🏆 Мои достижения', roles: ['participant', 'parent'] },
        { path: '/manage-achievements', label: '🏆 Управление', roles: ['admin', 'movement_coordinator', 'club_coordinator'] },
      ],
      reviews: [
        { path: '/my-reviews', label: '📊 Оценки', roles: ['all'] },
      ],
      reports: [
        { path: '/reports', label: '📋 Отчёты', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],
      analytics: [
        { path: '/analytics', label: '📊 Аналитика', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],
      tasks: [
        { path: '/president-tasks', label: '👑 Задания', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'participant'] },
      ],
      journal: [
        { path: '/my-journal', label: '📓 Журнал', roles: ['tutor'] },
      ],
      staff: [
        { path: '/staff', label: '👥 Сотрудники', roles: ['admin', 'movement_coordinator', 'club_coordinator'] },
        { path: '/staff-calendar', label: '📅 Календарь', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'] },
        { path: '/tutor-requests', label: '🤝 Запросы', roles: ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/tutor-invitations', label: '📨 Приглашения', roles: ['tutor', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],
      appeals: [
        { path: '/appeals', label: '📨 Обращения', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],
      settings: [
        { path: '/settings', label: '⚙️ Настройки', roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/invite', label: '🎫 Пригласить', roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/users', label: '👥 Пользователи', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/import-participants', label: '📥 Импорт', roles: ['admin', 'movement_coordinator'] },
      ],
    };

    const result = {};
    for (const [key, items] of Object.entries(allGroups)) {
      const filtered = items.filter(item => 
        item.roles.includes('all') || item.roles.includes(role)
      );
      if (filtered.length > 0) {
        result[key] = filtered;
      }
    }
    return result;
  };

  const menuGroups = getMenuGroups();

  // ============================================================
  // НАЗВАНИЯ ГРУПП
  // ============================================================
  const groupLabels = {
    main: '🏠',
    events: '📅',
    participants: '👥',
    clubs: '🏫',
    achievements: '🏆',
    reviews: '📊',
    reports: '📋',
    analytics: '📊',
    tasks: '👑',
    journal: '📓',
    staff: '👥',
    appeals: '📨',
    settings: '⚙️',
  };

  // ============================================================
  // ЗАКРЫТИЕ ДРОПДАУНА
  // ============================================================
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav className="nav-compact">
      <div className="nav-compact-container">
        {/* ЛОГОТИП */}
        <Link to="/" className="nav-compact-logo">
          <span>🌍</span>
          <span>ДОД</span>
        </Link>

        {/* ОСНОВНЫЕ ПУНКТЫ (всегда видны) */}
        <div className="nav-compact-main">
          {menuGroups.main?.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-compact-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* ВЫПАДАЮЩИЕ ГРУППЫ */}
        <div className="nav-compact-groups">
          {Object.entries(menuGroups).map(([key, items]) => {
            if (key === 'main') return null;
            
            const isOpen = openDropdown === key;
            const hasActive = items.some(item => isActive(item.path));
            const icon = groupLabels[key] || '📌';
            
            return (
              <div 
                key={key} 
                className="nav-compact-dropdown"
                onMouseEnter={() => setOpenDropdown(key)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  className={`nav-compact-dropdown-btn ${hasActive ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(isOpen ? null : key)}
                >
                  <span>{icon}</span>
                  <span className="nav-compact-dropdown-arrow">▾</span>
                </button>
                {isOpen && (
                  <div className="nav-compact-dropdown-menu">
                    {items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-compact-dropdown-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => setOpenDropdown(null)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ПРАВАЯ ЧАСТЬ */}
        <div className="nav-compact-right">
          {/* ===== УВЕДОМЛЕНИЯ ===== */}
          <Notifications profile={profile} />
          
          {/* ===== ПРОФИЛЬ ===== */}
          <Link to="/profile" className="nav-compact-profile">
            {getAvatar()}
            <span className="nav-compact-name">
              {profile?.full_name?.split(' ')[0] || 'Профиль'}
            </span>
          </Link>

          {/* ===== ВЫХОД ===== */}
          <button className="nav-compact-logout" onClick={handleLogout} title="Выйти">
            🚪
          </button>

          {/* ===== БУРГЕР (МОБИЛЬНАЯ ВЕРСИЯ) ===== */}
          <button 
            className="nav-compact-burger" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ===== МОБИЛЬНОЕ МЕНЮ ===== */}
      {isMobileMenuOpen && (
        <div className="nav-compact-mobile">
          {Object.entries(menuGroups).map(([key, items]) => {
            const icon = groupLabels[key] || '📌';
            return (
              <div key={key} className="nav-compact-mobile-group">
                <div className="nav-compact-mobile-title">
                  {icon} {key.charAt(0).toUpperCase() + key.slice(1)}
                </div>
                {items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-compact-mobile-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== СТИЛИ ===== */}
      <style>{`
        /* ===== КОМПАКТНАЯ НАВИГАЦИЯ ===== */
        .nav-compact {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E7EF;
          padding: 4px 16px;
          position: sticky;
          top: 0;
          z-index: 999;
          min-height: 48px;
          display: flex;
          align-items: center;
        }

        .nav-compact-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          height: 100%;
          min-height: 44px;
        }

        /* ЛОГОТИП */
        .nav-compact-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 16px;
          font-weight: 700;
          color: #0B1F3A;
          flex-shrink: 0;
        }

        .nav-compact-logo span:first-child {
          font-size: 20px;
        }

        /* ОСНОВНЫЕ ПУНКТЫ */
        .nav-compact-main {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
        }

        .nav-compact-link {
          padding: 4px 12px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: #667085;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-compact-link:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-compact-link.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        /* ГРУППЫ */
        .nav-compact-groups {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .nav-compact-dropdown {
          position: relative;
        }

        .nav-compact-dropdown-btn {
          padding: 4px 10px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          color: #667085;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .nav-compact-dropdown-btn:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-compact-dropdown-btn.active {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-compact-dropdown-arrow {
          font-size: 8px;
          transition: transform 0.2s ease;
        }

        .nav-compact-dropdown:hover .nav-compact-dropdown-arrow {
          transform: rotate(180deg);
        }

        .nav-compact-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.12);
          border: 1px solid #E2E7EF;
          min-width: 180px;
          padding: 6px;
          z-index: 100;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .nav-compact-dropdown-item {
          display: block;
          padding: 6px 14px;
          border-radius: 6px;
          text-decoration: none;
          color: #667085;
          font-size: 13px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-compact-dropdown-item:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-compact-dropdown-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        /* ПРАВАЯ ЧАСТЬ */
        .nav-compact-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .nav-compact-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 10px 2px 2px;
          border-radius: 20px;
          text-decoration: none;
          color: #0B1F3A;
          transition: all 0.2s ease;
        }

        .nav-compact-profile:hover {
          background: #F4F6F9;
        }

        .nav-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E2E7EF;
        }

        .nav-avatar-letter {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          color: white;
          border: 2px solid #E2E7EF;
        }

        .nav-compact-name {
          font-size: 12px;
          font-weight: 500;
          max-width: 70px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-compact-logout {
          padding: 4px 8px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          color: #98A2B3;
        }

        .nav-compact-logout:hover {
          background: #FCEBEC;
          color: #B3262E;
        }

        .nav-compact-burger {
          display: none;
          padding: 4px 8px;
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          color: #0B1F3A;
        }

        /* МОБИЛЬНОЕ МЕНЮ */
        .nav-compact-mobile {
          display: none;
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
          border-top: 1px solid #E2E7EF;
          margin-top: 4px;
          max-height: 70vh;
          overflow-y: auto;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          padding: 12px 16px;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.1);
        }

        .nav-compact-mobile-item {
          display: block;
          padding: 8px 12px;
          border-radius: 6px;
          text-decoration: none;
          color: #667085;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .nav-compact-mobile-item:hover {
          background: #F4F6F9;
        }

        .nav-compact-mobile-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-compact-mobile-title {
          font-size: 12px;
          font-weight: 600;
          color: #98A2B3;
          padding: 4px 8px;
          margin-top: 4px;
        }

        /* АДАПТИВНОСТЬ */
        @media (max-width: 1024px) {
          .nav-compact-main {
            display: none;
          }
          .nav-compact-groups {
            display: none;
          }
          .nav-compact-burger {
            display: block;
          }
          .nav-compact-mobile {
            display: flex;
          }
        }

        @media (max-width: 768px) {
          .nav-compact {
            padding: 2px 12px;
            min-height: 40px;
          }
          .nav-compact-container {
            min-height: 36px;
          }
          .nav-compact-logo {
            font-size: 14px;
          }
          .nav-compact-name {
            display: none;
          }
          .nav-compact-profile {
            padding: 2px 4px 2px 2px;
          }
        }

        @media (max-width: 480px) {
          .nav-compact-logo span:last-child {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}