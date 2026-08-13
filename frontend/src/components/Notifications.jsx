// frontend/src/components/Notifications.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Notifications({ profile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ============================================================
  // ЗАГРУЗКА УВЕДОМЛЕНИЙ
  // ============================================================
  useEffect(() => {
    if (profile?.id) {
      loadNotifications();
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profile]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
    setLoading(false);
  };

  // ============================================================
  // ОТМЕТИТЬ КАК ПРОЧИТАННОЕ
  // ============================================================
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://dod-backend.relaxdev.ru/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  // ============================================================
  // ОТМЕТИТЬ ВСЕ КАК ПРОЧИТАННЫЕ
  // ============================================================
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://dod-backend.relaxdev.ru/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  // ============================================================
  // ПОЛУЧЕНИЕ ИКОНКИ
  // ============================================================
  const getIcon = (type) => {
    const icons = {
      'event': '📅',
      'achievement': '🏆',
      'assignment': '📋',
      'appeal': '📨',
      'system': '⚙️',
      'club': '🏫',
      'review': '📊',
      'president': '👑',
      'invitation': '📨',
      'report': '📋',
      'deadline': '⏰',
      'mention': '💬',
    };
    return icons[type] || '📌';
  };

  // ============================================================
  // ПОЛУЧЕНИЕ ЦВЕТА
  // ============================================================
  const getColor = (type) => {
    const colors = {
      'event': '#174A7E',
      'achievement': '#C9A227',
      'assignment': '#6B46C1',
      'appeal': '#B3262E',
      'system': '#667085',
      'club': '#0B1F3A',
      'review': '#16845B',
      'president': '#C9A227',
      'invitation': '#174A7E',
      'report': '#8A6A00',
      'deadline': '#B3262E',
      'mention': '#6B46C1',
    };
    return colors[type] || '#667085';
  };

  // ============================================================
  // ФОРМАТИРОВАНИЕ ВРЕМЕНИ
  // ============================================================
  const formatTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return new Date(date).toLocaleDateString('ru-RU');
  };

  // ============================================================
  // КЛИК ПО УВЕДОМЛЕНИЮ
  // ============================================================
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="notifications-wrapper" ref={dropdownRef}>
      <button 
        className="notifications-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Уведомления"
      >
        <span className="notifications-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <span className="notifications-title">🔔 Уведомления</span>
            {unreadCount > 0 && (
              <button className="notifications-mark-all" onClick={markAllAsRead}>
                Все прочитаны
              </button>
            )}
          </div>

          {loading ? (
            <div className="notifications-loading">⏳ Загрузка...</div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <span className="notifications-empty-icon">📭</span>
              <p>Нет уведомлений</p>
            </div>
          ) : (
            <div className="notifications-list">
              {unreadNotifications.length > 0 && (
                <>
                  <div className="notifications-section-title">
                    Новые ({unreadNotifications.length})
                  </div>
                  {unreadNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="notification-item unread"
                      onClick={() => handleNotificationClick(n)}
                      style={{ borderLeftColor: getColor(n.type) }}
                    >
                      <div className="notification-icon">{getIcon(n.type)}</div>
                      <div className="notification-content">
                        <div className="notification-title">{n.title}</div>
                        <div className="notification-message">{n.message}</div>
                        <div className="notification-time">{formatTime(n.created_at)}</div>
                      </div>
                      {!n.read && <div className="notification-dot" />}
                    </div>
                  ))}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  <div className="notifications-section-title">
                    Прочитанные ({readNotifications.length})
                  </div>
                  {readNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="notification-item read"
                      onClick={() => handleNotificationClick(n)}
                      style={{ borderLeftColor: getColor(n.type) }}
                    >
                      <div className="notification-icon">{getIcon(n.type)}</div>
                      <div className="notification-content">
                        <div className="notification-title">{n.title}</div>
                        <div className="notification-message">{n.message}</div>
                        <div className="notification-time">{formatTime(n.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .notifications-wrapper {
          position: relative;
          display: inline-block;
        }

        .notifications-btn {
          position: relative;
          padding: 6px 8px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s ease;
          color: #667085;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notifications-btn:hover {
          background: #F4F6F9;
          color: #0B1F3A;
        }

        .notifications-icon {
          display: block;
          line-height: 1;
        }

        .notifications-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #B3262E;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid white;
          transform: translate(4px, -4px);
        }

        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 380px;
          max-height: 460px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 40px rgba(11, 31, 58, 0.15);
          border: 1px solid #E2E7EF;
          overflow: hidden;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #F4F6F9;
          flex-shrink: 0;
        }

        .notifications-title {
          font-size: 15px;
          font-weight: 600;
          color: #0B1F3A;
        }

        .notifications-mark-all {
          font-size: 12px;
          color: #174A7E;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .notifications-mark-all:hover {
          background: #EAF2FA;
        }

        .notifications-list {
          overflow-y: auto;
          flex: 1;
          padding: 4px 0;
        }

        .notifications-section-title {
          font-size: 11px;
          font-weight: 600;
          color: #98A2B3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 16px 4px;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          position: relative;
        }

        .notification-item:hover {
          background: #F8FAFC;
        }

        .notification-item.unread {
          background: #FAFBFF;
        }

        .notification-item.unread:hover {
          background: #F0F4FF;
        }

        .notification-icon {
          font-size: 18px;
          flex-shrink: 0;
          width: 28px;
          text-align: center;
          margin-top: 2px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-size: 13px;
          font-weight: 600;
          color: #0B1F3A;
          margin-bottom: 2px;
        }

        .notification-message {
          font-size: 13px;
          color: #667085;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-time {
          font-size: 11px;
          color: #98A2B3;
          margin-top: 4px;
        }

        .notification-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #174A7E;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .notification-item.read .notification-dot {
          display: none;
        }

        .notifications-empty {
          padding: 30px 20px;
          text-align: center;
          color: #98A2B3;
        }

        .notifications-empty-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .notifications-empty p {
          margin: 0;
          font-size: 14px;
        }

        .notifications-loading {
          padding: 30px 20px;
          text-align: center;
          color: #98A2B3;
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .notifications-dropdown {
            width: 300px;
            right: -50px;
          }
        }
      `}</style>
    </div>
  );
}