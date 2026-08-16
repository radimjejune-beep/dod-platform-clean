// frontend/src/components/Navigation.jsx

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/Image.png';

export default function Navigation({ profile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const menuItems = [
    { path: '/dashboard', label: '📊 Дашборд' },
    { path: '/events', label: '📅 Мероприятия' },
    { path: '/participants', label: '👥 Участники' },
    { path: '/profile', label: '👤 Профиль' },
  ];

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
          <div className="nav-profile">
            <button className="nav-profile-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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

            {isMenuOpen && (
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
                <Link to="/profile" className="nav-profile-item" onClick={() => setIsMenuOpen(false)}>
                  👤 Мой профиль
                </Link>
                <button className="nav-profile-item nav-profile-logout" onClick={handleLogout}>
                  🚪 Выйти
                </button>
              </div>
            )}
          </div>
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
      `}</style>
    </nav>
  );
}