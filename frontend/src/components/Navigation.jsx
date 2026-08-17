// frontend/src/components/Navigation.jsx

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/Image.png';

export default function Navigation({ profile }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const menuRef = useRef(null);

  // Закрытие попапов
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Загрузка уведомлений (1 раз)
  const loadNotifications = async () => {
    if (notificationsLoaded) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('https://dod-backend.relaxdev.ru/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
        setUnreadCount(data.filter(n => !n.read).length);
        setNotificationsLoaded(true);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  useEffect(() => {
    if (profile && !notificationsLoaded) {
      loadNotifications();
    }
  }, [profile, notificationsLoaded]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Меню в зависимости от роли
  const getMenuItems = () => {
    const role = profile?.role;
    const isPresident = profile?.is_president || false;
    const items = [];

    items.push({ path: '/dashboard', label: 'Дашборд' });

    if (role === 'participant' || role === 'parent') {
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/calendar', label: 'Календарь' });
      items.push({ path: '/my-achievements', label: 'Достижения' });
      items.push({ path: '/my-reviews', label: 'Оценки' });
      if (role === 'participant' && isPresident) {
        items.push({ path: '/president-tasks', label: 'Задания' });
      }
    }

    if (role === 'club_coordinator') {
      items.push({ path: '/clubs', label: 'КЮД' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/manage-achievements', label: 'Достижения' });
      items.push({ path: '/reports', label: 'Отчёты' });
      items.push({ path: '/appeals', label: 'Обращения' });
      items.push({ path: '/staff', label: 'Сотрудники' });
      items.push({ path: '/calendar', label: 'Календарь' });
    }

    if (role === 'tutor') {
      items.push({ path: '/clubs', label: 'КЮДы' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/achievements', label: 'Достижения' });
      items.push({ path: '/my-reviews', label: 'Оценки' });
      items.push({ path: '/my-journal', label: 'Журнал' });
      items.push({ path: '/staff-calendar', label: 'Календарь' });
      items.push({ path: '/tutor-assignments', label: 'Назначения' });
      items.push({ path: '/reports', label: 'Отчёты' });
    }

    if (role === 'movement_coordinator' || role === 'admin') {
      items.push({ path: '/clubs', label: 'КЮДы' });
      items.push({ path: '/clubs-management', label: 'Управление' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/achievements', label: 'Достижения' });
      items.push({ path: '/achievements-categories', label: 'Категории' });
      items.push({ path: '/reports', label: 'Отчёты' });
      items.push({ path: '/analytics', label: 'Аналитика' });
      items.push({ path: '/appeals', label: 'Обращения' });
      items.push({ path: '/documents-center', label: 'Документы' });
      items.push({ path: '/mass-notifications', label: 'Уведомления' });
      items.push({ path: '/notification-history', label: 'История' });
      items.push({ path: '/activity-log', label: 'Журнал' });
      items.push({ path: '/consents-management', label: 'Согласия' });
      items.push({ path: '/goals', label: 'Цели' });
      items.push({ path: '/tasks-planner', label: 'Планировщик' });
      items.push({ path: '/admin/users', label: 'Пользователи' });
      if (role === 'admin') {
        items.push({ path: '/admin/invite', label: 'Пригласить' });
        items.push({ path: '/import-participants', label: 'Импорт' });
        items.push({ path: '/settings', label: 'Настройки' });
      }
    }

    if (role === 'president' || role === 'vice_president') {
      items.push({ path: '/clubs', label: 'КЮДы' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/achievements', label: 'Достижения' });
      items.push({ path: '/reports', label: 'Отчёты' });
      items.push({ path: '/analytics', label: 'Аналитика' });
      items.push({ path: '/appeals', label: 'Обращения' });
      items.push({ path: '/documents-center', label: 'Документы' });
      items.push({ path: '/president-tasks', label: 'Задания' });
      items.push({ path: '/club-rating', label: 'Рейтинг' });
    }

    return items;
  };

  const menuItems = getMenuItems();

  // Если нет профиля — упрощённая навигация
  if (!profile) {
    return (
      <nav className="nav nav-simple">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <img src={logo} alt="ДОД" />
            <span className="nav-logo-text">Дипломаты будущего</span>
          </Link>
          <Link to="/login" className="btn btn-gold btn-sm">Вход</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="nav">
      <div className="nav-container">
        {/* Логотип */}
        <Link to="/" className="nav-logo">
          <img src={logo} alt="ДОД" />
          <span className="nav-logo-text">Дипломаты будущего</span>
        </Link>

        {/* Десктопное меню */}
        <div className="nav-desktop">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Правая часть */}
        <div className="nav-right">
          {/* Уведомления */}
          <div className="nav-notifications" ref={notificationRef}>
            <button
              className="nav-notif-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="nav-notif-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="nav-notif-dropdown">
                <div className="nav-notif-header">
                  <span>Уведомления</span>
                  {unreadCount > 0 && (
                    <button onClick={() => {
                      // Mark all read
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      setUnreadCount(0);
                    }} className="nav-notif-markall">
                      Прочитать все
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="nav-notif-empty">Нет уведомлений</div>
                ) : (
                  <div className="nav-notif-list">
                    {notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={`nav-notif-item ${!n.read ? 'unread' : ''}`}>
                        <div className="nav-notif-title">{n.title}</div>
                        <div className="nav-notif-message">{n.message}</div>
                        <div className="nav-notif-time">
                          {new Date(n.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/notification-history" className="nav-notif-all">
                  Все уведомления
                </Link>
              </div>
            )}
          </div>

          {/* Профиль */}
          <div className="nav-profile" ref={profileRef}>
            <button
              className="nav-profile-btn"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="nav-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Аватар" />
                ) : (
                  getInitials(profile?.full_name)
                )}
              </div>
              <span className="nav-profile-name">{profile?.full_name}</span>
              <svg width="12" height="12" viewBox="0 0 12 8" fill="none">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {isProfileOpen && (
              <div className="nav-profile-dropdown">
                <div className="nav-profile-header">
                  <div className="nav-profile-avatar">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Аватар" />
                    ) : (
                      getInitials(profile?.full_name)
                    )}
                  </div>
                  <div>
                    <div className="nav-profile-fullname">{profile?.full_name}</div>
                    <div className="nav-profile-role">{profile?.role}</div>
                  </div>
                </div>
                <div className="nav-divider" />
                <Link to="/profile" className="nav-profile-item" onClick={() => setIsProfileOpen(false)}>
                  Профиль
                </Link>
                <Link to="/my-achievements" className="nav-profile-item" onClick={() => setIsProfileOpen(false)}>
                  Достижения
                </Link>
                <Link to="/my-reviews" className="nav-profile-item" onClick={() => setIsProfileOpen(false)}>
                  Оценки
                </Link>
                <div className="nav-divider" />
                <button className="nav-profile-item nav-profile-logout" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            )}
          </div>

          {/* Мобильное меню */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Мобильное меню */}
      {isMobileMenuOpen && (
        <div className="nav-mobile" ref={menuRef}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-mobile-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="nav-divider" />
          <Link to="/profile" className="nav-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
            Профиль
          </Link>
          <button className="nav-mobile-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}

      <style>{`
        /* ===== NAV ===== */
        .nav {
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-simple {
          background: var(--primary);
          border-bottom: none;
        }

        .nav-simple .nav-logo-text {
          color: white;
        }

        .nav-container {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          gap: 16px;
        }

        /* ===== LOGO ===== */
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-logo img {
          height: 32px;
          width: auto;
        }

        .nav-logo-text {
          font-family: var(--font-serif);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }

        /* ===== DESKTOP MENU ===== */
        .nav-desktop {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          overflow-x: auto;
          padding: 0 8px;
        }

        .nav-link {
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: var(--transition);
          white-space: nowrap;
        }

        .nav-link:hover {
          background: var(--background);
          color: var(--text-primary);
        }

        .nav-link.active {
          background: var(--background);
          color: var(--text-primary);
          font-weight: 600;
        }

        /* ===== RIGHT ===== */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* ===== NOTIFICATIONS ===== */
        .nav-notifications {
          position: relative;
        }

        .nav-notif-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          border-radius: 50%;
          cursor: pointer;
          color: var(--text-secondary);
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .nav-notif-btn:hover {
          background: var(--background);
        }

        .nav-notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #B3262E;
          color: white;
          font-size: 10px;
          font-weight: 600;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          max-height: 420px;
          background: white;
          border-radius: var(--radius);
          box-shadow: var(--shadow-hover);
          border: 1px solid var(--border);
          overflow: hidden;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .nav-notif-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          flex-shrink: 0;
        }

        .nav-notif-markall {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
        }

        .nav-notif-markall:hover {
          color: var(--text-primary);
        }

        .nav-notif-list {
          overflow-y: auto;
          flex: 1;
        }

        .nav-notif-item {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          cursor: default;
          transition: var(--transition);
        }

        .nav-notif-item:hover {
          background: var(--background);
        }

        .nav-notif-item.unread {
          border-left: 3px solid var(--gold);
          background: #FAF8F4;
        }

        .nav-notif-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary);
        }

        .nav-notif-message {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .nav-notif-time {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .nav-notif-empty {
          padding: 28px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        .nav-notif-all {
          display: block;
          padding: 10px 16px;
          text-align: center;
          border-top: 1px solid var(--border);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .nav-notif-all:hover {
          background: var(--background);
        }

        /* ===== PROFILE ===== */
        .nav-profile {
          position: relative;
        }

        .nav-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border: none;
          background: transparent;
          border-radius: 30px;
          cursor: pointer;
          transition: var(--transition);
          font-family: var(--font-sans);
        }

        .nav-profile-btn:hover {
          background: var(--background);
        }

        .nav-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
          overflow: hidden;
        }

        .nav-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nav-profile-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-profile-btn svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .nav-profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 240px;
          background: white;
          border-radius: var(--radius);
          box-shadow: var(--shadow-hover);
          border: 1px solid var(--border);
          overflow: hidden;
          z-index: 1000;
        }

        .nav-profile-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }

        .nav-profile-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 600;
          flex-shrink: 0;
          overflow: hidden;
        }

        .nav-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nav-profile-fullname {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .nav-profile-role {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .nav-divider {
          height: 1px;
          background: var(--border);
          margin: 0 12px;
        }

        .nav-profile-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          transition: var(--transition);
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          font-family: var(--font-sans);
          text-align: left;
        }

        .nav-profile-item:hover {
          background: var(--background);
        }

        .nav-profile-logout {
          color: #B3262E;
        }

        .nav-profile-logout:hover {
          background: #FCEBEC;
        }

        /* ===== MOBILE TOGGLE ===== */
        .nav-mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-primary);
          padding: 8px;
        }

        /* ===== MOBILE MENU ===== */
        .nav-mobile {
          display: none;
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 12px 16px 20px;
          flex-direction: column;
          gap: 2px;
          box-shadow: var(--shadow);
          max-height: calc(100vh - 64px);
          overflow-y: auto;
          z-index: 999;
        }

        .nav-mobile-link {
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          text-decoration: none;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          transition: var(--transition);
        }

        .nav-mobile-link:hover {
          background: var(--background);
        }

        .nav-mobile-link.active {
          background: var(--background);
          font-weight: 600;
        }

        .nav-mobile-logout {
          padding: 10px 14px;
          border: none;
          background: none;
          text-align: left;
          font-size: 14px;
          color: #B3262E;
          cursor: pointer;
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-family: var(--font-sans);
          transition: var(--transition);
        }

        .nav-mobile-logout:hover {
          background: #FCEBEC;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
          .nav-desktop {
            display: none;
          }

          .nav-mobile-toggle {
            display: block;
          }

          .nav-mobile {
            display: flex;
          }

          .nav-profile-name {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .nav {
            padding: 0 16px;
          }

          .nav-logo-text {
            font-size: 16px;
          }

          .nav-logo img {
            height: 28px;
          }

          .nav-notif-dropdown {
            width: 300px;
            right: -40px;
          }

          .nav-profile-btn {
            padding: 4px;
          }

          .nav-profile-dropdown {
            width: 200px;
            right: -20px;
          }
        }

        @media (max-width: 480px) {
          .nav {
            padding: 0 12px;
          }

          .nav-logo-text {
            display: none;
          }

          .nav-notif-dropdown {
            width: 280px;
            right: -60px;
          }

          .nav-profile-dropdown {
            width: 180px;
            right: -40px;
          }
        }
      `}</style>
    </nav>
  );
}