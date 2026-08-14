// frontend/src/components/Navigation.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Notifications from './Notifications';
import logo from '../assets/Image.png';

// Иконки (используем простые SVG вместо эмодзи)
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  club: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  award: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  fileText: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  barChart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  target: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  book: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  userPlus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  upload: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  briefcase: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
};

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

  // ============================================================
  // КОНФИГУРАЦИЯ МЕНЮ (без эмодзи, с иконками)
  // ============================================================
  const getMenuGroups = () => {
    const groups = {
      main: [
        { 
          path: '/dashboard', 
          label: 'Дашборд', 
          icon: Icons.dashboard,
          roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] 
        },
        { 
          path: '/participant-dashboard', 
          label: 'Мой кабинет', 
          icon: Icons.dashboard,
          roles: ['participant'] 
        },
        { 
          path: '/parent-dashboard', 
          label: 'Мой кабинет', 
          icon: Icons.dashboard,
          roles: ['parent'] 
        },
        { 
          path: '/club-coordinator-dashboard', 
          label: 'Мой кабинет', 
          icon: Icons.dashboard,
          roles: ['club_coordinator'] 
        },
        { 
          path: '/tutor-dashboard', 
          label: 'Мой кабинет', 
          icon: Icons.dashboard,
          roles: ['tutor'] 
        },
      ],
      events: [
        { path: '/events', label: 'Мероприятия', icon: Icons.calendar, roles: ['all'] },
        { path: '/calendar', label: 'Календарь', icon: Icons.calendar, roles: ['all'] },
      ],
      people: [
        { path: '/participants', label: 'Участники', icon: Icons.users, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/staff', label: 'Сотрудники', icon: Icons.briefcase, roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/users', label: 'Пользователи', icon: Icons.users, roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],
      clubs: [
        { path: '/clubs', label: 'КЮДы', icon: Icons.club, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/club-analytics', label: 'Аналитика КЮДов', icon: Icons.barChart, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
      ],
      achievements: [
        { path: '/achievements', label: 'Достижения', icon: Icons.award, roles: ['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'] },
        { path: '/manage-achievements', label: 'Управление', icon: Icons.settings, roles: ['admin', 'movement_coordinator', 'club_coordinator'] },
        { path: '/my-achievements', label: 'Мои достижения', icon: Icons.star, roles: ['participant', 'parent'] },
      ],
      reviews: [
        { path: '/my-reviews', label: 'Оценки', icon: Icons.star, roles: ['all'] },
      ],
      reports: [
        { path: '/reports', label: 'Отчёты', icon: Icons.fileText, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
        { path: '/analytics', label: 'Аналитика', icon: Icons.barChart, roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],
      tasks: [
        { path: '/president-tasks', label: 'Задания президента', icon: Icons.target, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
        { path: '/my-journal', label: 'Журнал тьютора', icon: Icons.book, roles: ['tutor'] },
      ],
      communication: [
        { path: '/appeals', label: 'Обращения', icon: Icons.mail, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'] },
        { path: '/tutor-requests', label: 'Запросы на тьюторов', icon: Icons.mail, roles: ['club_coordinator', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/tutor-invitations', label: 'Приглашения тьюторам', icon: Icons.mail, roles: ['tutor', 'admin', 'movement_coordinator', 'president', 'vice_president'] },
      ],
      staffCalendar: [
        { path: '/staff-calendar', label: 'Календарь сотрудников', icon: Icons.calendar, roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'] },
      ],
      settings: [
        { path: '/settings', label: 'Настройки', icon: Icons.settings, roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/news', label: 'Новости', icon: Icons.mail, roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/invite', label: 'Пригласить', icon: Icons.userPlus, roles: ['admin', 'movement_coordinator'] },
        { path: '/import-participants', label: 'Импорт', icon: Icons.upload, roles: ['admin', 'movement_coordinator'] },
      ],
    };

    const result = {};
    for (const [key, items] of Object.entries(groups)) {
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

  const groupLabels = {
    main: 'Главная',
    events: 'Мероприятия',
    people: 'Люди',
    clubs: 'КЮДы',
    achievements: 'Достижения',
    reviews: 'Оценки',
    reports: 'Отчёты',
    tasks: 'Задания',
    communication: 'Коммуникация',
    staffCalendar: 'Календарь',
    settings: 'Настройки',
  };

  const groupOrder = ['main', 'events', 'people', 'clubs', 'achievements', 'reviews', 'reports', 'tasks', 'communication', 'staffCalendar', 'settings'];

  const sortedGroups = Object.entries(menuGroups).sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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
        <Link to="/" className="nav-new-logo">
          <img src={logo} alt="ДОД «Дипломаты будущего»" className="nav-new-logo-img" />
          <span className="nav-new-logo-text">Дипломаты будущего</span>
        </Link>

        <div className="nav-new-menu">
          {sortedGroups.map(([key, items]) => {
            if (!items || items.length === 0) return null;
            
            const isOpen = openDropdown === key;
            const hasActive = items.some(item => isActive(item.path));
            const label = groupLabels[key] || key;
            
            if (key === 'main') {
              return items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-new-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="nav-link-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ));
            }
            
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
                  <span className="nav-dropdown-label">{label}</span>
                  <span className="nav-dropdown-arrow">▾</span>
                </button>
                {isOpen && (
                  <div className="nav-dropdown-menu">
                    {items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-dropdown-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => {
                          setOpenDropdown(null);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <span className="nav-link-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
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
                    <span className="nav-link-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
          
          <button 
            className="nav-new-mobile-logout"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Выйти
          </button>
        </div>
      )}

      <style>{`
        .nav-new {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E7EF;
          padding: 0 16px;
          position: sticky;
          top: 0;
          z-index: 999;
          height: 52px;
          display: flex;
          align-items: center;
          box-shadow: 0 1px 3px rgba(11, 31, 58, 0.04);
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

        .nav-new-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-new-logo-img {
          height: 32px;
          width: auto;
          object-fit: contain;
        }

        .nav-new-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          color: #0B1F3A;
          letter-spacing: 0.3px;
        }

        .nav-new-menu {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: center;
          padding: 0 12px;
        }

        .nav-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: currentColor;
          flex-shrink: 0;
          margin-right: 4px;
        }

        .nav-link-icon svg {
          width: 14px;
          height: 14px;
        }

        .nav-new-link {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          color: #667085;
          transition: all 0.15s ease;
          white-space: nowrap;
          letter-spacing: 0.2px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
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

        .nav-new-link .nav-link-icon {
          opacity: 0.6;
        }

        .nav-new-link:hover .nav-link-icon,
        .nav-new-link.active .nav-link-icon {
          opacity: 1;
        }

        .nav-new-dropdown {
          position: relative;
        }

        .nav-new-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #667085;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          letter-spacing: 0.2px;
          font-family: inherit;
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

        .nav-dropdown-arrow {
          font-size: 7px;
          transition: transform 0.2s ease;
          color: #98A2B3;
          margin-left: 2px;
        }

        .nav-new-dropdown:hover .nav-dropdown-arrow {
          transform: rotate(180deg);
        }

        .nav-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.1);
          border: 1px solid #E2E7EF;
          min-width: 190px;
          padding: 4px;
          z-index: 1000;
          animation: fadeIn 0.12s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .nav-dropdown-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          text-decoration: none;
          color: #667085;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.15s ease;
          white-space: nowrap;
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

        .nav-dropdown-item .nav-link-icon {
          opacity: 0.5;
          width: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-dropdown-item:hover .nav-link-icon,
        .nav-dropdown-item.active .nav-link-icon {
          opacity: 1;
        }

        .nav-new-right {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }

        .nav-new-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px 3px 3px;
          border-radius: 20px;
          text-decoration: none;
          color: #0B1F3A;
          transition: all 0.15s ease;
        }

        .nav-new-profile:hover {
          background: #F4F6F9;
        }

        .nav-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #E2E7EF;
        }

        .nav-avatar-letter {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          color: white;
          border: 1.5px solid #E2E7EF;
        }

        .nav-new-profile-name {
          font-size: 12px;
          font-weight: 500;
          max-width: 70px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #0B1F3A;
        }

        .nav-new-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #98A2B3;
          padding: 0;
        }

        .nav-new-logout:hover {
          background: #FCEBEC;
          color: #B3262E;
        }

        .nav-new-logout svg {
          width: 16px;
          height: 16px;
        }

        .nav-new-burger {
          display: none;
          padding: 4px 6px;
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          color: #0B1F3A;
          line-height: 1;
        }

        .nav-new-mobile {
          display: none;
          flex-direction: column;
          gap: 6px;
          padding: 12px 16px;
          border-top: 1px solid #E2E7EF;
          margin-top: 0;
          max-height: 70vh;
          overflow-y: auto;
          position: fixed;
          top: 52px;
          left: 0;
          right: 0;
          background: white;
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.08);
          z-index: 1000;
        }

        .nav-new-mobile-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .nav-new-mobile-title {
          font-size: 10px;
          font-weight: 600;
          color: #98A2B3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 8px 2px;
        }

        .nav-new-mobile-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          text-decoration: none;
          color: #667085;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .nav-new-mobile-item .nav-link-icon {
          width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
        }

        .nav-new-mobile-item:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-new-mobile-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-new-mobile-item.active .nav-link-icon {
          opacity: 1;
        }

        .nav-new-mobile-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
          padding: 10px 12px;
          border: none;
          background: #FCEBEC;
          border-radius: 8px;
          color: #B3262E;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
        }

        .nav-new-mobile-logout:hover {
          background: #FED7D7;
        }

        .nav-new-mobile-logout svg {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 1100px) {
          .nav-new-link,
          .nav-new-dropdown-btn {
            padding: 4px 8px;
            font-size: 11px;
          }
          .nav-new-logo-text {
            font-size: 13px;
          }
          .nav-new-profile-name {
            max-width: 50px;
            font-size: 11px;
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
            height: 48px;
            padding: 0 12px;
          }
          .nav-new-logo-img {
            height: 28px;
          }
          .nav-new-logo-text {
            font-size: 12px;
          }
          .nav-new-profile-name {
            display: none;
          }
          .nav-new-profile {
            padding: 2px;
          }
          .nav-avatar,
          .nav-avatar-letter {
            width: 26px;
            height: 26px;
            font-size: 10px;
          }
          .nav-new-logout {
            width: 28px;
            height: 28px;
          }
          .nav-new-logout svg {
            width: 14px;
            height: 14px;
          }
          .nav-new-mobile {
            top: 48px;
          }
        }

        @media (max-width: 480px) {
          .nav-new {
            height: 44px;
            padding: 0 8px;
          }
          .nav-new-logo-text {
            display: none;
          }
          .nav-new-logo-img {
            height: 28px;
          }
          .nav-new-right {
            gap: 0;
          }
          .nav-new-logout {
            width: 26px;
            height: 26px;
          }
          .nav-new-logout svg {
            width: 13px;
            height: 13px;
          }
          .nav-avatar,
          .nav-avatar-letter {
            width: 24px;
            height: 24px;
            font-size: 9px;
          }
          .nav-new-mobile {
            top: 44px;
            padding: 10px 12px;
          }
          .nav-new-mobile-item {
            font-size: 12px;
            padding: 6px 8px;
          }
        }
      `}</style>
    </nav>
  );
}