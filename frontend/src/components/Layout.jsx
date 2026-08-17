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
  const sidebarRef = useRef(null);

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
  // ЗАКРЫТИЕ ПОПАПОВ ПРИ КЛИКЕ ВНЕ
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (sidebarRef.current && window.innerWidth < 1024) {
        // Не закрываем сайдбар при клике внутри
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
        setIsMobileSidebarOpen(false);
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
  // МЕНЮ САЙДБАРА
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
      items.push({ path: '/documents-center', label: 'Документы', icon: '📁' });
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
    return <>{children}</>;
  }

  // ============================================================
  // ОСНОВНОЙ РЕНДЕР
  // ============================================================
  const sidebarOpen = window.innerWidth < 1024 ? isMobileSidebarOpen : isSidebarOpen;

  return (
    <div className="layout" ref={sidebarRef}>
      {/* САЙДБАР */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* ЛОГОТИП */}
        <div className="sidebar-brand">
          <img src={logo} alt="ДОД" className="sidebar-logo" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">Дипломаты</span>
            <span className="sidebar-brand-subtitle">будущего</span>
          </div>
        </div>

        {/* ПРОФИЛЬ В САЙДБАРЕ */}
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

        {/* МЕНЮ */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileSidebarOpen(false);
                }
              }}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* ВЫХОД */}
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>

      {/* ОВЕРЛЕЙ ДЛЯ МОБИЛЬНОГО САЙДБАРА */}
      {window.innerWidth < 1024 && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="main-content">
        {/* ХЕДЕР — ТОЛЬКО БУРГЕР + ПРОФИЛЬ + УВЕДОМЛЕНИЯ */}
        <header className="main-header">
          {/* БУРГЕР */}
          <button
            className="main-header-toggle"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* ЗАГОЛОВОК СТРАНИЦЫ В ХЕДЕРЕ */}
          <div className="main-header-title">
            {location.pathname === '/dashboard' && 'Дашборд'}
            {location.pathname === '/events' && 'Мероприятия'}
            {location.pathname === '/calendar' && 'Календарь'}
            {location.pathname === '/clubs' && 'КЮДы'}
            {location.pathname === '/participants' && 'Участники'}
            {location.pathname === '/profile' && 'Профиль'}
            {location.pathname === '/reports' && 'Отчёты'}
            {location.pathname === '/analytics' && 'Аналитика'}
            {location.pathname === '/appeals' && 'Обращения'}
            {location.pathname === '/documents-center' && 'Центр документов'}
            {location.pathname === '/manage-achievements' && 'Управление достижениями'}
            {location.pathname === '/my-achievements' && 'Мои достижения'}
          </div>

          {/* ПРАВАЯ ЧАСТЬ ХЕДЕРА */}
          <div className="main-header-right">
            {/* УВЕДОМЛЕНИЯ */}
            <div className="header-notifications" ref={notificationRef}>
              <button
                className="header-notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Уведомления"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
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

            {/* ПРОФИЛЬ В ХЕДЕРЕ */}
            <div className="header-profile" ref={profileRef}>
              <button
                className="header-profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="Профиль"
              >
                <div className="header-avatar">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Аватар" />
                  ) : (
                    getInitials(profile?.full_name)
                  )}
                </div>
                <span className="header-profile-name">{profile?.full_name}</span>
                <svg width="12" height="12" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 1.5L6 6.5L11 1.5" />
                </svg>
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
                  <div className="header-dropdown-divider" />
                  <button className="header-dropdown-item header-dropdown-logout" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* КОНТЕНТ СТРАНИЦЫ */}
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
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          flex-shrink: 0;
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
          flex-shrink: 0;
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
          letter-spacing: 0.3px;
        }

        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
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
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-profile-role {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          text-transform: capitalize;
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

        .sidebar-link-label {
          white-space: nowrap;
        }

        .sidebar-footer {
          padding: 12px 20px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
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
          animation: overlayFade 0.3s ease;
        }

        @keyframes overlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
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
          transition: margin-left 0.3s ease;
        }

        /* ============================================================
           HEADER
           ============================================================ */
        .main-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 32px;
          background: white;
          border-bottom: 1px solid #E4E7EC;
          position: sticky;
          top: 0;
          z-index: 100;
          min-height: 60px;
          gap: 16px;
        }

        .main-header-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: #667085;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .main-header-toggle:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .main-header-title {
          flex: 1;
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #0B1F3A;
          letter-spacing: -0.2px;
        }

        .main-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* ============================================================
           УВЕДОМЛЕНИЯ В ХЕДЕРЕ
           ============================================================ */
        .header-notifications {
          position: relative;
        }

        .header-notif-btn {
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          border-radius: 50%;
          cursor: pointer;
          color: #667085;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .header-notif-btn:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .header-notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
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
          right: -8px;
          width: 360px;
          max-height: 440px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(11, 31, 58, 0.15);
          border: 1px solid #E4E7EC;
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
          font-size: 14px;
          color: #0B1F3A;
          flex-shrink: 0;
        }

        .header-notif-markall {
          background: none;
          border: none;
          color: #667085;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
        }

        .header-notif-markall:hover {
          color: #0B1F3A;
        }

        .header-notif-list {
          overflow-y: auto;
          flex: 1;
        }

        .header-notif-item {
          padding: 10px 16px;
          border-bottom: 1px solid #F4F6F9;
          cursor: pointer;
          transition: all 0.2s ease;
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
          flex-shrink: 0;
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
          font-size: 13px;
          color: #0B1F3A;
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
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-profile-btn svg {
          color: #98A2B3;
          flex-shrink: 0;
        }

        .header-profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 200px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(11, 31, 58, 0.15);
          border: 1px solid #E4E7EC;
          overflow: hidden;
          z-index: 1000;
        }

        .header-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
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

        .header-dropdown-divider {
          height: 1px;
          background: #F4F6F9;
          margin: 4px 12px;
        }

        .header-dropdown-logout {
          color: #B3262E;
        }

        .header-dropdown-logout:hover {
          background: #FCEBEC;
        }

        /* ============================================================
           КОНТЕНТ
           ============================================================ */
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
            padding: 8px 20px;
            min-height: 56px;
          }

          .main-content-body {
            padding: 16px 20px 32px;
          }

          .main-header-title {
            font-size: 16px;
          }

          .header-profile-name {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .main-header {
            padding: 6px 16px;
            min-height: 52px;
            gap: 10px;
          }

          .main-content-body {
            padding: 12px 16px 24px;
          }

          .main-header-title {
            font-size: 15px;
          }

          .header-notif-dropdown {
            width: 320px;
            right: -50px;
          }

          .header-profile-dropdown {
            width: 180px;
          }

          .sidebar {
            width: 280px;
          }
        }

        @media (max-width: 480px) {
          .main-header {
            padding: 4px 12px;
            min-height: 48px;
          }

          .main-content-body {
            padding: 8px 12px 16px;
          }

          .main-header-title {
            font-size: 13px;
          }

          .main-header-toggle {
            width: 32px;
            height: 32px;
          }

          .main-header-toggle svg {
            width: 20px;
            height: 20px;
          }

          .header-notif-btn {
            width: 32px;
            height: 32px;
          }

          .header-notif-btn svg {
            width: 18px;
            height: 18px;
          }

          .header-notif-badge {
            width: 16px;
            height: 16px;
            font-size: 9px;
            top: 2px;
            right: 2px;
          }

          .header-notif-dropdown {
            width: 290px;
            right: -60px;
          }

          .header-profile-btn {
            padding: 4px;
          }

          .header-avatar {
            width: 28px;
            height: 28px;
            font-size: 10px;
          }

          .header-profile-dropdown {
            width: 160px;
            right: -20px;
          }

          .header-dropdown-item {
            padding: 8px 14px;
            font-size: 12px;
          }

          .sidebar {
            width: 100%;
            max-width: 300px;
          }

          .sidebar-brand {
            padding: 14px 16px;
          }

          .sidebar-brand-title {
            font-size: 16px;
          }

          .sidebar-profile {
            padding: 10px 16px;
          }

          .sidebar-avatar {
            width: 32px;
            height: 32px;
            font-size: 12px;
          }

          .sidebar-profile-name {
            font-size: 12px;
          }

          .sidebar-link {
            padding: 8px 12px;
            font-size: 12px;
          }

          .sidebar-link-icon {
            font-size: 16px;
            width: 20px;
          }
        }
      `}</style>
    </div>
  );
}