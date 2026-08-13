// frontend/src/components/Navigation.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export default function Navigation({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const isActive = (path) => location.pathname === path;
  const role = profile?.role || 'participant';

  // ============================================================
  // ВСЕ ПУНКТЫ МЕНЮ ПО РОЛЯМ
  // ============================================================
  const getMenuItems = () => {
    const allItems = {
      // ===== ГЛАВНЫЕ =====
      main: [
        { path: '/', label: '🏠 Главная', icon: '🏠', roles: ['all'] },
        { path: '/dashboard', label: '📊 Дашборд', icon: '📊', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/participant-dashboard', label: '📊 Мой кабинет', icon: '📊', roles: ['participant'] },
        { path: '/parent-dashboard', label: '📊 Кабинет родителя', icon: '📊', roles: ['parent'] },
        { path: '/club-coordinator-dashboard', label: '📊 Управление клубом', icon: '📊', roles: ['club_coordinator'] },
        { path: '/tutor-dashboard', label: '📊 Кабинет тьютора', icon: '📊', roles: ['tutor'] },
      ],

      // ===== МЕРОПРИЯТИЯ =====
      events: [
        { path: '/events', label: '📅 Мероприятия', icon: '📅', roles: ['all'] },
        { path: '/calendar', label: '📅 Календарь', icon: '📅', roles: ['all'] },
      ],

      // ===== УЧАСТНИКИ =====
      participants: [
        { path: '/participants', label: '👥 Участники', icon: '👥', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/participant/:id', label: '👤 Профиль участника', icon: '👤', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'] },
      ],

      // ===== КЛУБЫ =====
      clubs: [
        { path: '/clubs', label: '🏫 КЮДы', icon: '🏫', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/club-analytics', label: '📊 Аналитика клубов', icon: '📊', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],

      // ===== ДОСТИЖЕНИЯ =====
      achievements: [
        { path: '/achievements', label: '🏆 Достижения', icon: '🏆', roles: ['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/my-achievements', label: '🏆 Мои достижения', icon: '🏆', roles: ['participant', 'parent'] },
        { path: '/manage-achievements', label: '🏆 Управление достижениями', icon: '🏆', roles: ['admin', 'movement_coordinator', 'club_coordinator'] },
      ],

      // ===== ОЦЕНКИ =====
      reviews: [
        { path: '/my-reviews', label: '📊 Оценки', icon: '📊', roles: ['all'] },
      ],

      // ===== ОТЧЁТЫ =====
      reports: [
        { path: '/reports', label: '📋 Отчёты', icon: '📋', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],

      // ===== АНАЛИТИКА =====
      analytics: [
        { path: '/analytics', label: '📊 Аналитика', icon: '📊', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],

      // ===== ЗАДАНИЯ =====
      tasks: [
        { path: '/president-tasks', label: '👑 Задания президента', icon: '👑', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'participant'] },
      ],

      // ===== ЖУРНАЛ (ТЬЮТОР) =====
      journal: [
        { path: '/my-journal', label: '📓 Мой журнал', icon: '📓', roles: ['tutor'] },
        { path: '/tutor-journal', label: '📋 Журнал тьютора', icon: '📋', roles: ['tutor'] },
      ],

      // ===== СОТРУДНИКИ =====
      staff: [
        { path: '/staff', label: '👥 Сотрудники', icon: '👥', roles: ['admin', 'movement_coordinator', 'club_coordinator'] },
        { path: '/staff-calendar', label: '📅 Календарь сотрудников', icon: '📅', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'] },
        { path: '/tutor-requests', label: '🤝 Запросы на тьюторов', icon: '🤝', roles: ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/tutor-invitations', label: '📨 Приглашения тьюторов', icon: '📨', roles: ['tutor', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],

      // ===== ОБРАЩЕНИЯ =====
      appeals: [
        { path: '/appeals', label: '📨 Обращения', icon: '📨', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],

      // ===== НАСТРОЙКИ =====
      settings: [
        { path: '/settings', label: '⚙️ Настройки', icon: '⚙️', roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/invite', label: '🎫 Пригласить', icon: '🎫', roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/users', label: '👥 Пользователи', icon: '👥', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/import-participants', label: '📥 Импорт', icon: '📥', roles: ['admin', 'movement_coordinator'] },
      ],

      // ===== ПРОФИЛЬ =====
      profile: [
        { path: '/profile', label: '👤 Профиль', icon: '👤', roles: ['all'] },
      ],
    };

    // Собираем только доступные пункты
    const result = {};
    for (const [key, items] of Object.entries(allItems)) {
      result[key] = items.filter(item => 
        item.roles.includes('all') || item.roles.includes(role)
      );
    }
    return result;
  };

  const menuItems = getMenuItems();

  // ============================================================
  // ГРУППЫ МЕНЮ ДЛЯ ОТОБРАЖЕНИЯ
  // ============================================================
  const menuGroups = [
    { key: 'main', label: 'Главное', icon: '🏠' },
    { key: 'events', label: 'Мероприятия', icon: '📅' },
    { key: 'participants', label: 'Участники', icon: '👥' },
    { key: 'clubs', label: 'Клубы', icon: '🏫' },
    { key: 'achievements', label: 'Достижения', icon: '🏆' },
    { key: 'reviews', label: 'Оценки', icon: '📊' },
    { key: 'reports', label: 'Отчёты', icon: '📋' },
    { key: 'analytics', label: 'Аналитика', icon: '📊' },
    { key: 'tasks', label: 'Задания', icon: '👑' },
    { key: 'journal', label: 'Журнал', icon: '📓' },
    { key: 'staff', label: 'Сотрудники', icon: '👥' },
    { key: 'appeals', label: 'Обращения', icon: '📨' },
    { key: 'settings', label: 'Настройки', icon: '⚙️' },
    { key: 'profile', label: 'Профиль', icon: '👤' },
  ].filter(group => menuItems[group.key] && menuItems[group.key].length > 0);

  // ============================================================
  // ПОИСК ПО МЕНЮ
  // ============================================================
  const searchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];
    for (const group of menuGroups) {
      for (const item of menuItems[group.key] || []) {
        if (item.label.toLowerCase().includes(query)) {
          results.push({ ...item, group: group.label });
        }
      }
    }
    return results;
  };

  const searchResultsData = searchResults();

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
  // ВЫХОД
  // ============================================================
  const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('sessionId');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('loginTime');
  navigate('/login');
};

  // ============================================================
  // ЗАКРЫТИЕ ДРОПДАУНА ПРИ КЛИКЕ ВНЕ
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================
  // ОТРИСОВКА
  // ============================================================
  return (
    <nav className="navigation-modern">
      <div className="nav-container">
        {/* ЛОГОТИП */}
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon">🌍</span>
          <span className="nav-logo-text">ДОД</span>
        </Link>

        {/* ПОИСК */}
        <div className="nav-search" ref={searchRef}>
          <span className="nav-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Поиск по меню..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="nav-search-input"
          />
          {showSearchResults && searchResultsData.length > 0 && (
            <div className="nav-search-results">
              {searchResultsData.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="nav-search-result-item"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="nav-search-result-group">{item.group}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ДЕСКТОПНОЕ МЕНЮ */}
        <div className="nav-desktop-menu">
          {menuGroups.map((group) => {
            const items = menuItems[group.key] || [];
            if (items.length === 0) return null;
            
            const isOpen = openDropdown === group.key;
            const hasActive = items.some(item => isActive(item.path));

            return (
              <div 
                key={group.key} 
                className="nav-dropdown-wrapper"
                onMouseEnter={() => setOpenDropdown(group.key)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  className={`nav-dropdown-btn ${hasActive ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(isOpen ? null : group.key)}
                >
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                  <span className="nav-dropdown-arrow">▼</span>
                </button>
                {isOpen && (
                  <div className="nav-dropdown-menu">
                    {items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-dropdown-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => setOpenDropdown(null)}
                      >
                        <span className="nav-dropdown-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ПРАВАЯ ЧАСТЬ: АВАТАР + ВЫХОД */}
        <div className="nav-right">
          {/* УВЕДОМЛЕНИЯ */}
          <button className="nav-notifications">
            <span>🔔</span>
            <span className="nav-notification-badge">3</span>
          </button>

          {/* ПРОФИЛЬ */}
          <Link to="/profile" className="nav-profile">
            {getAvatar()}
            <span className="nav-profile-name">
              {profile?.full_name?.split(' ')[0] || 'Профиль'}
            </span>
          </Link>

          {/* ВЫХОД */}
          <button className="nav-logout" onClick={handleLogout}>
            <span>🚪</span>
          </button>

          {/* БУРГЕР (МОБИЛЬНЫЙ) */}
          <button 
            className="nav-burger" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* МОБИЛЬНОЕ МЕНЮ */}
      {isMobileMenuOpen && (
        <div className="nav-mobile-menu">
          {menuGroups.map((group) => {
            const items = menuItems[group.key] || [];
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="nav-mobile-group">
                <div className="nav-mobile-group-title">
                  {group.icon} {group.label}
                </div>
                {items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-mobile-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* СТИЛИ */}
      <style>{`
        /* ===== ОСНОВНЫЕ СТИЛИ ===== */
        .navigation-modern {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E7EF;
          padding: 8px 24px;
          position: sticky;
          top: 0;
          z-index: 999;
          box-shadow: 0 2px 8px rgba(11, 31, 58, 0.06);
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
          min-height: 56px;
        }

        /* ===== ЛОГОТИП ===== */
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-logo-icon {
          font-size: 28px;
        }

        .nav-logo-text {
          font-size: 20px;
          font-weight: 800;
          color: #0B1F3A;
          letter-spacing: -0.5px;
        }

        /* ===== ПОИСК ===== */
        .nav-search {
          position: relative;
          flex: 1;
          max-width: 400px;
          min-width: 150px;
        }

        .nav-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #98A2B3;
        }

        .nav-search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1.5px solid #E2E7EF;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: #F8FAFC;
          color: #0B1F3A;
        }

        .nav-search-input:focus {
          border-color: #0B1F3A;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(11, 31, 58, 0.08);
        }

        .nav-search-input::placeholder {
          color: #98A2B3;
        }

        /* ===== РЕЗУЛЬТАТЫ ПОИСКА ===== */
        .nav-search-results {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
          padding: 8px;
        }

        .nav-search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #0B1F3A;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .nav-search-result-item:hover {
          background: #F4F6F9;
        }

        .nav-search-result-group {
          margin-left: auto;
          font-size: 11px;
          color: #98A2B3;
          background: #F4F6F9;
          padding: 2px 10px;
          border-radius: 12px;
        }

        /* ===== ДЕСКТОПНОЕ МЕНЮ ===== */
        .nav-desktop-menu {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: center;
        }

        @media (max-width: 1024px) {
          .nav-desktop-menu {
            display: none;
          }
        }

        /* ===== ДРОПДАУН ===== */
        .nav-dropdown-wrapper {
          position: relative;
        }

        .nav-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #667085;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-dropdown-btn:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-dropdown-btn.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-dropdown-arrow {
          font-size: 8px;
          margin-left: 2px;
          transition: transform 0.2s ease;
        }

        .nav-dropdown-wrapper:hover .nav-dropdown-arrow {
          transform: rotate(180deg);
        }

        .nav-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
          min-width: 200px;
          padding: 8px;
          z-index: 100;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .nav-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .nav-dropdown-item:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-dropdown-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-dropdown-item-icon {
          font-size: 16px;
        }

        /* ===== ПРАВАЯ ЧАСТЬ ===== */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* ===== УВЕДОМЛЕНИЯ ===== */
        .nav-notifications {
          position: relative;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s ease;
        }

        .nav-notifications:hover {
          background: #F4F6F9;
        }

        .nav-notification-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #B3262E;
          color: white;
          font-size: 10px;
          font-weight: 700;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ===== ПРОФИЛЬ ===== */
        .nav-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border-radius: 30px;
          text-decoration: none;
          color: #0B1F3A;
          transition: all 0.2s ease;
        }

        .nav-profile:hover {
          background: #F4F6F9;
        }

        .nav-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E2E7EF;
        }

        .nav-avatar-letter {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          color: white;
          border: 2px solid #E2E7EF;
        }

        .nav-profile-name {
          font-size: 13px;
          font-weight: 500;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== ВЫХОД ===== */
        .nav-logout {
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s ease;
          color: #98A2B3;
        }

        .nav-logout:hover {
          background: #FCEBEC;
          color: #B3262E;
        }

        /* ===== БУРГЕР ===== */
        .nav-burger {
          display: none;
          padding: 8px;
          border: none;
          background: transparent;
          font-size: 24px;
          cursor: pointer;
          color: #0B1F3A;
        }

        @media (max-width: 1024px) {
          .nav-burger {
            display: block;
          }
        }

        /* ===== МОБИЛЬНОЕ МЕНЮ ===== */
        .nav-mobile-menu {
          display: none;
          padding: 16px 0;
          border-top: 1px solid #E2E7EF;
          margin-top: 8px;
          max-height: 70vh;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .nav-mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
        }

        .nav-mobile-group-title {
          font-size: 12px;
          font-weight: 600;
          color: #98A2B3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 12px;
        }

        .nav-mobile-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .nav-mobile-item:hover {
          background: #F4F6F9;
        }

        .nav-mobile-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        /* ===== АДАПТИВНОСТЬ ===== */
        @media (max-width: 768px) {
          .navigation-modern {
            padding: 6px 12px;
          }

          .nav-logo-text {
            font-size: 16px;
          }

          .nav-search {
            max-width: 150px;
            min-width: 80px;
          }

          .nav-search-input {
            font-size: 12px;
            padding: 6px 8px 6px 30px;
          }

          .nav-profile-name {
            display: none;
          }

          .nav-notification-badge {
            width: 14px;
            height: 14px;
            font-size: 8px;
          }
        }

        @media (max-width: 480px) {
          .nav-search {
            max-width: 100px;
          }

          .nav-logo-icon {
            font-size: 22px;
          }

          .nav-logo-text {
            font-size: 14px;
          }
        }
      `}</style>
    </nav>
  );
}