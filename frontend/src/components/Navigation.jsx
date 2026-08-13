// frontend/src/components/Navigation.jsx

import { Link, useLocation } from 'react-router-dom';
import api from '../lib/api';
import logo from '../assets/Image.png';
import logoArd from '../assets/АРДЛОГО.png';
import { useState } from 'react';

export default function Navigation({ profile }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isClubsOpen, setIsClubsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const role = profile?.role || 'participant';

  // ===== ВЫХОД =====
  const handleLogout = () => {
    api.logout();
  };

  // ===== МЕНЮ (БЕЗ ИЗМЕНЕНИЙ) =====
  const getMenuItems = () => {
    const baseItems = [
      { path: '/', label: 'Главная', roles: ['all'] },
      { path: '/profile', label: 'Профиль', roles: ['all'] },
    ];

    const roleItems = {
      'participant': [
        { path: '/events', label: 'Мероприятия', roles: ['participant'] },
        { path: '/my-achievements', label: 'Мои достижения', roles: ['participant'] },
        { path: '/my-reviews', label: '📊 Мои оценки', roles: ['participant'] },
        { path: '/president-tasks', label: '👑 Задания президента', roles: ['participant'] },
      ],

      'parent': [
        { path: '/events', label: 'Мероприятия', roles: ['parent'] },
        { path: '/my-achievements', label: 'Достижения ребенка', roles: ['parent'] },
        { path: '/my-reviews', label: '📊 Оценки ребенка', roles: ['parent'] },
      ],

      'club_coordinator': [
        { path: '/clubs', label: 'Мой КЮД', roles: ['club_coordinator'] },
        { path: '/president-tasks', label: '👑 Задания президента', roles: ['club_coordinator'] },
        { path: '/events', label: 'Мероприятия', roles: ['club_coordinator'] },
        { path: '/participants', label: 'Участники', roles: ['club_coordinator'] },
        { path: '/manage-achievements', label: '🏆 Достижения клуба', roles: ['club_coordinator'] },
        { path: '/my-reviews', label: '📊 Оценки клуба', roles: ['club_coordinator'] },
        { path: '/reports', label: 'Отчёты', roles: ['club_coordinator'] },
        { path: '/club-analytics', label: 'Аналитика клуба', roles: ['club_coordinator'] },
        { path: '/appeals', label: '📨 Обращения', roles: ['club_coordinator'] },
        { path: '/staff', label: 'Сотрудники', roles: ['club_coordinator'] },
        { path: '/staff-calendar', label: 'Календарь', roles: ['club_coordinator'] },
      ],

      'tutor': [
        { path: '/clubs', label: 'КЮДы', roles: ['tutor'] },
        { path: '/events', label: 'Мероприятия', roles: ['tutor'] },
        { path: '/participants', label: 'Участники', roles: ['tutor'] },
        { path: '/achievements', label: 'Достижения', roles: ['tutor'] },
        { path: '/my-reviews', label: '📊 Оценки участников', roles: ['tutor'] },
        { path: '/staff-calendar', label: 'Мой календарь', roles: ['tutor'] },
        { path: '/staff', label: 'Приглашения', roles: ['tutor'] },
        { path: '/my-journal', label: 'Мой журнал', roles: ['tutor'] },
      ],

      'movement_coordinator': [
        { path: '/dashboard', label: 'Дашборд', roles: ['movement_coordinator'] },
        { path: '/president-tasks', label: '👑 Задания президента', roles: ['movement_coordinator'] },
        { path: '/clubs', label: 'КЮДы', roles: ['movement_coordinator'] },
        { path: '/events', label: 'Мероприятия', roles: ['movement_coordinator'] },
        { path: '/participants', label: 'Участники', roles: ['movement_coordinator'] },
        { path: '/achievements', label: 'Достижения', roles: ['movement_coordinator'] },
        { path: '/manage-achievements', label: '🏆 Управление достижениями', roles: ['movement_coordinator'] },
        { path: '/my-reviews', label: '📊 Оценки участников', roles: ['movement_coordinator'] },
        { path: '/reports', label: 'Отчёты', roles: ['movement_coordinator'] },
        { path: '/analytics', label: 'Аналитика', roles: ['movement_coordinator'] },
        { path: '/settings', label: 'Настройки', roles: ['movement_coordinator'] },
        { path: '/admin/invite', label: 'Пригласить', roles: ['movement_coordinator'] },
        { path: '/admin/users', label: '👥 Управление пользователями', roles: ['movement_coordinator'] },
        { path: '/import-participants', label: '📥 Импорт участников', roles: ['movement_coordinator'] },
        { path: '/appeals', label: '📨 Обращения координаторов', roles: ['movement_coordinator'] },
        { path: '/staff', label: 'Сотрудники', roles: ['movement_coordinator'] },
        { path: '/staff-calendar', label: 'Календарь сотрудников', roles: ['movement_coordinator'] },
        { path: '/club-analytics', label: 'Аналитика клубов', roles: ['movement_coordinator'] },
      ],

      'admin': [
        { path: '/dashboard', label: 'Дашборд', roles: ['admin'] },
        { path: '/president-tasks', label: '👑 Задания президента', roles: ['admin'] },
        { path: '/clubs', label: 'КЮДы', roles: ['admin'] },
        { path: '/events', label: 'Мероприятия', roles: ['admin'] },
        { path: '/participants', label: 'Участники', roles: ['admin'] },
        { path: '/achievements', label: 'Достижения', roles: ['admin'] },
        { path: '/manage-achievements', label: '🏆 Управление достижениями', roles: ['admin'] },
        { path: '/my-reviews', label: '📊 Оценки участников', roles: ['admin'] },
        { path: '/reports', label: 'Отчёты', roles: ['admin'] },
        { path: '/analytics', label: 'Аналитика', roles: ['admin'] },
        { path: '/settings', label: 'Настройки', roles: ['admin'] },
        { path: '/admin/invite', label: 'Пригласить', roles: ['admin'] },
        { path: '/admin/users', label: '👥 Управление пользователями', roles: ['admin'] },
        { path: '/import-participants', label: '📥 Импорт участников', roles: ['admin'] },
        { path: '/appeals', label: '📨 Обращения координаторов', roles: ['admin'] },
        { path: '/staff', label: 'Сотрудники', roles: ['admin'] },
        { path: '/staff-calendar', label: 'Календарь сотрудников', roles: ['admin'] },
        { path: '/club-analytics', label: 'Аналитика клубов', roles: ['admin'] },
      ],

      'president': [
        { path: '/dashboard', label: '📊 Дашборд', roles: ['president'] },
        { path: '/clubs', label: '🏫 КЮДы', roles: ['president'] },
        { path: '/events', label: '📅 Мероприятия', roles: ['president'] },
        { path: '/participants', label: '👥 Участники', roles: ['president'] },
        { path: '/achievements', label: '🏆 Достижения', roles: ['president'] },
        { path: '/my-reviews', label: '📊 Оценки участников', roles: ['president'] },
        { path: '/reports', label: '📋 Отчёты', roles: ['president'] },
        { path: '/appeals', label: '📨 Обращения', roles: ['president'] },
        { path: '/analytics', label: '📊 Аналитика', roles: ['president'] },
        { path: '/admin/users', label: '👥 Пользователи', roles: ['president'] },
        { path: '/import-participants', label: '📥 Импорт участников', roles: ['president'] },
        { path: '/staff', label: '👥 Сотрудники', roles: ['president'] },
        { path: '/staff-calendar', label: '📅 Календарь сотрудников', roles: ['president'] },
        { path: '/club-analytics', label: '📊 Аналитика клубов', roles: ['president'] },
        { path: '/profile', label: '👤 Профиль', roles: ['president'] },
      ],

      'vice_president': [
        { path: '/dashboard', label: '📊 Дашборд', roles: ['vice_president'] },
        { path: '/clubs', label: '🏫 КЮДы', roles: ['vice_president'] },
        { path: '/events', label: '📅 Мероприятия', roles: ['vice_president'] },
        { path: '/participants', label: '👥 Участники', roles: ['vice_president'] },
        { path: '/achievements', label: '🏆 Достижения', roles: ['vice_president'] },
        { path: '/my-reviews', label: '📊 Оценки участников', roles: ['vice_president'] },
        { path: '/reports', label: '📋 Отчёты', roles: ['vice_president'] },
        { path: '/appeals', label: '📨 Обращения', roles: ['vice_president'] },
        { path: '/analytics', label: '📊 Аналитика', roles: ['vice_president'] },
        { path: '/admin/users', label: '👥 Пользователи', roles: ['vice_president'] },
        { path: '/import-participants', label: '📥 Импорт участников', roles: ['vice_president'] },
        { path: '/staff', label: '👥 Сотрудники', roles: ['vice_president'] },
        { path: '/staff-calendar', label: '📅 Календарь сотрудников', roles: ['vice_president'] },
        { path: '/club-analytics', label: '📊 Аналитика клубов', roles: ['vice_president'] },
        { path: '/profile', label: '👤 Профиль', roles: ['vice_president'] },
      ],
    };

    let allItems = [...baseItems];
    if (roleItems[role]) {
      allItems = [...allItems, ...roleItems[role]];
    }

    return allItems.filter(item => 
      item.roles.includes('all') || item.roles.includes(role)
    );
  };

  const menuItems = getMenuItems();

  // Группировка для выпадающих меню
  const groupedItems = {
    main: menuItems.filter(item => 
      ['/', '/profile', '/dashboard'].includes(item.path)
    ),
    events: menuItems.filter(item => 
      ['/events', '/calendar', '/participants'].includes(item.path)
    ),
    clubs: menuItems.filter(item => 
      ['/clubs', '/club-analytics', '/my-reviews', '/achievements', '/manage-achievements'].includes(item.path)
    ),
    settings: menuItems.filter(item => 
      ['/settings', '/admin/invite', '/admin/users', '/import-participants', '/appeals', '/staff', '/staff-calendar', '/reports', '/analytics'].includes(item.path)
    ),
    other: menuItems.filter(item => 
      !['/', '/profile', '/dashboard', '/events', '/calendar', '/participants', '/clubs', '/club-analytics', '/my-reviews', '/achievements', '/manage-achievements', '/settings', '/admin/invite', '/admin/users', '/import-participants', '/appeals', '/staff', '/staff-calendar', '/reports', '/analytics'].includes(item.path)
    )
  };

  const categories = [];
  if (groupedItems.events.length > 0) {
    categories.push({ title: '📅 Мероприятия', items: groupedItems.events, key: 'events' });
  }
  if (groupedItems.clubs.length > 0) {
    categories.push({ title: '🏫 Клубы', items: groupedItems.clubs, key: 'clubs' });
  }
  if (groupedItems.settings.length > 0) {
    categories.push({ title: '⚙️ Настройки', items: groupedItems.settings, key: 'settings' });
  }
  if (groupedItems.other.length > 0) {
    categories.push({ title: '📌 Другое', items: groupedItems.other, key: 'other' });
  }

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
        {/* ===== ЛОГОТИПЫ ===== */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <img 
              src={logo} 
              alt="Логотип ДОД Дипломаты будущего"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #C9A227'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#0B1F3A',
                letterSpacing: '0.3px'
              }}>
                Дипломаты будущего
              </span>
              <span style={{
                fontSize: '8px',
                fontWeight: '500',
                color: '#C9A227',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Ассоциация российских дипломатов
              </span>
            </div>
          </div>

          <span style={{
            width: '1px',
            height: '30px',
            background: '#E2E7EF',
            margin: '0 4px'
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <img 
              src={logoArd} 
              alt="Ассоциация российских дипломатов"
              style={{
                height: '28px',
                objectFit: 'contain'
              }}
            />
          </div>
        </Link>

        {/* БУРГЕР-МЕНЮ */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: '#0B1F3A'
          }}
          className="burger-button"
        >
          ☰
        </button>

        {/* ДЕСКТОПНОЕ МЕНЮ */}
        <div style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'center',
          flexWrap: 'wrap',
          flex: 1,
          justifyContent: 'center'
        }}
        className="desktop-menu"
        >
          {groupedItems.main.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive(item.path) ? '600' : '400',
                color: isActive(item.path) ? '#0B1F3A' : '#667085',
                background: isActive(item.path) ? '#F4F6F9' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '0.2px',
                position: 'relative'
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
              {isActive(item.path) && (
                <span style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '16px',
                  height: '2px',
                  background: '#C9A227',
                  borderRadius: '2px'
                }} />
              )}
            </Link>
          ))}

          {categories.map((category) => (
            <div
              key={category.key}
              style={{ position: 'relative' }}
              onMouseEnter={() => {
                if (category.key === 'events') setIsEventsOpen(true);
                if (category.key === 'clubs') setIsClubsOpen(true);
                if (category.key === 'settings') setIsSettingsOpen(true);
              }}
              onMouseLeave={() => {
                if (category.key === 'events') setIsEventsOpen(false);
                if (category.key === 'clubs') setIsClubsOpen(false);
                if (category.key === 'settings') setIsSettingsOpen(false);
              }}
            >
              <button
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: category.items.some(item => isActive(item.path)) ? '600' : '400',
                  color: category.items.some(item => isActive(item.path)) ? '#0B1F3A' : '#667085',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#F4F6F9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                {category.title} ▼
              </button>
              
              {(category.key === 'events' && isEventsOpen) ||
               (category.key === 'clubs' && isClubsOpen) ||
               (category.key === 'settings' && isSettingsOpen) ? (
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
                  zIndex: 100,
                  animation: 'fadeIn 0.2s ease'
                }}>
                  {category.items.map((item) => (
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
                        background: isActive(item.path) ? '#F4F6F9' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#F4F6F9';
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
              ) : null}
            </div>
          ))}
        </div>

        {/* КНОПКА ВЫХОДА */}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: '#667085',
            fontSize: '13px',
            fontWeight: '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            letterSpacing: '0.2px'
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

      {/* МОБИЛЬНОЕ МЕНЮ */}
      {isMobileMenuOpen && (
        <div style={{
          display: 'none',
          flexDirection: 'column',
          gap: '4px',
          padding: '12px 0',
          borderTop: '1px solid #E2E7EF',
          marginTop: '8px'
        }}
        className="mobile-menu"
        >
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive(item.path) ? '600' : '400',
                color: isActive(item.path) ? '#0B1F3A' : '#667085',
                background: isActive(item.path) ? '#F4F6F9' : 'transparent',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-menu {
            display: none !important;
          }
          .burger-button {
            display: block !important;
          }
          .mobile-menu {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .burger-button {
            display: none !important;
          }
          .mobile-menu {
            display: none !important;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}