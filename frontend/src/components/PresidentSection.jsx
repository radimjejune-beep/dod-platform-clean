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
      
      // Фильтруем задания, назначенные этому президенту
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
      'pending': { label: '⏳ Ожидает', color: '#C9A227', bg: '#FBF4DC' },
      'in_progress': { label: '🔄 В работе', color: '#174A7E', bg: '#EAF2FA' },
      'completed': { label: '✅ Выполнено', color: '#16845B', bg: '#E8F5EF' },
      'rejected': { label: '❌ Отклонено', color: '#B3262E', bg: '#FCEBEC' }
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
    <div className="card" style={{ marginTop: '20px', borderLeft: '4px solid #C9A227' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
          👑 Задания для президента
        </h3>
        <button
          className="btn-primary"
          style={{ padding: '6px 16px', fontSize: '12px' }}
          onClick={() => navigate('/president-tasks')}
        >
          Все задания →
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px' }} />
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#98A2B3',
          fontSize: '14px'
        }}>
          🎉 У вас пока нет заданий
          <br />
          <span style={{ fontSize: '12px' }}>
            Когда вам назначат задание, оно появится здесь
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.slice(0, 3).map((task) => {
            const status = getStatusBadge(task.status);
            return (
              <div
                key={task.id}
                style={{
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${status.color}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => navigate('/president-tasks')}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F0EDE8'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#0B1F3A', fontSize: '14px' }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="tag" style={{ background: status.bg, color: status.color, fontSize: '10px' }}>
                        {status.label}
                      </span>
                      <span className="tag" style={{
                        background: task.priority === 'urgent' ? '#FCEBEC' :
                                  task.priority === 'high' ? '#FCEBEC' :
                                  task.priority === 'medium' ? '#FBF4DC' : '#F4F6F9',
                        color: task.priority === 'urgent' ? '#B3262E' :
                               task.priority === 'high' ? '#B3262E' :
                               task.priority === 'medium' ? '#8A6A00' : '#667085',
                        fontSize: '10px'
                      }}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      {task.deadline && (
                        <span style={{ fontSize: '11px', color: '#98A2B3' }}>
                          📅 Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.status !== 'completed' && (
                    <span style={{ fontSize: '20px' }}>➜</span>
                  )}
                  {task.status === 'completed' && (
                    <span style={{ fontSize: '16px', color: '#16845B' }}>✅</span>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length > 3 && (
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#98A2B3' }}>
              ... и ещё {tasks.length - 3} заданий
            </div>
          )}
        </div>
      )}
    </div>
  );
}