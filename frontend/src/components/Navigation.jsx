// frontend/src/components/Navigation.jsx

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/Image.png';

export default function Navigation({ profile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  // ============================================================
  // ЗАГРУЗКА УВЕДОМЛЕНИЙ
  // ============================================================
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

  // ============================================================
  // ЗАКРЫТИЕ ПОПАПОВ ПРИ КЛИКЕ СНАРУЖИ
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================
  // ВЫХОД
  // ============================================================
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ============================================================
  // УВЕДОМЛЕНИЯ: ОТМЕТКА О ПРОЧТЕНИИ
  // ============================================================
  const handleNotificationClick = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://dod-backend.relaxdev.ru/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('https://dod-backend.relaxdev.ru/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  // ============================================================
  // ВСПОМОГАТЕЛЬНЫЕ
  // ============================================================
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

  // ============================================================
  // ПОЛУЧЕНИЕ ПУНКТОВ МЕНЮ ПО РОЛИ
  // ============================================================
  const getMenuItems = () => {
    const role = profile?.role;
    const items = [];

    items.push({ path: '/dashboard', label: 'Дашборд' });

    if (role === 'participant' || role === 'parent') {
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/calendar', label: 'Календарь' });
      items.push({ path: '/my-achievements', label: 'Достижения' });
      items.push({ path: '/my-reviews', label: 'Оценки' });
      if (profile?.is_president) {
        items.push({ path: '/president-tasks', label: 'Задания президента' });
      }
    }

    if (role === 'club_coordinator') {
      items.push({ path: '/clubs', label: 'Мой КЮД' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/manage-achievements', label: 'Достижения' });
      items.push({ path: '/reports', label: 'Отчёты' });
      items.push({ path: '/appeals', label: 'Обращения' });
      items.push({ path: '/staff', label: 'Сотрудники' });
      items.push({ path: '/calendar', label: 'Календарь' });
      items.push({ path: '/documents-center', label: 'Центр документов' });
    }

    if (role === 'tutor') {
      items.push({ path: '/clubs', label: 'КЮДы' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/achievements', label: 'Достижения' });
      items.push({ path: '/my-reviews', label: 'Оценки' });
      items.push({ path: '/my-journal', label: 'Мой журнал' });
      items.push({ path: '/staff-calendar', label: 'Календарь' });
      items.push({ path: '/tutor-assignments', label: 'Назначения' });
      items.push({ path: '/reports', label: 'Отчёты' });
    }

    if (role === 'movement_coordinator' || role === 'admin') {
      items.push({ path: '/clubs', label: 'КЮДы' });
      items.push({ path: '/clubs-management', label: 'Управление КЮДами' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/achievements', label: 'Достижения' });
      items.push({ path: '/achievements-categories', label: 'Категории достижений' });
      items.push({ path: '/reports', label: 'Отчёты' });
      items.push({ path: '/analytics', label: 'Аналитика' });
      items.push({ path: '/appeals', label: 'Обращения' });
      items.push({ path: '/documents-center', label: 'Центр документов' });
      items.push({ path: '/mass-notifications', label: 'Массовые уведомления' });
      items.push({ path: '/notification-history', label: 'История уведомлений' });
      items.push({ path: '/activity-log', label: 'Журнал действий' });
      items.push({ path: '/consents-management', label: 'Согласия' });
      items.push({ path: '/goals', label: 'Цели и KPI' });
      items.push({ path: '/tasks-planner', label: 'Планировщик задач' });
      items.push({ path: '/admin/users', label: 'Пользователи' });
      if (role === 'admin') {
        items.push({ path: '/admin/invite', label: 'Пригласить' });
        items.push({ path: '/import-participants', label: 'Импорт участников' });
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
      items.push({ path: '/documents-center', label: 'Центр документов' });
      items.push({ path: '/president-tasks', label: 'Задания президента' });
      items.push({ path: '/club-rating', label: 'Рейтинг' });
    }

    return items;
  };

  const menuItems = getMenuItems();

  // ============================================================
  // ПУБЛИЧНАЯ ВЕРСИЯ (БЕЗ ПРОФИЛЯ)
  // ============================================================
  if (!profile) {
    return (
      <nav className="nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <img src={logo} alt="ДОД" />
            <span className="nav-logo-text">Дипломаты будущего</span>
          </Link>
          <div className="nav-right">
            <Link to="/login" className="btn-gold">Войти</Link>
          </div>
        </div>
        <style>{`
          .nav {
            background: white;
            border-bottom: 1px solid #E4DFD8;
            padding: 0 24px;
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 68px;
          }
          .nav-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 700;
            color: #0A1628;
          }
          .nav-logo img { height: 34px; width: auto; }
          .nav-logo-text { letter-spacing: -0.02em; }
          .btn-gold {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 10px 28px;
            background: linear-gradient(135deg, #C9A227 0%, #D4B84A 50%, #E8D9A8 100%);
            color: #0A1628;
            border: none;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            box-shadow: 0 2px 16px rgba(201, 162, 39, 0.25);
            letter-spacing: 0.02em;
          }
          .btn-gold:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
          }
          .btn-gold:active { transform: translateY(0); }
          @media (max-width: 768px) {
            .nav { padding: 0 16px; }
            .nav-logo-text { display: none; }
            .btn-gold { padding: 8px 18px; font-size: 13px; }
          }
        `}</style>
      </nav>
    );
  }

  // ============================================================
  // ОСНОВНАЯ ВЕРСИЯ (С ПРОФИЛЕМ)
  // ============================================================
  return (
    <nav className="nav">
      <div className="nav-container">

        {/* ЛОГОТИП */}
        <Link to="/" className="nav-logo">
          <img src={logo} alt="ДОД" />
          <span className="nav-logo-text">Дипломаты будущего</span>
        </Link>

        {/* ДЕСКТОПНОЕ МЕНЮ */}
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

        {/* ПРАВАЯ ЧАСТЬ */}
        <div className="nav-right">

          {/* УВЕДОМЛЕНИЯ */}
          <div className="nav-notifications" ref={notificationRef}>
            <button
              className="nav-notif-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Уведомления"
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
                    <button onClick={markAllRead} className="nav-notif-markall">
                      Прочитать все
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="nav-notif-empty">Нет уведомлений</div>
                ) : (
                  <div className="nav-notif-list">
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`nav-notif-item ${!n.read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(n.id)}
                      >
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
                  Все уведомления →
                </Link>
              </div>
            )}
          </div>

          {/* ПРОФИЛЬ */}
          <div className="nav-profile" ref={profileRef}>
            <button
              className="nav-profile-btn"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-label="Профиль"
            >
              <div className="nav-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Аватар" />
                ) : (
                  getInitials(profile?.full_name)
                )}
              </div>
              <span className="nav-profile-name">{profile?.full_name}</span>
              <svg width="12" height="12" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1.5L6 6.5L11 1.5" />
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

                <div className="nav-profile-divider" />

                <Link
                  to="/profile"
                  className="nav-profile-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Профиль
                </Link>
                <Link
                  to="/my-achievements"
                  className="nav-profile-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Достижения
                </Link>
                <Link
                  to="/my-reviews"
                  className="nav-profile-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Оценки
                </Link>

                <div className="nav-profile-divider" />

                <button
                  className="nav-profile-item nav-profile-logout"
                  onClick={handleLogout}
                >
                  Выйти
                </button>
              </div>
            )}
          </div>

          {/* МОБИЛЬНЫЙ БУРГЕР */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Меню"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

        </div>
      </div>

      {/* МОБИЛЬНОЕ МЕНЮ */}
      {isMenuOpen && (
        <div className="nav-mobile" ref={menuRef}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-mobile-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="nav-mobile-divider" />
          <Link
            to="/profile"
            className="nav-mobile-link"
            onClick={() => setIsMenuOpen(false)}
          >
            Профиль
          </Link>
          <button
            className="nav-mobile-logout"
            onClick={handleLogout}
          >
            Выйти
          </button>
        </div>
      )}

      <style>{`
        /* ============================================================
           NAV
           ============================================================ */
        .nav {
          background: white;
          border-bottom: 1px solid #E4DFD8;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 4px rgba(10, 22, 40, 0.03);
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 68px;
          gap: 16px;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: #0A1628;
          flex-shrink: 0;
        }

        .nav-logo img {
          height: 34px;
          width: auto;
        }

        .nav-logo-text {
          letter-spacing: -0.02em;
        }

        /* ============================================================
           ДЕСКТОПНОЕ МЕНЮ
           ============================================================ */
        .nav-desktop {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          overflow-x: auto;
          padding: 0 8px;
        }

        .nav-link {
          padding: 7px 18px;
          border-radius: 8px;
          text-decoration: none;
          color: #6B6561;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }

        .nav-link:hover {
          background: #F8F6F2;
          color: #0A1628;
        }

        .nav-link.active {
          background: #FBF4DC;
          color: #C9A227;
          font-weight: 600;
        }

        /* ============================================================
           ПРАВАЯ ЧАСТЬ
           ============================================================ */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* ============================================================
           КНОПКА ВХОДА (ПУБЛИЧНАЯ)
           ============================================================ */
        .btn-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 28px;
          background: linear-gradient(135deg, #C9A227 0%, #D4B84A 50%, #E8D9A8 100%);
          color: #0A1628;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          box-shadow: 0 2px 16px rgba(201, 162, 39, 0.25);
          letter-spacing: 0.02em;
        }

        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
        }

        .btn-gold:active {
          transform: translateY(0);
          box-shadow: 0 2px 12px rgba(201, 162, 39, 0.2);
        }

        /* ============================================================
           УВЕДОМЛЕНИЯ
           ============================================================ */
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
          color: #6B6561;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .nav-notif-btn:hover {
          background: #F8F6F2;
          color: #0A1628;
        }

        .nav-notif-badge {
          position: absolute;
          top: 3px;
          right: 3px;
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

        .nav-notif-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 360px;
          max-height: 440px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(10, 22, 40, 0.12);
          border: 1px solid #E4DFD8;
          overflow: hidden;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .nav-notif-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid #F0EDE8;
          font-weight: 600;
          font-size: 14px;
          color: #0A1628;
          flex-shrink: 0;
          font-family: 'Playfair Display', serif;
        }

        .nav-notif-markall {
          background: none;
          border: none;
          color: #6B6561;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          transition: color 0.2s ease;
        }

        .nav-notif-markall:hover {
          color: #0A1628;
        }

        .nav-notif-list {
          overflow-y: auto;
          flex: 1;
        }

        .nav-notif-item {
          padding: 12px 18px;
          border-bottom: 1px solid #F0EDE8;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-notif-item:hover {
          background: #F8F6F2;
        }

        .nav-notif-item.unread {
          background: #FBF4DC;
          border-left: 3px solid #C9A227;
        }

        .nav-notif-title {
          font-weight: 600;
          font-size: 13px;
          color: #0A1628;
        }

        .nav-notif-message {
          font-size: 13px;
          color: #6B6561;
          margin-top: 2px;
        }

        .nav-notif-time {
          font-size: 11px;
          color: #A8A29A;
          margin-top: 4px;
        }

        .nav-notif-empty {
          padding: 32px;
          text-align: center;
          color: #A8A29A;
          font-size: 14px;
        }

        .nav-notif-all {
          display: block;
          padding: 12px 18px;
          text-align: center;
          border-top: 1px solid #F0EDE8;
          color: #0A1628;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
        }

        .nav-notif-all:hover {
          background: #F8F6F2;
        }

        /* ============================================================
           ПРОФИЛЬ
           ============================================================ */
        .nav-profile {
          position: relative;
        }

        .nav-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 14px 4px 4px;
          border: none;
          background: transparent;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #0A1628;
        }

        .nav-profile-btn:hover {
          background: #F8F6F2;
        }

        .nav-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0A1628, #1A3555);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
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
          font-size: 14px;
          font-weight: 500;
          color: #0A1628;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-profile-btn svg {
          color: #A8A29A;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .nav-profile-btn:hover svg {
          transform: rotate(180deg);
        }

        .nav-profile-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 240px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(10, 22, 40, 0.12);
          border: 1px solid #E4DFD8;
          overflow: hidden;
          z-index: 1000;
        }

        .nav-profile-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
        }

        .nav-profile-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0A1628, #1A3555);
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
          color: #0A1628;
        }

        .nav-profile-role {
          font-size: 12px;
          color: #6B6561;
          text-transform: capitalize;
        }

        .nav-profile-divider {
          height: 1px;
          background: #F0EDE8;
          margin: 0 12px;
        }

        .nav-profile-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          color: #0A1628;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          text-align: left;
        }

        .nav-profile-item:hover {
          background: #F8F6F2;
        }

        .nav-profile-logout {
          color: #B3262E;
        }

        .nav-profile-logout:hover {
          background: #FCEBEC;
        }

        /* ============================================================
           МОБИЛЬНОЕ МЕНЮ
           ============================================================ */
        .nav-mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #0A1628;
          padding: 8px 4px;
        }

        .nav-mobile {
          display: none;
          position: absolute;
          top: 68px;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid #E4DFD8;
          padding: 12px 16px 20px;
          flex-direction: column;
          gap: 2px;
          box-shadow: 0 8px 32px rgba(10, 22, 40, 0.06);
          max-height: calc(100vh - 68px);
          overflow-y: auto;
          z-index: 999;
        }

        .nav-mobile-link {
          padding: 10px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #0A1628;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .nav-mobile-link:hover {
          background: #F8F6F2;
        }

        .nav-mobile-link.active {
          background: #FBF4DC;
          color: #C9A227;
        }

        .nav-mobile-divider {
          height: 1px;
          background: #F0EDE8;
          margin: 8px 0;
        }

        .nav-mobile-logout {
          padding: 10px 14px;
          border: none;
          background: none;
          text-align: left;
          font-size: 14px;
          color: #B3262E;
          cursor: pointer;
          border-radius: 8px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
        }

        .nav-mobile-logout:hover {
          background: #FCEBEC;
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
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
            display: none;
          }

          .nav-notif-dropdown {
            width: 320px;
            right: -40px;
          }
        }

        @media (max-width: 480px) {
          .nav {
            padding: 0 12px;
          }

          .nav-notif-dropdown {
            width: 290px;
            right: -60px;
          }

          .nav-profile-btn {
            padding: 4px;
          }

          .nav-avatar {
            width: 32px;
            height: 32px;
            font-size: 12px;
          }

          .nav-profile-dropdown {
            width: 200px;
            right: -10px;
          }
        }
      `}</style>
    </nav>
  );
}