// frontend/src/components/Layout.jsx

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/Image.png';

// ============================================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ ДЛЯ УВЕДОМЛЕНИЙ
// ============================================================
let notificationsCache = null;
let unreadCountCache = 0;
let isNotificationsLoaded = false;

export default function Layout({ children, profile }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(notificationsCache || []);
  const [unreadCount, setUnreadCount] = useState(unreadCountCache);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

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
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  // ЗАГРУЗКА УВЕДОМЛЕНИЙ
  // ============================================================
  const loadNotifications = async () => {
    if (isNotificationsLoaded && notificationsCache) {
      setNotifications(notificationsCache);
      setUnreadCount(unreadCountCache);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('https://dod-backend.relaxdev.ru/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        notificationsCache = data || [];
        unreadCountCache = data.filter(n => !n.read).length;
        isNotificationsLoaded = true;
        
        setNotifications(notificationsCache);
        setUnreadCount(unreadCountCache);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      loadNotifications();
    }
  }, [profile]);

  // ============================================================
  // УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ
  // ============================================================
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://dod-backend.relaxdev.ru/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      notificationsCache = notificationsCache.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      unreadCountCache = notificationsCache.filter(n => !n.read).length;

      setNotifications(notificationsCache);
      setUnreadCount(unreadCountCache);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('https://dod-backend.relaxdev.ru/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      notificationsCache = notificationsCache.map(n => ({ ...n, read: true }));
      unreadCountCache = 0;

      setNotifications(notificationsCache);
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  // ============================================================
  // РАСКРЫТИЕ ПОДМЕНЮ
  // ============================================================
  const toggleMenu = (key) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ============================================================
  // ВЫХОД
  // ============================================================
  const handleLogout = () => {
    notificationsCache = null;
    unreadCountCache = 0;
    isNotificationsLoaded = false;
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
  // SVG ИКОНКИ
  // ============================================================
  const Icon = {
    Dashboard: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    Events: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    Calendar: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="12" cy="14" r="1" />
        <circle cx="16" cy="14" r="1" />
        <circle cx="8" cy="14" r="1" />
      </svg>
    ),
    Participants: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    Club: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    Achievements: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    Reports: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    Appeals: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    Staff: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    Analytics: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    Settings: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4" />
        <path d="M12 19v4" />
        <path d="M4.22 4.22l2.83 2.83" />
        <path d="M16.95 16.95l2.83 2.83" />
        <path d="M1 12h4" />
        <path d="M19 12h4" />
        <path d="M4.22 19.78l2.83-2.83" />
        <path d="M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    Documents: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    Users: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    Tutor: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8c0 5 4 9 8 12 4-3 8-7 8-12a8 8 0 0 0-8-8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    Notifications: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    Consents: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    Goals: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    Tasks: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8c0 5 4 9 8 12 4-3 8-7 8-12a8 8 0 0 0-8-8z" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    President: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    Rating: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    Journal: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    Import: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    Invite: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    ChevronDown: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    ChevronRight: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    ),
    Menu: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    Close: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  };

  // ============================================================
  // СТРУКТУРА МЕНЮ
  // ============================================================
  const getMenuStructure = () => {
    const role = profile?.role;
    const isPresident = profile?.is_president || false;
    const menu = [];

    menu.push({
      id: 'dashboard',
      label: 'Дашборд',
      path: '/dashboard',
      icon: Icon.Dashboard,
      isLink: true
    });

    if (role === 'participant' || role === 'parent') {
      menu.push({
        id: 'participant',
        label: 'Участнику',
        icon: Icon.Participants,
        isLink: false,
        children: [
          { path: '/events', label: 'Мероприятия', icon: Icon.Events },
          { path: '/calendar', label: 'Календарь', icon: Icon.Calendar },
          { path: '/my-achievements', label: 'Достижения', icon: Icon.Achievements },
          { path: '/my-reviews', label: 'Оценки', icon: Icon.Analytics },
        ]
      });
      if (isPresident) {
        menu.push({
          id: 'president',
          label: 'Президенту',
          icon: Icon.President,
          isLink: false,
          children: [
            { path: '/president-tasks', label: 'Задания', icon: Icon.Tasks },
            { path: '/club-rating', label: 'Рейтинг', icon: Icon.Rating },
          ]
        });
      }
    }

    if (role === 'club_coordinator') {
      menu.push({
        id: 'club',
        label: 'КЮД',
        icon: Icon.Club,
        isLink: false,
        children: [
          { path: '/clubs', label: 'Мой КЮД', icon: Icon.Club },
          { path: '/events', label: 'Мероприятия', icon: Icon.Events },
          { path: '/participants', label: 'Участники', icon: Icon.Participants },
          { path: '/manage-achievements', label: 'Достижения', icon: Icon.Achievements },
          { path: '/reports', label: 'Отчёты', icon: Icon.Reports },
          { path: '/appeals', label: 'Обращения', icon: Icon.Appeals },
          { path: '/staff', label: 'Сотрудники', icon: Icon.Staff },
          { path: '/calendar', label: 'Календарь', icon: Icon.Calendar },
          { path: '/documents-center', label: 'Центр документов', icon: Icon.Documents },
        ]
      });
    }

    if (role === 'tutor') {
      menu.push({
        id: 'tutor',
        label: 'Тьютору',
        icon: Icon.Tutor,
        isLink: false,
        children: [
          { path: '/clubs', label: 'КЮДы', icon: Icon.Club },
          { path: '/events', label: 'Мероприятия', icon: Icon.Events },
          { path: '/participants', label: 'Участники', icon: Icon.Participants },
          { path: '/achievements', label: 'Достижения', icon: Icon.Achievements },
          { path: '/my-reviews', label: 'Оценки', icon: Icon.Analytics },
          { path: '/my-journal', label: 'Журнал', icon: Icon.Journal },
          { path: '/staff-calendar', label: 'Календарь', icon: Icon.Calendar },
          { path: '/tutor-assignments', label: 'Назначения', icon: Icon.Tasks },
          { path: '/reports', label: 'Отчёты', icon: Icon.Reports },
        ]
      });
    }

    if (role === 'movement_coordinator' || role === 'admin') {
      menu.push({
        id: 'management',
        label: 'Управление',
        icon: Icon.Settings,
        isLink: false,
        children: [
          { path: '/clubs', label: 'КЮДы', icon: Icon.Club },
          { path: '/clubs-management', label: 'Управление КЮДами', icon: Icon.Settings },
          { path: '/events', label: 'Мероприятия', icon: Icon.Events },
          { path: '/participants', label: 'Участники', icon: Icon.Participants },
          { path: '/achievements', label: 'Достижения', icon: Icon.Achievements },
          { path: '/achievements-categories', label: 'Категории', icon: Icon.Achievements },
          { path: '/reports', label: 'Отчёты', icon: Icon.Reports },
          { path: '/analytics', label: 'Аналитика', icon: Icon.Analytics },
          { path: '/appeals', label: 'Обращения', icon: Icon.Appeals },
          { path: '/documents-center', label: 'Центр документов', icon: Icon.Documents },
          { path: '/mass-notifications', label: 'Уведомления', icon: Icon.Notifications },
          { path: '/notification-history', label: 'История', icon: Icon.Notifications },
          { path: '/activity-log', label: 'Журнал', icon: Icon.Journal },
          { path: '/consents-management', label: 'Согласия', icon: Icon.Consents },
          { path: '/goals', label: 'Цели', icon: Icon.Goals },
          { path: '/tasks-planner', label: 'Планировщик', icon: Icon.Tasks },
          { path: '/admin/users', label: 'Пользователи', icon: Icon.Users },
        ]
      });
      if (role === 'admin') {
        menu.push({
          id: 'admin',
          label: 'Администрирование',
          icon: Icon.Settings,
          isLink: false,
          children: [
            { path: '/admin/invite', label: 'Пригласить', icon: Icon.Invite },
            { path: '/import-participants', label: 'Импорт', icon: Icon.Import },
            { path: '/settings', label: 'Настройки', icon: Icon.Settings },
          ]
        });
      }
    }

    if (role === 'president' || role === 'vice_president') {
      menu.push({
        id: 'president',
        label: 'Президенту',
        icon: Icon.President,
        isLink: false,
        children: [
          { path: '/clubs', label: 'КЮДы', icon: Icon.Club },
          { path: '/events', label: 'Мероприятия', icon: Icon.Events },
          { path: '/participants', label: 'Участники', icon: Icon.Participants },
          { path: '/achievements', label: 'Достижения', icon: Icon.Achievements },
          { path: '/reports', label: 'Отчёты', icon: Icon.Reports },
          { path: '/analytics', label: 'Аналитика', icon: Icon.Analytics },
          { path: '/appeals', label: 'Обращения', icon: Icon.Appeals },
          { path: '/documents-center', label: 'Центр документов', icon: Icon.Documents },
          { path: '/president-tasks', label: 'Задания', icon: Icon.Tasks },
          { path: '/club-rating', label: 'Рейтинг', icon: Icon.Rating },
        ]
      });
    }

    return menu;
  };

  const menuStructure = getMenuStructure();

  // ============================================================
  // РЕНДЕР ПУНКТА МЕНЮ
  // ============================================================
  const renderMenuItem = (item) => {
    if (item.isLink) {
      return (
        <Link
          key={item.id}
          to={item.path}
          className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => {
            if (window.innerWidth < 1024) {
              setIsMobileSidebarOpen(false);
            }
          }}
        >
          <span className="sidebar-link-icon"><item.icon /></span>
          <span className="sidebar-link-label">{item.label}</span>
        </Link>
      );
    }

    const isExpanded = expandedMenus[item.id] || false;
    const isChildActive = item.children?.some(child => isActive(child.path));

    return (
      <div key={item.id} className="sidebar-group">
        <button
          className={`sidebar-group-toggle ${isChildActive ? 'active' : ''}`}
          onClick={() => toggleMenu(item.id)}
        >
          <span className="sidebar-link-icon"><item.icon /></span>
          <span className="sidebar-link-label">{item.label}</span>
          <span className="sidebar-group-arrow">
            {isExpanded ? <Icon.ChevronDown /> : <Icon.ChevronRight />}
          </span>
        </button>
        {isExpanded && (
          <div className="sidebar-group-children">
            {item.children.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                className={`sidebar-link sidebar-child ${isActive(child.path) ? 'active' : ''}`}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsMobileSidebarOpen(false);
                  }
                }}
              >
                <span className="sidebar-link-icon"><child.icon /></span>
                <span className="sidebar-link-label">{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // РЕНДЕР
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
          {menuStructure.map((item) => renderMenuItem(item))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Оверлей для мобильного сайдбара */}
      {window.innerWidth < 1024 && isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Основной контент */}
      <main className="main-content">
        {/* Верхний хедер */}
        <header className="main-header">
          <button
            className="main-header-toggle"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
          >
            {isSidebarOpen ? <Icon.Close /> : <Icon.Menu />}
          </button>

          <div className="main-header-right">
            {/* Уведомления */}
            <div className="header-notifications" ref={notificationRef}>
              <button
                className="header-notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Icon.Notifications />
                {unreadCount > 0 && (
                  <span className="header-notif-badge">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="header-notif-dropdown">
                  <div className="header-notif-header">
                    <span>Уведомления</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="header-notif-markall">
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
                          onClick={() => {
                            if (!n.read) {
                              markAsRead(n.id);
                            }
                          }}
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
                    Все уведомления
                  </Link>
                </div>
              )}
            </div>

            {/* Профиль в хедере */}
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
                <Icon.ChevronDown />
              </button>

              {isProfileOpen && (
                <div className="header-profile-dropdown">
                  <div className="header-profile-header">
                    <div className="header-profile-avatar">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Аватар" />
                      ) : (
                        getInitials(profile?.full_name)
                      )}
                    </div>
                    <div>
                      <div className="header-profile-fullname">{profile?.full_name}</div>
                      <div className="header-profile-role">{profile?.role}</div>
                    </div>
                  </div>
                  <div className="header-divider" />
                  <Link to="/profile" className="header-profile-item" onClick={() => setIsProfileOpen(false)}>
                    Профиль
                  </Link>
                  <Link to="/my-achievements" className="header-profile-item" onClick={() => setIsProfileOpen(false)}>
                    Достижения
                  </Link>
                  <Link to="/my-reviews" className="header-profile-item" onClick={() => setIsProfileOpen(false)}>
                    Оценки
                  </Link>
                  <div className="header-divider" />
                  <button className="header-profile-item header-profile-logout" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Контент страницы */}
        <div className="main-content-body">
          {children}
        </div>
      </main>

      <style>{`
        /* ============================================================
           LAYOUT
           ============================================================ */
        .layout {
          display: flex;
          min-height: 100vh;
          background: var(--background);
        }

        /* ============================================================
           SIDEBAR
           ============================================================ */
        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: var(--primary);
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

        .sidebar-brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .sidebar-brand-title {
          font-family: var(--font-serif);
          font-size: 18px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .sidebar-brand-subtitle {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.5px;
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
          background: var(--gold-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
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
          border-radius: var(--radius-sm);
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          font-size: 13px;
          font-weight: 400;
          transition: var(--transition);
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
          color: var(--gold);
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 24px;
          color: rgba(255,255,255,0.3);
        }

        .sidebar-link.active .sidebar-link-icon {
          color: var(--gold);
        }

        .sidebar-link-label {
          white-space: nowrap;
        }

        /* ============================================================
           SIDEBAR ГРУППЫ
           ============================================================ */
        .sidebar-group {
          margin-bottom: 1px;
        }

        .sidebar-group-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 9px 14px;
          border: none;
          background: none;
          border-radius: var(--radius-sm);
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: var(--transition);
          font-family: var(--font-sans);
        }

        .sidebar-group-toggle:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }

        .sidebar-group-toggle.active {
          background: rgba(255,255,255,0.08);
          color: white;
        }

        .sidebar-group-arrow {
          margin-left: auto;
          color: rgba(255,255,255,0.2);
          transition: transform 0.25s ease;
        }

        .sidebar-group-children {
          padding-left: 16px;
        }

        .sidebar-child {
          padding: 7px 14px;
          font-size: 12px;
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
          border-radius: var(--radius-sm);
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: var(--transition);
          width: 100%;
        }

        .sidebar-logout:hover {
          background: rgba(179, 38, 46, 0.2);
          color: #FED7D7;
        }

        /* ============================================================
           SIDEBAR OVERLAY (МОБИЛЬНЫЙ)
           ============================================================ */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.4);
          z-index: 999;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
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
        }

        /* ============================================================
           MAIN HEADER
           ============================================================ */
        .main-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 32px;
          background: white;
          border-bottom: 1px solid var(--border);
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
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-secondary);
          transition: var(--transition);
        }

        .main-header-toggle:hover {
          background: var(--background);
        }

        .main-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ============================================================
           HEADER УВЕДОМЛЕНИЯ
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
          color: var(--text-secondary);
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .header-notif-btn:hover {
          background: var(--background);
        }

        .header-notif-badge {
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

        .header-notif-dropdown {
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

        .header-notif-header {
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

        .header-notif-markall {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
        }

        .header-notif-markall:hover {
          color: var(--text-primary);
        }

        .header-notif-list {
          overflow-y: auto;
          flex: 1;
        }

        .header-notif-item {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: var(--transition);
        }

        .header-notif-item:hover {
          background: var(--background);
        }

        .header-notif-item.unread {
          border-left: 3px solid var(--gold);
          background: #FAF8F4;
        }

        .header-notif-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary);
        }

        .header-notif-message {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .header-notif-time {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .header-notif-empty {
          padding: 28px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        .header-notif-all {
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

        .header-notif-all:hover {
          background: var(--background);
        }

        /* ============================================================
           HEADER ПРОФИЛЬ
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
          transition: var(--transition);
          font-family: var(--font-sans);
        }

        .header-profile-btn:hover {
          background: var(--background);
        }

        .header-avatar {
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

        .header-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-profile-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-profile-btn svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .header-profile-dropdown {
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

        .header-profile-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }

        .header-profile-avatar {
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

        .header-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-profile-fullname {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .header-profile-role {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .header-divider {
          height: 1px;
          background: var(--border);
          margin: 0 12px;
        }

        .header-profile-item {
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

        .header-profile-item:hover {
          background: var(--background);
        }

        .header-profile-logout {
          color: #B3262E;
        }

        .header-profile-logout:hover {
          background: #FCEBEC;
        }

        /* ============================================================
           MAIN CONTENT BODY
           ============================================================ */
        .main-content-body {
          flex: 1;
          padding: 24px 32px 40px;
        }

        /* ============================================================
           RESPONSIVE
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
            right: -40px;
          }

          .header-profile-dropdown {
            width: 200px;
            right: -20px;
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

          .header-notif-dropdown {
            width: 280px;
            right: -60px;
          }

          .header-profile-dropdown {
            width: 180px;
            right: -40px;
          }

          .sidebar {
            width: 100%;
            max-width: 320px;
          }
        }
      `}</style>
    </div>
  );
}