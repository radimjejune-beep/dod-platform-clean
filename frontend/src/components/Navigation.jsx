// frontend/src/components/Navigation.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Notifications from './Notifications';
import logo from '../assets/Image.png';

export default function Navigation({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const isActive = (path) => location.pathname === path;
  const role = profile?.role || 'participant';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  const getAvatar = () => {
    if (profile?.avatar_url) {
      const isBase64 = profile.avatar_url.startsWith('data:image/');
      const isUrl = profile.avatar_url.startsWith('http');
      if (isBase64 || isUrl) {
        return <img src={profile.avatar_url} alt="Аватар" className="nav-avatar" />;
      }
      return <img src={`/uploads/${profile.avatar_url}`} alt="Аватар" className="nav-avatar" />;
    }
    const initial = profile?.full_name?.charAt(0) || '?';
    return (
      <div className="nav-avatar-letter">
        {initial.toUpperCase()}
      </div>
    );
  };

  const getMenuGroups = () => {
    // ============================================================
    // 1. ГЛАВНЫЙ РАЗДЕЛ — всегда виден
    // ============================================================
    const mainItems = [
      { 
        path: '/dashboard', 
        label: '📊 Дашборд', 
        roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] 
      },
      { 
        path: '/participant-dashboard', 
        label: '📊 Мой кабинет', 
        roles: ['participant'] 
      },
      { 
        path: '/parent-dashboard', 
        label: '📊 Мой кабинет', 
        roles: ['parent'] 
      },
      { 
        path: '/club-coordinator-dashboard', 
        label: '📊 Мой кабинет', 
        roles: ['club_coordinator'] 
      },
      { 
        path: '/tutor-dashboard', 
        label: '📊 Мой кабинет', 
        roles: ['tutor'] 
      },
    ];

    // ============================================================
    // 2. МЕРОПРИЯТИЯ И КАЛЕНДАРЬ
    // ============================================================
    const eventsItems = [
      { path: '/events', label: '📅 Все мероприятия', roles: ['all'] },
      { path: '/calendar', label: '📆 Календарь', roles: ['all'] },
    ];

    // ============================================================
    // 3. УПРАВЛЕНИЕ ЛЮДЬМИ
    // ============================================================
    const peopleItems = [
      { path: '/participants', label: '👥 Участники', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
      { path: '/staff', label: '👤 Сотрудники', roles: ['admin', 'movement_coordinator'] },
      { path: '/admin/users', label: '👤 Пользователи системы', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
    ];

    // ============================================================
    // 4. КЛУБЫ (КЮДы)
    // ============================================================
    const clubsItems = [
      { path: '/clubs', label: '🏫 Все КЮДы', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
      { path: '/club-analytics', label: '📊 Аналитика КЮДов', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
    ];

    // ============================================================
    // 5. ДОСТИЖЕНИЯ
    // ============================================================
    const achievementsItems = [
      { path: '/achievements', label: '🏆 Все достижения', roles: ['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'] },
      { path: '/manage-achievements', label: '⚙️ Управление', roles: ['admin', 'movement_coordinator', 'club_coordinator'] },
      { path: '/my-achievements', label: '🌟 Мои достижения', roles: ['participant', 'parent'] },
    ];

    // ============================================================
    // 6. ОТЧЁТЫ И АНАЛИТИКА
    // ============================================================
    const reportsItems = [
      { path: '/reports', label: '📋 Отчёты', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      { path: '/analytics', label: '📊 Общая аналитика', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
    ];

    // ============================================================
    // 7. ЗАДАНИЯ И ЖУРНАЛЫ
    // ============================================================
    const tasksItems = [
      { path: '/president-tasks', label: '👑 Задания президента', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      { path: '/my-journal', label: '📓 Журнал тьютора', roles: ['tutor'] },
    ];

    // ============================================================
    // 8. КОММУНИКАЦИЯ
    // ============================================================
    const communicationItems = [
      { path: '/appeals', label: '📨 Обращения', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      { path: '/tutor-requests', label: '🤝 Запросы на тьюторов', roles: ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
      { path: '/tutor-invitations', label: '📨 Приглашения тьюторам', roles: ['tutor', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
    ];

    // ============================================================
    // 9. НАСТРОЙКИ
    // ============================================================
    const settingsItems = [
      { path: '/settings', label: '⚙️ Настройки сайта', roles: ['admin', 'movement_coordinator'] },
      { path: '/admin/news', label: '📰 Новости', roles: ['admin', 'movement_coordinator'] },
      { path: '/admin/invite', label: '🎫 Пригласить сотрудника', roles: ['admin', 'movement_coordinator'] },
      { path: '/import-participants', label: '📥 Импорт участников', roles: ['admin', 'movement_coordinator'] },
    ];

    // ============================================================
    // 10. МОИ ОЦЕНКИ
    // ============================================================
    const reviewsItems = [
      { path: '/my-reviews', label: '📊 Мои оценки', roles: ['all'] },
    ];

    // ============================================================
    // 11. КАЛЕНДАРЬ СОТРУДНИКОВ
    // ============================================================
    const staffCalendarItems = [
      { path: '/staff-calendar', label: '📅 Календарь сотрудников', roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'] },
    ];

    // ============================================================
    // СБОРКА ВСЕХ ГРУПП
    // ============================================================
    const allGroups = {
      main: mainItems,
      events: eventsItems,
      people: peopleItems,
      clubs: clubsItems,
      achievements: achievementsItems,
      reports: reportsItems,
      tasks: tasksItems,
      communication: communicationItems,
      reviews: reviewsItems,
      staffCalendar: staffCalendarItems,
      settings: settingsItems,
    };

    // Фильтруем по роли
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
  // НАЗВАНИЯ ГРУПП ДЛЯ ОТОБРАЖЕНИЯ
  // ============================================================
  const groupLabels = {
    main: '🏠 Главная',
    events: '📅 Мероприятия',
    people: '👥 Люди',
    clubs: '🏫 КЮДы',
    achievements: '🏆 Достижения',
    reports: '📋 Отчёты и аналитика',
    tasks: '👑 Задания',
    communication: '📨 Коммуникация',
    reviews: '📊 Оценки',
    staffCalendar: '📅 Календарь',
    settings: '⚙️ Настройки',
  };

  // ============================================================
  // ПОРЯДОК ГРУПП В МЕНЮ
  // ============================================================
  const groupOrder = ['main', 'events', 'people', 'clubs', 'achievements', 'reviews', 'reports', 'tasks', 'communication', 'staffCalendar', 'settings'];

  // Сортируем группы по порядку
  const sortedGroups = Object.entries(menuGroups).sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // ============================================================
  // ОБРАБОТЧИК КЛИКА ВНЕ ДРОПДАУНА
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll('.nav-new-dropdown');
      let clickedOnDropdown = false;
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
          clickedOnDropdown = true;
        }
      });
      if (!clickedOnDropdown) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ============================================================
  // БЛОКИРОВКА ПРОКРУТКИ ПРИ ОТКРЫТОМ МОБИЛЬНОМ МЕНЮ
  // ============================================================
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // ============================================================
  // ЕСЛИ ПРОФИЛЬ НЕ ЗАГРУЖЕН
  // ============================================================
  if (!profile) {
    return (
      <nav className="nav-new">
        <div className="nav-new-container">
          <Link to="/" className="nav-new-logo">
            <img src={logo} alt="ДОД «Дипломаты будущего»" className="nav-new-logo-img" />
            <span className="nav-new-logo-text">Дипломаты будущего</span>
          </Link>
          <div className="nav-new-right">
            <Link to="/login" className="nav-new-link">Войти</Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="nav-new">
      <div className="nav-new-container">
        {/* ===== ЛОГОТИП ===== */}
        <Link to="/" className="nav-new-logo">
          <img src={logo} alt="ДОД «Дипломаты будущего»" className="nav-new-logo-img" />
          <span className="nav-new-logo-text">Дипломаты будущего</span>
        </Link>

        {/* ===== ДЕСКТОПНОЕ МЕНЮ ===== */}
        <div className="nav-new-menu">
          {sortedGroups.map(([key, items]) => {
            // Пропускаем пустые группы
            if (!items || items.length === 0) return null;
            
            const isOpen = openDropdown === key;
            const hasActive = items.some(item => isActive(item.path));
            const label = groupLabels[key] || key;
            
            // Для главной группы показываем ссылки напрямую
            if (key === 'main') {
              return items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-new-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ));
            }
            
            // Для остальных групп — дропдаун
            return (
              <div 
                key={key} 
                className="nav-new-dropdown"
                onMouseEnter={() => setOpenDropdown(key)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  className={`nav-new-dropdown-btn ${hasActive ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  <span className="nav-new-dropdown-label">{label}</span>
                  <span className="nav-new-dropdown-arrow">▾</span>
                </button>
                {isOpen && (
                  <div className="nav-new-dropdown-menu">
                    {items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-new-dropdown-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => {
                          setOpenDropdown(null);
                          setIsMobileMenuOpen(false);
                        }}
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

        {/* ===== ПРАВАЯ ЧАСТЬ ===== */}
        <div className="nav-new-right">
          <Notifications profile={profile} />
          
          <Link to="/profile" className="nav-new-profile">
            {getAvatar()}
            <span className="nav-new-profile-name">
              {profile?.full_name?.split(' ')[0] || 'Профиль'}
            </span>
          </Link>

          <button 
            className="nav-new-logout" 
            onClick={handleLogout} 
            title="Выйти"
            aria-label="Выйти из системы"
          >
            <span>🚪</span>
          </button>

          <button 
            className="nav-new-burger" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ===== МОБИЛЬНОЕ МЕНЮ ===== */}
      {isMobileMenuOpen && (
        <div className="nav-new-mobile">
          {sortedGroups.map(([key, items]) => {
            if (!items || items.length === 0) return null;
            const label = groupLabels[key] || key;
            
            return (
              <div key={key} className="nav-new-mobile-group">
                <div className="nav-new-mobile-title">{label}</div>
                {items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-new-mobile-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
          
          {/* КНОПКА ВЫХОДА В МОБИЛЬНОМ МЕНЮ */}
          <button 
            className="nav-new-mobile-logout"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
          >
            🚪 Выйти
          </button>
        </div>
      )}

      {/* ============================================================
          СТИЛИ
          ============================================================ */}
      <style>{`
        .nav-new {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E7EF;
          padding: 0 20px;
          position: sticky;
          top: 0;
          z-index: 999;
          height: 60px;
          display: flex;
          align-items: center;
          box-shadow: 0 1px 4px rgba(11, 31, 58, 0.04);
        }

        .nav-new-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100%;
        }

        /* ===== ЛОГОТИП ===== */
        .nav-new-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-new-logo-img {
          height: 36px;
          width: auto;
          object-fit: contain;
        }

        .nav-new-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 700;
          color: #0B1F3A;
          letter-spacing: 0.5px;
        }

        /* ===== МЕНЮ ===== */
        .nav-new-menu {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          justify-content: center;
          padding: 0 16px;
        }

        .nav-new-link {
          padding: 6px 14px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: #667085;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-new-link:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-new-link.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        /* ===== ДРОПДАУН ===== */
        .nav-new-dropdown {
          position: relative;
        }

        .nav-new-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
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

        .nav-new-dropdown-btn:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-new-dropdown-btn.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-new-dropdown-arrow {
          font-size: 8px;
          transition: transform 0.2s ease;
        }

        .nav-new-dropdown:hover .nav-new-dropdown-arrow {
          transform: rotate(180deg);
        }

        .nav-new-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.12);
          border: 1px solid #E2E7EF;
          min-width: 220px;
          padding: 6px;
          z-index: 1000;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .nav-new-dropdown-item {
          display: block;
          padding: 8px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 13px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-new-dropdown-item:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-new-dropdown-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        /* ===== ПРАВАЯ ЧАСТЬ ===== */
        .nav-new-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .nav-new-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border-radius: 30px;
          text-decoration: none;
          color: #0B1F3A;
          transition: all 0.2s ease;
        }

        .nav-new-profile:hover {
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
          font-size: 13px;
          font-weight: bold;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          color: white;
          border: 2px solid #E2E7EF;
        }

        .nav-new-profile-name {
          font-size: 13px;
          font-weight: 500;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-new-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s ease;
          color: #98A2B3;
        }

        .nav-new-logout:hover {
          background: #FCEBEC;
          color: #B3262E;
        }

        .nav-new-burger {
          display: none;
          padding: 4px 8px;
          border: none;
          background: transparent;
          font-size: 22px;
          cursor: pointer;
          color: #0B1F3A;
        }

        /* ===== МОБИЛЬНОЕ МЕНЮ ===== */
        .nav-new-mobile {
          display: none;
          flex-direction: column;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #E2E7EF;
          margin-top: 0;
          max-height: 70vh;
          overflow-y: auto;
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          background: white;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.1);
          z-index: 1000;
        }

        .nav-new-mobile-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-new-mobile-title {
          font-size: 11px;
          font-weight: 600;
          color: #98A2B3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 6px 8px 4px;
        }

        .nav-new-mobile-item {
          display: block;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .nav-new-mobile-item:hover {
          background: #F4F6F9;
        }

        .nav-new-mobile-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-new-mobile-logout {
          margin-top: 8px;
          padding: 12px 16px;
          border: none;
          background: #FCEBEC;
          border-radius: 10px;
          color: #B3262E;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          width: 100%;
        }

        .nav-new-mobile-logout:hover {
          background: #FED7D7;
        }

        /* ===== АДАПТИВНОСТЬ ===== */
        @media (max-width: 1200px) {
          .nav-new-menu {
            gap: 2px;
          }
          .nav-new-link,
          .nav-new-dropdown-btn {
            padding: 6px 10px;
            font-size: 12px;
          }
          .nav-new-dropdown-label {
            font-size: 12px;
          }
          .nav-new-profile-name {
            max-width: 60px;
            font-size: 12px;
          }
        }

        @media (max-width: 1024px) {
          .nav-new-menu {
            display: none;
          }
          .nav-new-burger {
            display: block;
          }
          .nav-new-mobile {
            display: flex;
          }
        }

        @media (max-width: 768px) {
          .nav-new {
            height: 54px;
            padding: 0 12px;
          }
          .nav-new-logo-img {
            height: 28px;
          }
          .nav-new-logo-text {
            font-size: 13px;
          }
          .nav-new-profile-name {
            display: none;
          }
          .nav-new-profile {
            padding: 4px;
          }
          .nav-new-mobile {
            top: 54px;
          }
        }

        @media (max-width: 480px) {
          .nav-new {
            height: 48px;
            padding: 0 8px;
          }
          .nav-new-logo-text {
            display: none;
          }
          .nav-new-logo-img {
            height: 32px;
          }
          .nav-new-right {
            gap: 2px;
          }
          .nav-new-logout {
            width: 32px;
            height: 32px;
            font-size: 16px;
          }
          .nav-avatar,
          .nav-avatar-letter {
            width: 28px;
            height: 28px;
            font-size: 11px;
          }
          .nav-new-mobile {
            top: 48px;
          }
        }
      `}</style>
    </nav>
  );
}