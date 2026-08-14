// frontend/src/components/Navigation.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Notifications from './Notifications';
import logo from '../assets/Image.png';

// ============================================================
// ИКОНКИ (SVG)
// ============================================================
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
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function Navigation({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  
  const isActive = (path) => location.pathname === path;
  const role = profile?.role || 'participant';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('loginTime');
    navigate('/login');
  };

  const getAvatar = () => {
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="Аватар" className="nav-avatar" />;
    }
    const initial = profile?.full_name?.charAt(0) || '?';
    return (
      <div className="nav-avatar-letter">
        {initial.toUpperCase()}
      </div>
    );
  };

  const getMenuGroups = () => {
    const groups = {
      main: [
        { path: '/dashboard', label: 'Дашборд', icon: Icons.dashboard, roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
        { path: '/participant-dashboard', label: 'Мой кабинет', icon: Icons.dashboard, roles: ['participant'] },
        { path: '/parent-dashboard', label: 'Мой кабинет', icon: Icons.dashboard, roles: ['parent'] },
        { path: '/club-coordinator-dashboard', label: 'Мой кабинет', icon: Icons.dashboard, roles: ['club_coordinator'] },
        { path: '/tutor-dashboard', label: 'Мой кабинет', icon: Icons.dashboard, roles: ['tutor'] },
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
      clubManagement: [
        { 
          path: profile?.club_id ? `/club/${profile.club_id}/president` : '/clubs', 
          label: '👑 Назначить президента', 
          icon: Icons.target, 
          roles: ['club_coordinator'] 
        },
        { 
          path: '/club-rating', 
          label: '🏆 Рейтинг клуба', 
          icon: Icons.award, 
          roles: ['club_coordinator'] 
        },
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
      documents: [
        { 
          path: '/documents', 
          label: '📜 Официальные документы', 
          icon: Icons.fileText, 
          roles: ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'] 
        },
      ],
      staffCalendar: [
        { path: '/staff-calendar', label: 'Календарь сотрудников', icon: Icons.calendar, roles: ['admin', 'movement_coordinator'] },
      ],
      clubEvents: [
        { path: '/my-club-events', label: 'Мои мероприятия', icon: Icons.calendar, roles: ['club_coordinator', 'participant', 'tutor'] },
        { path: '/club-calendar', label: 'Календарь клуба', icon: Icons.calendar, roles: ['club_coordinator', 'participant', 'tutor'] },
      ],
      settings: [
        { path: '/settings', label: 'Настройки', icon: Icons.settings, roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/news', label: 'Новости', icon: Icons.mail, roles: ['admin', 'movement_coordinator'] },
        { path: '/admin/invite', label: 'Пригласить', icon: Icons.userPlus, roles: ['admin', 'movement_coordinator'] },
        { path: '/import-participants', label: 'Импорт', icon: Icons.upload, roles: ['admin', 'movement_coordinator'] },
      ],
      assignments: [
        { 
         path: '/tutor-assignments', 
         label: '📅 Мои назначения', 
         icon: Icons.calendar, 
         roles: ['tutor'] 
        },
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

  const groupLabels = {
    main: 'Главная',
    events: 'Мероприятия',
    people: 'Люди',
    clubs: 'КЮДы',
    clubManagement: 'Управление клубом',
    achievements: 'Достижения',
    reviews: 'Оценки',
    reports: 'Отчёты',
    tasks: 'Задания',
    communication: 'Коммуникация',
    documents: '📜 Официальные документы',
    staffCalendar: 'Календарь',
    clubEvents: 'Мой клуб',
    settings: 'Настройки',
  };

  const groupOrder = ['main', 'events', 'people', 'clubs', 'clubManagement', 'achievements', 'reviews', 'reports', 'tasks', 'communication', 'documents', 'staffCalendar', 'clubEvents', 'settings'];

  const menuGroups = getMenuGroups();

  const sortedGroups = Object.entries(menuGroups).sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false);
        setOpenSubmenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setOpenSubmenu(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const toggleSubmenu = (key) => {
    setOpenSubmenu(openSubmenu === key ? null : key);
  };

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

        <div className="nav-new-right">
          <Notifications profile={profile} />
          
          <Link to="/profile" className="nav-new-profile">
            {getAvatar()}
            <span className="nav-new-profile-name">
              {profile?.full_name?.split(' ')[0] || 'Профиль'}
            </span>
          </Link>

          <button 
            ref={buttonRef}
            className={`nav-new-menu-btn ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {isMenuOpen ? Icons.close : Icons.menu}
          </button>
        </div>
      </div>

      {/* ===== ВЫПАДАЮЩЕЕ МЕНЮ ===== */}
      <div 
        ref={menuRef}
        className={`nav-menu-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => {
          setIsMenuOpen(false);
          setOpenSubmenu(null);
        }}
      >
        <div 
          className={`nav-menu-panel ${isMenuOpen ? 'open' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="nav-menu-header">
            <div className="nav-menu-user">
              <div className="nav-menu-avatar">
                {getAvatar()}
              </div>
              <div className="nav-menu-user-info">
                <div className="nav-menu-user-name">{profile?.full_name || 'Пользователь'}</div>
                <div className="nav-menu-user-role">{profile?.role || 'Участник'}</div>
              </div>
            </div>
          </div>

          <div className="nav-menu-body">
            {sortedGroups.map(([key, items]) => {
              if (!items || items.length === 0) return null;
              const label = groupLabels[key] || key;
              const isOpen = openSubmenu === key;
              const hasActive = items.some(item => isActive(item.path));

              if (key === 'main') {
                return items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => {
                      setIsMenuOpen(false);
                      setOpenSubmenu(null);
                    }}
                  >
                    <span className="nav-menu-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ));
              }

              return (
                <div key={key} className="nav-menu-group">
                  <button
                    className={`nav-menu-group-btn ${hasActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                    onClick={() => toggleSubmenu(key)}
                  >
                    <span className="nav-menu-group-label">{label}</span>
                    <span className={`nav-menu-group-arrow ${isOpen ? 'rotated' : ''}`}>▾</span>
                  </button>
                  <div className={`nav-menu-sublist ${isOpen ? 'open' : ''}`}>
                    {items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-menu-subitem ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          setOpenSubmenu(null);
                        }}
                      >
                        <span className="nav-menu-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="nav-menu-footer">
            <button className="nav-menu-logout" onClick={handleLogout}>
              {Icons.logout}
              Выйти
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .nav-new {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E7EF;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 999;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(11, 31, 58, 0.04);
          width: 100%;
        }

        .nav-new-container {
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          font-size: 16px;
          font-weight: 700;
          color: #0B1F3A;
          letter-spacing: 0.3px;
        }

        .nav-new-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .nav-new-link {
          padding: 6px 16px;
          color: #0B1F3A;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .nav-new-link:hover {
          background: #F4F6F9;
        }

        .nav-new-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 10px 2px 2px;
          border-radius: 20px;
          text-decoration: none;
          color: #0B1F3A;
          transition: all 0.2s ease;
        }

        .nav-new-profile:hover {
          background: #F4F6F9;
        }

        .nav-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E2E7EF;
        }

        .nav-avatar-letter {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
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
          color: #0B1F3A;
        }

        .nav-new-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #0B1F3A;
          padding: 0;
          margin-left: 2px;
        }

        .nav-new-menu-btn:hover {
          background: #F4F6F9;
        }

        .nav-new-menu-btn.open {
          background: #F4F6F9;
        }

        .nav-new-menu-btn svg {
          width: 22px;
          height: 22px;
        }

        .nav-menu-overlay {
          position: fixed;
          top: 56px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(11, 31, 58, 0.3);
          backdrop-filter: blur(2px);
          z-index: 998;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .nav-menu-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .nav-menu-panel {
          position: fixed;
          top: 56px;
          right: 0;
          bottom: 0;
          width: 380px;
          max-width: 85vw;
          background: #FFFFFF;
          box-shadow: -8px 0 40px rgba(11, 31, 58, 0.12);
          z-index: 999;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .nav-menu-panel.open {
          transform: translateX(0);
        }

        .nav-menu-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #F4F6F9;
          flex-shrink: 0;
        }

        .nav-menu-user {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .nav-menu-avatar {
          flex-shrink: 0;
        }

        .nav-menu-avatar .nav-avatar,
        .nav-menu-avatar .nav-avatar-letter {
          width: 44px;
          height: 44px;
          font-size: 16px;
        }

        .nav-menu-user-info {
          flex: 1;
          min-width: 0;
        }

        .nav-menu-user-name {
          font-size: 15px;
          font-weight: 600;
          color: #0B1F3A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-menu-user-role {
          font-size: 12px;
          color: #98A2B3;
        }

        .nav-menu-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
        }

        .nav-menu-body::-webkit-scrollbar {
          width: 4px;
        }

        .nav-menu-body::-webkit-scrollbar-thumb {
          background: #D5DCE7;
          border-radius: 2px;
        }

        .nav-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
          margin-bottom: 1px;
        }

        .nav-menu-item:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-menu-item.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-menu-item .nav-menu-icon svg {
          width: 18px;
          height: 18px;
          opacity: 0.6;
        }

        .nav-menu-item.active .nav-menu-icon svg,
        .nav-menu-item:hover .nav-menu-icon svg {
          opacity: 1;
        }

        .nav-menu-group {
          margin-bottom: 2px;
        }

        .nav-menu-group-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #667085;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .nav-menu-group-btn:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-menu-group-btn.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-menu-group-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-menu-group-arrow {
          font-size: 8px;
          transition: transform 0.3s ease;
          color: #98A2B3;
        }

        .nav-menu-group-arrow.rotated {
          transform: rotate(180deg);
        }

        .nav-menu-sublist {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-menu-sublist.open {
          max-height: 500px;
        }

        .nav-menu-subitem {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px 8px 36px;
          border-radius: 8px;
          text-decoration: none;
          color: #667085;
          font-size: 13px;
          font-weight: 400;
          transition: all 0.15s ease;
        }

        .nav-menu-subitem:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .nav-menu-subitem.active {
          background: #F4F6F9;
          color: #0B1F3A;
          font-weight: 600;
        }

        .nav-menu-subitem .nav-menu-icon svg {
          width: 16px;
          height: 16px;
          opacity: 0.5;
        }

        .nav-menu-subitem.active .nav-menu-icon svg,
        .nav-menu-subitem:hover .nav-menu-icon svg {
          opacity: 1;
        }

        .nav-menu-footer {
          padding: 14px 20px 20px;
          border-top: 1px solid #F4F6F9;
          flex-shrink: 0;
        }

        .nav-menu-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px;
          border: none;
          background: #FCEBEC;
          border-radius: 8px;
          color: #B3262E;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .nav-menu-logout:hover {
          background: #FED7D7;
        }

        .nav-menu-logout svg {
          width: 18px;
          height: 18px;
        }

        @media (max-width: 1200px) {
          .nav-new {
            padding: 0 16px;
          }
          .nav-new-container {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .nav-new {
            height: 50px;
            padding: 0 12px;
          }
          .nav-new-logo-img {
            height: 26px;
          }
          .nav-new-logo-text {
            font-size: 13px;
          }
          .nav-new-profile-name {
            display: none;
          }
          .nav-avatar,
          .nav-avatar-letter {
            width: 26px;
            height: 26px;
            font-size: 10px;
          }
          .nav-new-menu-btn {
            width: 34px;
            height: 34px;
          }
          .nav-new-menu-btn svg {
            width: 20px;
            height: 20px;
          }
          .nav-menu-overlay {
            top: 50px;
          }
          .nav-menu-panel {
            top: 50px;
            width: 320px;
          }
          .nav-menu-header {
            padding: 16px 20px 12px;
          }
          .nav-menu-body {
            padding: 8px 12px;
          }
          .nav-menu-item {
            font-size: 13px;
            padding: 8px 12px;
          }
          .nav-menu-group-btn {
            font-size: 13px;
            padding: 8px 12px;
          }
          .nav-menu-subitem {
            font-size: 12px;
            padding: 6px 12px 6px 32px;
          }
          .nav-menu-panel {
            width: 320px;
          }
        }

        @media (max-width: 480px) {
          .nav-new {
            height: 46px;
            padding: 0 8px;
          }
          .nav-new-logo-text {
            display: none;
          }
          .nav-new-logo-img {
            height: 24px;
          }
          .nav-new-profile {
            padding: 2px 6px 2px 2px;
          }
          .nav-avatar,
          .nav-avatar-letter {
            width: 24px;
            height: 24px;
            font-size: 9px;
          }
          .nav-new-menu-btn {
            width: 30px;
            height: 30px;
          }
          .nav-new-menu-btn svg {
            width: 18px;
            height: 18px;
          }
          .nav-menu-overlay {
            top: 46px;
          }
          .nav-menu-panel {
            top: 46px;
            width: 280px;
          }
          .nav-menu-header {
            padding: 14px 16px 10px;
          }
          .nav-menu-user-name {
            font-size: 13px;
          }
          .nav-menu-body {
            padding: 6px 10px;
          }
          .nav-menu-item {
            font-size: 12px;
            padding: 6px 10px;
          }
          .nav-menu-group-btn {
            font-size: 12px;
            padding: 6px 10px;
          }
          .nav-menu-subitem {
            font-size: 11px;
            padding: 5px 10px 5px 28px;
          }
          .nav-menu-panel {
            width: 280px;
          }
          .nav-menu-footer {
            padding: 10px 16px 14px;
          }
          .nav-menu-logout {
            font-size: 12px;
            padding: 8px;
          }
        }
      `}</style>
    </nav>
  );
}