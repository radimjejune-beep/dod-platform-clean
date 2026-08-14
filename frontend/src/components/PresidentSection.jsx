// frontend/src/components/PresidentSection.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function PresidentSection({ profile }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.is_president) {
      loadTasks();
    }
  }, [profile]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/president-tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      const myTasks = data.filter(t => 
        t.assigned_to === profile?.id || t.is_global === true
      );
      setTasks(myTasks);
    } catch (err) {
      console.error('Ошибка загрузки заданий:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { label: 'Ожидает', color: '#C9A227', bg: '#FBF4DC' },
      'in_progress': { label: 'В работе', color: '#174A7E', bg: '#EAF2FA' },
      'completed': { label: 'Выполнено ✅', color: '#16845B', bg: '#E8F5EF' },
      'rejected': { label: 'Отклонено ❌', color: '#B3262E', bg: '#FCEBEC' }
    };
    return badges[status] || badges['pending'];
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': '🟢 Низкий',
      'medium': '🟡 Средний',
      'high': '🔴 Высокий',
      'urgent': '🔥 Срочный'
    };
    return labels[priority] || priority;
  };

  if (!profile?.is_president) {
    return null;
  }

  return (
    <div className="president-section">
      <div className="president-section-header">
        <div className="president-section-title">
          <span className="president-section-icon">👑</span>
          <div>
            <h3>Задания для президента</h3>
            <p>Ваши поручения и задачи от руководства движения</p>
          </div>
        </div>
        <button
          className="president-section-btn"
          onClick={() => navigate('/president-tasks')}
        >
          Все задания →
        </button>
      </div>

      {loading ? (
        <div className="president-section-loading">
          <div className="spinner" style={{ width: '28px', height: '28px' }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="president-section-empty">
          <div className="president-section-empty-icon">🎉</div>
          <h4>У вас пока нет заданий</h4>
          <p>Когда руководство назначит вам задачу, она появится здесь</p>
        </div>
      ) : (
        <div className="president-section-list">
          {tasks.slice(0, 3).map((task) => {
            const status = getStatusBadge(task.status);
            return (
              <div
                key={task.id}
                className="president-section-task"
                onClick={() => navigate('/president-tasks')}
              >
                <div className="president-section-task-left">
                  <div className="president-section-task-status" style={{ background: status.bg }}>
                    <span style={{ color: status.color }}>●</span>
                    {status.label}
                  </div>
                  <div className="president-section-task-title">{task.title}</div>
                  <div className="president-section-task-meta">
                    {task.priority && (
                      <span className="president-section-task-priority">
                        {getPriorityLabel(task.priority)}
                      </span>
                    )}
                    {task.deadline && (
                      <span className="president-section-task-deadline">
                        📅 {new Date(task.deadline).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    {task.club_name && (
                      <span className="president-section-task-club">
                        🏫 {task.club_name}
                      </span>
                    )}
                  </div>
                </div>
                {task.status !== 'completed' ? (
                  <div className="president-section-task-arrow">→</div>
                ) : (
                  <div className="president-section-task-done">✅</div>
                )}
              </div>
            );
          })}
          {tasks.length > 3 && (
            <div className="president-section-more">
              + ещё {tasks.length - 3} заданий
            </div>
          )}
        </div>
      )}

      <style>{`
        .president-section {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 24px 28px;
          border: 1px solid #E2E7EF;
          box-shadow: 0 4px 16px rgba(11, 31, 58, 0.04);
          margin-top: 20px;
          transition: all 0.3s ease;
        }

        .president-section:hover {
          box-shadow: 0 8px 32px rgba(11, 31, 58, 0.08);
          border-color: #C9A227;
        }

        .president-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F4F6F9;
        }

        .president-section-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .president-section-icon {
          font-size: 32px;
        }

        .president-section-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #0B1F3A;
          margin: 0 0 2px 0;
        }

        .president-section-title p {
          font-size: 13px;
          color: #98A2B3;
          margin: 0;
        }

        .president-section-btn {
          padding: 8px 20px;
          background: transparent;
          color: #174A7E;
          border: 1.5px solid #E2E7EF;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .president-section-btn:hover {
          background: #EAF2FA;
          border-color: #174A7E;
          transform: translateY(-2px);
        }

        .president-section-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 30px 0;
        }

        .president-section-empty {
          text-align: center;
          padding: 32px 20px;
        }

        .president-section-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .president-section-empty h4 {
          font-size: 18px;
          font-weight: 600;
          color: #0B1F3A;
          margin: 0 0 6px 0;
        }

        .president-section-empty p {
          font-size: 14px;
          color: #98A2B3;
          margin: 0;
        }

        .president-section-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .president-section-task {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: #F8FAFC;
          border-radius: 12px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .president-section-task:hover {
          background: #F0F4FF;
          border-color: #C9A227;
          transform: translateX(4px);
        }

        .president-section-task-left {
          flex: 1;
          min-width: 0;
        }

        .president-section-task-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .president-section-task-status span:first-child {
          font-size: 10px;
        }

        .president-section-task-title {
          font-size: 15px;
          font-weight: 500;
          color: #0B1F3A;
          margin-top: 4px;
        }

        .president-section-task-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .president-section-task-priority {
          font-size: 12px;
          color: #667085;
        }

        .president-section-task-deadline {
          font-size: 12px;
          color: #98A2B3;
        }

        .president-section-task-club {
          font-size: 12px;
          color: #174A7E;
        }

        .president-section-task-arrow {
          font-size: 20px;
          color: #C9A227;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .president-section-task-done {
          font-size: 20px;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .president-section-more {
          text-align: center;
          font-size: 13px;
          color: #98A2B3;
          padding: 8px 0 4px;
        }

        @media (max-width: 768px) {
          .president-section {
            padding: 16px 18px;
          }

          .president-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .president-section-title h3 {
            font-size: 16px;
          }

          .president-section-btn {
            width: 100%;
            text-align: center;
          }

          .president-section-task {
            flex-wrap: wrap;
            gap: 8px;
          }

          .president-section-task-meta {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 480px) {
          .president-section {
            padding: 14px 14px;
          }

          .president-section-icon {
            font-size: 24px;
          }

          .president-section-title h3 {
            font-size: 15px;
          }

          .president-section-task {
            padding: 12px 14px;
          }

          .president-section-task-title {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}