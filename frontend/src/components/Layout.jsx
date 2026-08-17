// frontend/src/components/Layout.jsx

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/Image.png';

export default function Layout({ children, profile }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

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
  // ЗАКРЫТИЕ ПОПАПОВ
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================
  // АДАПТИВНОСТЬ САЙДБАРА
  // ============================================================
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
        setIsMobileSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  // УВЕДОМЛЕНИЯ
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
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
  // МЕНЮ ДЛЯ САЙДБАРА
  // ============================================================
  const getMenuItems = () => {
    const role = profile?.role;
    const items = [];

    items.push({ path: '/dashboard', label: 'Дашборд', icon: '📊' });

    if (role === 'participant' || role === 'parent') {
      items.push({ path: '/events', label: 'Мероприятия', icon: '📅' });
      items.push({ path: '/calendar', label: 'Календарь', icon: '📆' });
      items.push({ path: '/my-achievements', label: 'Достижения', icon: '🏆' });
      items.push({ path: '/my-reviews', label: 'Оценки', icon: '📊' });
      if (profile?.is_president) {
        items.push({ path: '/president-tasks', label: 'Задания', icon: '👑' });
      }
    }

    if (role === 'club_coordinator') {
      items.push({ path: '/clubs', label: 'КЮД', icon: '🏫' });
      items.push({ path: '/events', label: 'Мероприятия', icon: '📅' });
      items.push({ path: '/participants', label: 'Участники', icon: '👥' });
      items.push({ path: '/manage-achievements', label: 'Достижения', icon: '🏆' });
      items.push({ path: '/reports', label: 'Отчёты', icon: '📋' });
      items.push({ path: '/appeals', label: 'Обращения', icon: '📨' });
      items.push({ path: '/staff', label: 'Сотрудники', icon: '👤' });
      items.push({ path: '/calendar', label: 'Календарь', icon: '📆' });
      items.push({ path: '/documents-center', label: 'Центр документов', icon: '📁' });
    }

    if (role === 'tutor') {
      items.push({ path: '/clubs', label: 'КЮДы', icon: '🏫' });
      items.push({ path: '/events', label: 'Мероприятия', icon: '📅' });
      items.push({ path: '/participants', label: 'Участники', icon: '👥' });
      items.push({ path: '/achievements', label: 'Достижения', icon: '🏆' });
      items.push({ path: '/my-reviews', label: 'Оценки', icon: '📊' });
      items.push({ path: '/my-journal', label: 'Журнал', icon: '📓' });
      items.push({ path: '/staff-calendar', label: 'Календарь', icon: '📆' });
      items.push({ path: '/tutor-assignments', label: 'Назначения', icon: '📋' });
      items.push({ path: '/reports', label: 'Отчёты', icon: '📋' });
    }

    if (role === 'movement_coordinator' || role === 'admin') {
      items.push({ path: '/clubs', label: 'КЮДы', icon: '🏫' });
      items.push({ path: '/clubs-management', label: 'Управление', icon: '⚙️' });
      items.push({ path: '/events', label: 'Мероприятия', icon: '📅' });
      items.push({ path: '/participants', label: 'Участники', icon: '👥' });
      items.push({ path: '/achievements', label: 'Достижения', icon: '🏆' });
      items.push({ path: '/achievements-categories', label: 'Категории', icon: '🏷️' });
      items.push({ path: '/reports', label: 'Отчёты', icon: '📋' });
      items.push({ path: '/analytics', label: 'Аналитика', icon: '📊' });
      items.push({ path: '/appeals', label: 'Обращения', icon: '📨' });
      items.push({ path: '/documents-center', label: 'Документы', icon: '📁' });
      items.push({ path: '/mass-notifications', label: 'Уведомления', icon: '📨' });
      items.push({ path: '/notification-history', label: 'История', icon: '📋' });
      items.push({ path: '/activity-log', label: 'Журнал', icon: '📋' });
      items.push({ path: '/consents-management', label: 'Согласия', icon: '📝' });
      items.push({ path: '/goals', label: 'Цели', icon: '🎯' });
      items.push({ path: '/tasks-planner', label: 'Планировщик', icon: '📅' });
      items.push({ path: '/admin/users', label: 'Пользователи', icon: '👥' });
      if (role === 'admin') {
        items.push({ path: '/admin/invite', label: 'Пригласить', icon: '🎫' });
        items.push({ path: '/import-participants', label: 'Импорт', icon: '📥' });
        items.push({ path: '/settings', label: 'Настройки', icon: '⚙️' });
      }
    }

    if (role === 'president' || role === 'vice_president') {
      items.push({ path: '/clubs', label: 'КЮДы', icon: '🏫' });
      items.push({ path: '/events', label: 'Мероприятия', icon: '📅' });
      items.push({ path: '/participants', label: 'Участники', icon: '👥' });
      items.push({ path: '/achievements', label: 'Достижения', icon: '🏆' });
      items.push({ path: '/reports', label: 'Отчёты', icon: '📋' });
      items.push({ path: '/analytics', label: 'Аналитика', icon: '📊' });
      items.push({ path: '/appeals', label: 'Обращения', icon: '📨' });
      items.push({ path: '/documents-center', label: 'Документы', icon: '📁' });
      items.push({ path: '/president-tasks', label: 'Задания', icon: '👑' });
      items.push({ path: '/club-rating', label: 'Рейтинг', icon: '🏆' });
    }

    return items;
  };

  const menuItems = getMenuItems();

  // ============================================================
  // ЕСЛИ НЕТ ПРОФИЛЯ — ПУБЛИЧНАЯ ЧАСТЬ
  // ============================================================
  if (!profile) {
    return (
      <div className="layout-public">
        {children}
        <style>{`
          .layout-public {
            min-height: 100vh;
            background: #F5F6F8;
          }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // ОСНОВНОЙ РЕНДЕР С САЙДБАРОМ
  // ============================================================
  return (
    <div className="layout">
      {/* Сайдбар */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logo} alt="ДОД" className="sidebar-logo" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">Дипломаты</span>
            <span className="sidebar-brand-subtitle">будущего</span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Аватар" />
            ) : (
              getInitials(profile?.full_name)
            )}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{profile?.full_name}</div>
            <div className="sidebar-profile-role">{profile?.role}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Оверлей для мобильного сайдбара */}
      {window.innerWidth < 1024 && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Основной контент */}
      <main className="main-content">
        <header className="main-header">
          <button
            className="main-header-toggle"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsSidebarOpen(!isSidebarOpen);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
          >
            ☰
          </button>

          <div className="main-header-right">
            {/* Уведомления */}
            <div className="header-notifications" ref={notificationRef}>
              <button
                className="header-notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="header-notif-badge">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="header-notif-dropdown">
                  <div className="header-notif-header">
                    <span>Уведомления</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="header-notif-markall">
                        Прочитать все
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="header-notif-empty">Нет уведомлений</div>
                  ) : (
                    <div className="header-notif-list">
                      {notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`header-notif-item ${!n.read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(n.id)}
                        >
                          <div className="header-notif-title">{n.title}</div>
                          <div className="header-notif-message">{n.message}</div>
                          <div className="header-notif-time">
                            {new Date(n.created_at).toLocaleString('ru-RU')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/notification-history" className="header-notif-all">
                    Все уведомления →
                  </Link>
                </div>
              )}
            </div>

            {/* Профиль */}
            <div className="header-profile" ref={profileRef}>
              <button
                className="header-profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="header-avatar">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Аватар" />
                  ) : (
                    getInitials(profile?.full_name)
                  )}
                </div>
                <span className="header-profile-name">{profile?.full_name}</span>
              </button>

              {isProfileOpen && (
                <div className="header-profile-dropdown">
                  <Link to="/profile" className="header-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                    Профиль
                  </Link>
                  <Link to="/my-achievements" className="header-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                    Достижения
                  </Link>
                  <Link to="/my-reviews" className="header-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                    Оценки
                  </Link>
                  <button className="header-dropdown-item header-dropdown-logout" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="main-content-body">{children}</div>
      </main>

      <style>{`
        /* ============================================================
           LAYOUT
           ============================================================ */
        .layout {
          display: flex;
          min-height: 100vh;
          background: #F5F6F8;
        }

        /* ============================================================
           SIDEBAR
           ============================================================ */
        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: #0B1F3A;
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 1000;
          transition: transform 0.3s ease;
          overflow-y: auto;
        }

        .sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .sidebar-logo {
          height: 36px;
          width: auto;
          filter: brightness(0) invert(1);
        }

        .sidebar-brand-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .sidebar-brand-subtitle {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
        }

        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #C9A227, #E8D9A8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0B1F3A;
          font-size: 14px;
          font-weight: 600;
          flex-shrink: 0;
          overflow: hidden;
        }

        .sidebar-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sidebar-profile-name {
          font-size: 13px;
          font-weight: 500;
          color: white;
        }

        .sidebar-profile-role {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 12px 8px;
          overflow-y: auto;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 14px;
          border-radius: 8px;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          font-size: 13px;
          font-weight: 400;
          transition: all 0.2s ease;
          margin-bottom: 1px;
        }

        .sidebar-link:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }

        .sidebar-link.active {
          background: rgba(255,255,255,0.08);
          color: white;
        }

        .sidebar-link.active .sidebar-link-icon {
          color: #C9A227;
        }

        .sidebar-link-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 12px 20px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .sidebar-logout {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border: none;
          background: rgba(255,255,255,0.04);
          border-radius: 8px;
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .sidebar-logout:hover {
          background: rgba(179, 38, 46, 0.2);
          color: #FED7D7;
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.4);
          z-index: 999;
        }

        /* ============================================================
           MAIN CONTENT
           ============================================================ */
        .main-content {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 32px;
          background: white;
          border-bottom: 1px solid #E2E7EF;
          position: sticky;
          top: 0;
          z-index: 100;
          min-height: 64px;
        }

        .main-header-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 20px;
          color: #667085;
          transition: all 0.2s ease;
        }

        .main-header-toggle:hover {
          background: #F4F6F9;
        }

        .main-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ============================================================
           УВЕДОМЛЕНИЯ
           ============================================================ */
        .header-notifications {
          position: relative;
        }

        .header-notif-btn {
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

        .header-notif-btn:hover {
          background: #F4F6F9;
        }

        .header-notif-badge {
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

        .header-notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          max-height: 420px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
          overflow: hidden;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .header-notif-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #F4F6F9;
          font-weight: 600;
          color: #0B1F3A;
        }

        .header-notif-markall {
          background: none;
          border: none;
          color: #174A7E;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
        }

        .header-notif-markall:hover {
          text-decoration: underline;
        }

        .header-notif-list {
          overflow-y: auto;
          flex: 1;
        }

        .header-notif-item {
          padding: 10px 16px;
          border-bottom: 1px solid #F4F6F9;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .header-notif-item:hover {
          background: #F8FAFC;
        }

        .header-notif-item.unread {
          background: #FBF4DC;
          border-left: 3px solid #C9A227;
        }

        .header-notif-title {
          font-weight: 600;
          font-size: 13px;
          color: #0B1F3A;
        }

        .header-notif-message {
          font-size: 13px;
          color: #667085;
          margin-top: 2px;
        }

        .header-notif-time {
          font-size: 11px;
          color: #98A2B3;
          margin-top: 4px;
        }

        .header-notif-empty {
          padding: 30px;
          text-align: center;
          color: #98A2B3;
          font-size: 14px;
        }

        .header-notif-all {
          display: block;
          padding: 10px 16px;
          text-align: center;
          border-top: 1px solid #F4F6F9;
          color: #174A7E;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }

        .header-notif-all:hover {
          background: #F8FAFC;
        }

        /* ============================================================
           ПРОФИЛЬ В ХЕДЕРЕ
           ============================================================ */
        .header-profile {
          position: relative;
        }

        .header-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border: none;
          background: transparent;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .header-profile-btn:hover {
          background: #F4F6F9;
        }

        .header-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
          overflow: hidden;
        }

        .header-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-profile-name {
          font-size: 13px;
          font-weight: 500;
          color: #0B1F3A;
        }

        .header-profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 200px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
          overflow: hidden;
          z-index: 1000;
        }

        .header-dropdown-item {
          display: block;
          padding: 10px 18px;
          color: #0B1F3A;
          text-decoration: none;
          font-size: 13px;
          transition: all 0.2s ease;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }

        .header-dropdown-item:hover {
          background: #F4F6F9;
        }

        .header-dropdown-logout {
          color: #B3262E;
          border-top: 1px solid #F4F6F9;
        }

        .header-dropdown-logout:hover {
          background: #FCEBEC;
        }

        .main-content-body {
          flex: 1;
          padding: 24px 32px 40px;
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main-content {
            margin-left: 0;
          }

          .main-header {
            padding: 10px 20px;
          }

          .main-content-body {
            padding: 16px 20px 32px;
          }

          .header-profile-name {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .main-header {
            padding: 8px 16px;
            min-height: 56px;
          }

          .main-content-body {
            padding: 12px 16px 24px;
          }

          .header-notif-dropdown {
            width: 300px;
            right: -60px;
          }
        }

        @media (max-width: 480px) {
          .main-header {
            padding: 6px 12px;
            min-height: 48px;
          }

          .main-content-body {
            padding: 8px 12px 16px;
          }

          .sidebar {
            width: 100%;
            max-width: 320px;
          }

          .header-notif-dropdown {
            width: 280px;
            right: -80px;
          }
        }
      `}</style>
    </div>
  );
}