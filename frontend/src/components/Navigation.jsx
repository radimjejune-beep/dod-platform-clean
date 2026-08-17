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
      items.push({ path: '/documents-center', label: 'Центр документов' });
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
      items.push({ path: '/clubs-management', label: 'Управление КЮДами' });
      items.push({ path: '/events', label: 'Мероприятия' });
      items.push({ path: '/participants', label: 'Участники' });
      items.push({ path: '/achievements', label: 'Достижения' });
      items.push({ path: '/achievements-categories', label: 'Категории' });
      items.push({ path: '/reports', label: 'Отчёты' });
      items.push({ path: '/analytics', label: 'Аналитика' });
      items.push({ path: '/appeals', label: 'Обращения' });
      items.push({ path: '/documents-center', label: 'Центр документов' });
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
      items.push({ path: '/documents-center', label: 'Центр документов' });
      items.push({ path: '/president-tasks', label: 'Задания' });
      items.push({ path: '/club-rating', label: 'Рейтинг' });
    }

    return items;
  };

  const menuItems = getMenuItems();

  if (!profile) {
    return (
      <nav className="nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <img src={logo} alt="ДОД" />
            <span>Дипломаты будущего</span>
          </Link>
          <div className="nav-right">
            <Link to="/login" className="nav-login-btn">Вход</Link>
          </div>
        </div>
        <style>{`
          .nav {
            background: white;
            border-bottom: 1px solid #E2E7EF;
            padding: 0 24px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 4px rgba(11, 31, 58, 0.04);
          }
          .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 64px;
          }
          .nav-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            font-weight: 700;
            color: #0B1F3A;
          }
          .nav-logo img { height: 32px; width: auto; }
          .nav-login-btn {
            padding: 8px 24px;
            background: linear-gradient(135deg, #C9A227, #B8921F);
            color: #0B1F3A;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          .nav-login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(201, 162, 39, 0.3);
          }
          @media (max-width: 768px) { .nav-logo span { display: none; } }
        `}</style>
      </nav>
    );
  }

  return (
    <nav className="nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <img src={logo} alt="ДОД" />
          <span>Дипломаты будущего</span>
        </Link>

        <div className="nav-desktop-menu">
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

        <div className="nav-right">
          <div className="nav-notifications" ref={notificationRef}>
            <button
              className="nav-notif-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
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
              <span className="nav-profile-arrow">▾</span>
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
                <Link to="/profile" className="nav-profile-item" onClick={() => setIsProfileOpen(false)}>
                  Профиль
                </Link>
                <Link to="/my-achievements" className="nav-profile-item" onClick={() => setIsProfileOpen(false)}>
                  Достижения
                </Link>
                <Link to="/my-reviews" className="nav-profile-item" onClick={() => setIsProfileOpen(false)}>
                  Оценки
                </Link>
                <div className="nav-profile-divider" />
                <button className="nav-profile-item nav-profile-logout" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            )}
          </div>

          <button className="nav-mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            ☰
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="nav-mobile-menu" ref={menuRef}>
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
          <Link to="/profile" className="nav-mobile-link" onClick={() => setIsMenuOpen(false)}>
            Профиль
          </Link>
          <button className="nav-mobile-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}

      <style>{`
        .nav {
          background: white;
          border-bottom: 1px solid #E2E7EF;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 4px rgba(11, 31, 58, 0.04);
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          gap: 16px;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: #0B1F3A;
          flex-shrink: 0;
        }
        .nav-logo img { height: 32px; width: auto; }

        .nav-desktop-menu {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          overflow-x: auto;
          padding: 0 8px;
        }

        .nav-link {
          padding: 6px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover { background: #F4F6F9; color: #0B1F3A; }
        .nav-link.active { background: #FBF4DC; color: #8A6A00; }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .nav-notifications { position: relative; }

        .nav-notif-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          position: relative;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-notif-btn:hover { background: #F4F6F9; }

        .nav-notif-badge {
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

        .nav-notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 380px;
          max-height: 440px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
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
          border-bottom: 1px solid #F4F6F9;
          font-weight: 600;
          color: #0B1F3A;
          flex-shrink: 0;
        }

        .nav-notif-markall {
          background: none;
          border: none;
          color: #174A7E;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
        }
        .nav-notif-markall:hover { text-decoration: underline; }

        .nav-notif-list { overflow-y: auto; flex: 1; }

        .nav-notif-item {
          padding: 12px 18px;
          border-bottom: 1px solid #F4F6F9;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .nav-notif-item:hover { background: #F8FAFC; }
        .nav-notif-item.unread { background: #FBF4DC; border-left: 3px solid #C9A227; }

        .nav-notif-title { font-weight: 600; font-size: 13px; color: #0B1F3A; }
        .nav-notif-message { font-size: 13px; color: #667085; margin-top: 2px; }
        .nav-notif-time { font-size: 11px; color: #98A2B3; margin-top: 4px; }

        .nav-notif-empty {
          padding: 30px;
          text-align: center;
          color: #98A2B3;
          font-size: 14px;
        }

        .nav-notif-all {
          display: block;
          padding: 10px 18px;
          text-align: center;
          border-top: 1px solid #F4F6F9;
          color: #174A7E;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .nav-notif-all:hover { background: #F8FAFC; }

        .nav-profile { position: relative; }

        .nav-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border: none;
          background: transparent;
          border-radius: 30px;
          cursor: pointer;
          transition: background 0.2s ease;
          font-family: inherit;
        }
        .nav-profile-btn:hover { background: #F4F6F9; }

        .nav-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .nav-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .nav-profile-name {
          font-size: 14px;
          font-weight: 500;
          color: #0B1F3A;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nav-profile-arrow { font-size: 12px; color: #98A2B3; }

        .nav-profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 260px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
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
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .nav-profile-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .nav-profile-fullname { font-weight: 600; color: #0B1F3A; font-size: 14px; }
        .nav-profile-role { font-size: 12px; color: #667085; }

        .nav-profile-divider { height: 1px; background: #F4F6F9; margin: 0 12px; }

        .nav-profile-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          color: #0B1F3A;
          text-decoration: none;
          font-size: 14px;
          transition: background 0.2s ease;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }
        .nav-profile-item:hover { background: #F4F6F9; }

        .nav-profile-logout { color: #B3262E; }
        .nav-profile-logout:hover { background: #FCEBEC; }

        .nav-mobile-toggle {
          display: none;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #0B1F3A;
          padding: 8px 4px;
        }

        .nav-mobile-menu {
          display: none;
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid #E2E7EF;
          padding: 12px 24px 20px;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 8px 24px rgba(11, 31, 58, 0.08);
          max-height: calc(100vh - 64px);
          overflow-y: auto;
          z-index: 999;
        }

        .nav-mobile-menu.open { display: flex; }

        .nav-mobile-link {
          padding: 10px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #0B1F3A;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }
        .nav-mobile-link:hover { background: #F4F6F9; }
        .nav-mobile-link.active { background: #FBF4DC; color: #8A6A00; }

        .nav-mobile-divider { height: 1px; background: #F4F6F9; margin: 8px 0; }

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
          font-family: inherit;
          transition: background 0.2s ease;
        }
        .nav-mobile-logout:hover { background: #FCEBEC; }

        @media (max-width: 1024px) {
          .nav-desktop-menu { display: none; }
          .nav-mobile-toggle { display: block; }
          .nav-mobile-menu { display: flex; }
          .nav-profile-name { display: none; }
          .nav-profile-arrow { display: none; }
        }

        @media (max-width: 768px) {
          .nav { padding: 0 16px; }
          .nav-logo span { display: none; }
          .nav-profile-name { display: none; }
          .nav-notif-dropdown { width: 320px; right: -60px; }
          .nav-mobile-menu { padding: 12px 16px 20px; }
        }

        @media (max-width: 480px) {
          .nav { padding: 0 12px; }
          .nav-notif-dropdown { width: 290px; right: -80px; }
          .nav-profile-btn { padding: 4px; }
          .nav-avatar { width: 32px; height: 32px; font-size: 12px; }
        }
      `}</style>
    </nav>
  );
}