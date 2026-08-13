// frontend/src/components/Navigation.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navigation({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isClubsOpen, setIsClubsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  
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

  // ============================================================
  // АВАТАР
  // ============================================================
  const getAvatar = () => {
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="Аватар" className="nav-avatar" />;
    }
    // Буква-аватар
    const initial = profile?.full_name?.charAt(0) || '?';
    return (
      <div className="nav-avatar-letter" style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {initial.toUpperCase()}
      </div>
    );
  };

  // ============================================================
  // МЕНЮ ПО РОЛЯМ
  // ============================================================
  const getMenuItems = () => {
    // Базовые пункты для всех
    const baseItems = [
      { path: '/', label: '🏠 Главная', category: 'main' },
    ];

    const roleItems = {
      // ===== УЧАСТНИК =====
      'participant': [
        { path: '/participant-dashboard', label: '📊 Мой кабинет', category: 'main' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/my-achievements', label: '🏆 Мои достижения', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Мои оценки', category: 'reviews' },
        { path: '/president-tasks', label: '👑 Задания президента', category: 'tasks' },
        { path: '/calendar', label: '📅 Календарь', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== РОДИТЕЛЬ =====
      'parent': [
        { path: '/parent-dashboard', label: '📊 Кабинет родителя', category: 'main' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/my-achievements', label: '🏆 Достижения ребёнка', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки ребёнка', category: 'reviews' },
        { path: '/calendar', label: '📅 Календарь', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== КООРДИНАТОР КЛУБА =====
      'club_coordinator': [
        { path: '/club-coordinator-dashboard', label: '📊 Управление клубом', category: 'main' },
        { path: '/clubs', label: '🏫 Мой КЮД', category: 'clubs' },
        { path: '/club-analytics', label: '📊 Аналитика клуба', category: 'clubs' },
        { path: '/president-tasks', label: '👑 Задания президента', category: 'tasks' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/participants', label: '👥 Участники', category: 'clubs' },
        { path: '/manage-achievements', label: '🏆 Достижения клуба', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки клуба', category: 'reviews' },
        { path: '/reports', label: '📋 Отчёты', category: 'settings' },
        { path: '/appeals', label: '📨 Обращения', category: 'settings' },
        { path: '/tutor-requests', label: '🤝 Запросы на тьюторов', category: 'staff' },
        { path: '/staff-calendar', label: '📅 Календарь сотрудников', category: 'staff' },
        { path: '/calendar', label: '📅 Календарь мероприятий', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== ТЬЮТОР =====
      'tutor': [
        { path: '/tutor-dashboard', label: '📊 Кабинет тьютора', category: 'main' },
        { path: '/my-journal', label: '📓 Мой журнал', category: 'journal' },
        { path: '/tutor-invitations', label: '📨 Приглашения', category: 'staff' },
        { path: '/clubs', label: '🏫 КЮДы', category: 'clubs' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/participants', label: '👥 Участники', category: 'clubs' },
        { path: '/achievements', label: '🏆 Достижения', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки', category: 'reviews' },
        { path: '/staff-calendar', label: '📅 Мой календарь', category: 'staff' },
        { path: '/calendar', label: '📅 Календарь мероприятий', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== КООРДИНАТОР ДВИЖЕНИЯ =====
      'movement_coordinator': [
        { path: '/dashboard', label: '📊 Дашборд', category: 'main' },
        { path: '/analytics', label: '📊 Аналитика', category: 'main' },
        { path: '/club-analytics', label: '📊 Аналитика клубов', category: 'clubs' },
        { path: '/president-tasks', label: '👑 Задания президента', category: 'tasks' },
        { path: '/clubs', label: '🏫 КЮДы', category: 'clubs' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/participants', label: '👥 Участники', category: 'clubs' },
        { path: '/achievements', label: '🏆 Достижения', category: 'achievements' },
        { path: '/manage-achievements', label: '🏆 Управление достижениями', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки', category: 'reviews' },
        { path: '/reports', label: '📋 Отчёты', category: 'settings' },
        { path: '/settings', label: '⚙️ Настройки', category: 'settings' },
        { path: '/admin/invite', label: '🎫 Пригласить', category: 'settings' },
        { path: '/admin/users', label: '👥 Пользователи', category: 'settings' },
        { path: '/import-participants', label: '📥 Импорт', category: 'settings' },
        { path: '/appeals', label: '📨 Обращения', category: 'settings' },
        { path: '/staff', label: '👥 Сотрудники', category: 'staff' },
        { path: '/tutor-requests', label: '🤝 Запросы на тьюторов', category: 'staff' },
        { path: '/tutor-invitations', label: '📨 Приглашения тьюторов', category: 'staff' },
        { path: '/staff-calendar', label: '📅 Календарь сотрудников', category: 'staff' },
        { path: '/calendar', label: '📅 Календарь мероприятий', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== АДМИНИСТРАТОР =====
      'admin': [
        { path: '/dashboard', label: '📊 Дашборд', category: 'main' },
        { path: '/analytics', label: '📊 Аналитика', category: 'main' },
        { path: '/club-analytics', label: '📊 Аналитика клубов', category: 'clubs' },
        { path: '/president-tasks', label: '👑 Задания президента', category: 'tasks' },
        { path: '/clubs', label: '🏫 КЮДы', category: 'clubs' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/participants', label: '👥 Участники', category: 'clubs' },
        { path: '/achievements', label: '🏆 Достижения', category: 'achievements' },
        { path: '/manage-achievements', label: '🏆 Управление достижениями', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки', category: 'reviews' },
        { path: '/reports', label: '📋 Отчёты', category: 'settings' },
        { path: '/settings', label: '⚙️ Настройки', category: 'settings' },
        { path: '/admin/invite', label: '🎫 Пригласить', category: 'settings' },
        { path: '/admin/users', label: '👥 Пользователи', category: 'settings' },
        { path: '/import-participants', label: '📥 Импорт', category: 'settings' },
        { path: '/appeals', label: '📨 Обращения', category: 'settings' },
        { path: '/staff', label: '👥 Сотрудники', category: 'staff' },
        { path: '/tutor-requests', label: '🤝 Запросы на тьюторов', category: 'staff' },
        { path: '/tutor-invitations', label: '📨 Приглашения тьюторов', category: 'staff' },
        { path: '/staff-calendar', label: '📅 Календарь сотрудников', category: 'staff' },
        { path: '/calendar', label: '📅 Календарь мероприятий', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== ПРЕЗИДЕНТ =====
      'president': [
        { path: '/dashboard', label: '📊 Дашборд президента', category: 'main' },
        { path: '/analytics', label: '📊 Аналитика', category: 'main' },
        { path: '/club-analytics', label: '📊 Аналитика клубов', category: 'clubs' },
        { path: '/clubs', label: '🏫 КЮДы', category: 'clubs' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/participants', label: '👥 Участники', category: 'clubs' },
        { path: '/achievements', label: '🏆 Достижения', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки', category: 'reviews' },
        { path: '/reports', label: '📋 Отчёты', category: 'settings' },
        { path: '/appeals', label: '📨 Обращения', category: 'settings' },
        { path: '/admin/users', label: '👥 Пользователи', category: 'settings' },
        { path: '/calendar', label: '📅 Календарь мероприятий', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],

      // ===== ВИЦЕ-ПРЕЗИДЕНТ =====
      'vice_president': [
        { path: '/dashboard', label: '📊 Дашборд', category: 'main' },
        { path: '/analytics', label: '📊 Аналитика', category: 'main' },
        { path: '/club-analytics', label: '📊 Аналитика клубов', category: 'clubs' },
        { path: '/clubs', label: '🏫 КЮДы', category: 'clubs' },
        { path: '/events', label: '📅 Мероприятия', category: 'events' },
        { path: '/participants', label: '👥 Участники', category: 'clubs' },
        { path: '/achievements', label: '🏆 Достижения', category: 'achievements' },
        { path: '/my-reviews', label: '📊 Оценки', category: 'reviews' },
        { path: '/reports', label: '📋 Отчёты', category: 'settings' },
        { path: '/appeals', label: '📨 Обращения', category: 'settings' },
        { path: '/admin/users', label: '👥 Пользователи', category: 'settings' },
        { path: '/calendar', label: '📅 Календарь мероприятий', category: 'events' },
        { path: '/profile', label: '👤 Профиль', category: 'profile' },
      ],
    };

    let allItems = [...baseItems];
    if (roleItems[role]) {
      allItems = [...allItems, ...roleItems[role]];
    }

    return allItems;
  };

  const menuItems = getMenuItems();

  // ============================================================
  // ГРУППИРОВКА ПО КАТЕГОРИЯМ
  // ============================================================
  const mainItems = menuItems.filter(item => item.category === 'main');
  const eventsItems = menuItems.filter(item => item.category === 'events');
  const clubsItems = menuItems.filter(item => item.category === 'clubs');
  const achievementsItems = menuItems.filter(item => item.category === 'achievements');
  const reviewsItems = menuItems.filter(item => item.category === 'reviews');
  const tasksItems = menuItems.filter(item => item.category === 'tasks');
  const journalItems = menuItems.filter(item => item.category === 'journal');
  const staffItems = menuItems.filter(item => item.category === 'staff');
  const settingsItems = menuItems.filter(item => item.category === 'settings');
  const profileItems = menuItems.filter(item => item.category === 'profile');

  // ============================================================
  // ОТРИСОВКА
  // ============================================================
  return (
    <nav style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E7EF',
      padding: '6px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 99,
      boxShadow: '0 2px 8px rgba(11, 31, 58, 0.04)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px',
        minHeight: '48px'
      }}>
        {/* ЛОГОТИП */}
        <Link to="/" style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#0B1F3A',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>🌍</span>
          <span style={{ display: 'inline-block' }}>
            ДОД «Дипломаты будущего»
          </span>
        </Link>

        {/* КНОПКА БУРГЕРА (МОБИЛЬНАЯ) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#0B1F3A',
            padding: '4px 8px'
          }}
          className="burger-button"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* ДЕСКТОПНОЕ МЕНЮ */}
        <div style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'center',
          flexWrap: 'wrap',
          flex: 1,
          justifyContent: 'center'
        }} className="desktop-menu">
          
          {/* ГЛАВНЫЕ ПУНКТЫ */}
          {mainItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive(item.path) ? '600' : '400',
                color: isActive(item.path) ? '#0B1F3A' : '#667085',
                background: isActive(item.path) ? '#F4F6F9' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = '#F4F6F9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </Link>
          ))}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: МЕРОПРИЯТИЯ */}
          {eventsItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsEventsOpen(true)}
              onMouseLeave={() => setIsEventsOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: eventsItems.some(item => isActive(item.path)) ? '600' : '400',
                color: eventsItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📅 Мероприятия ▼
              </button>
              {isEventsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {eventsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: КЛУБЫ */}
          {clubsItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsClubsOpen(true)}
              onMouseLeave={() => setIsClubsOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: clubsItems.some(item => isActive(item.path)) ? '600' : '400',
                color: clubsItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🏫 Клубы ▼
              </button>
              {isClubsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {clubsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: ДОСТИЖЕНИЯ */}
          {achievementsItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsEventsOpen(true)}
              onMouseLeave={() => setIsEventsOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: achievementsItems.some(item => isActive(item.path)) ? '600' : '400',
                color: achievementsItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🏆 Достижения ▼
              </button>
              {isEventsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {achievementsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: ОЦЕНКИ */}
          {reviewsItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsEventsOpen(true)}
              onMouseLeave={() => setIsEventsOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: reviewsItems.some(item => isActive(item.path)) ? '600' : '400',
                color: reviewsItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📊 Оценки ▼
              </button>
              {isEventsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {reviewsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: ЗАДАНИЯ */}
          {tasksItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsEventsOpen(true)}
              onMouseLeave={() => setIsEventsOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: tasksItems.some(item => isActive(item.path)) ? '600' : '400',
                color: tasksItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                👑 Задания ▼
              </button>
              {isEventsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {tasksItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: ЖУРНАЛ (ТЬЮТОР) */}
          {journalItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsJournalOpen(true)}
              onMouseLeave={() => setIsJournalOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: journalItems.some(item => isActive(item.path)) ? '600' : '400',
                color: journalItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📓 Журнал ▼
              </button>
              {isJournalOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {journalItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: СОТРУДНИКИ */}
          {staffItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsStaffOpen(true)}
              onMouseLeave={() => setIsStaffOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: staffItems.some(item => isActive(item.path)) ? '600' : '400',
                color: staffItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                👥 Сотрудники ▼
              </button>
              {isStaffOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {staffItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ВЫПАДАЮЩЕЕ МЕНЮ: НАСТРОЙКИ */}
          {settingsItems.length > 0 && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setIsSettingsOpen(true)}
              onMouseLeave={() => setIsSettingsOpen(false)}
            >
              <button style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: settingsItems.some(item => isActive(item.path)) ? '600' : '400',
                color: settingsItems.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚙️ Настройки ▼
              </button>
              {isSettingsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(11, 31, 58, 0.12)',
                  border: '1px solid #E2E7EF',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 100
                }}>
                  {settingsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive(item.path) ? '600' : '400',
                        color: isActive(item.path) ? '#0B1F3A' : '#667085',
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ПРАВАЯ ЧАСТЬ: АВАТАР + ВЫХОД */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* АВАТАР С ССЫЛКОЙ НА ПРОФИЛЬ */}
          <Link to="/profile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {getAvatar()}
            <span style={{
              fontSize: '13px',
              color: '#0B1F3A',
              fontWeight: '500',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {profile?.full_name || 'Профиль'}
            </span>
          </Link>

          {/* КНОПКА ВЫХОДА */}
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#667085',
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#FCEBEC';
              e.target.style.color = '#B3262E';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#667085';
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {/* МОБИЛЬНОЕ МЕНЮ */}
      {isMobileMenuOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          padding: '12px 0',
          borderTop: '1px solid #E2E7EF',
          marginTop: '8px'
        }} className="mobile-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive(item.path) ? '600' : '400',
                color: isActive(item.path) ? '#0B1F3A' : '#667085',
                background: isActive(item.path) ? '#F4F6F9' : 'transparent'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* СТИЛИ */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-menu { display: none !important; }
          .burger-button { display: block !important; }
          .mobile-menu { display: flex !important; }
        }
        @media (min-width: 769px) {
          .burger-button { display: none !important; }
          .mobile-menu { display: none !important; }
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
      `}</style>
    </nav>
  );
}