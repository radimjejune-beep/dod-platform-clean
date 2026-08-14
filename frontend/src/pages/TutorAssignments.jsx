// frontend/src/pages/TutorAssignments.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TutorAssignments() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/event-tutor-assignments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data || []);
      }
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/event-tutor-assignments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setMessage(status === 'accepted' ? '✅ Вы приняли назначение!' : '❌ Вы отклонили назначение');
      setMessageType(status === 'accepted' ? 'success' : 'error');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { label: '⏳ Ожидает', color: '#C9A227', bg: '#FBF4DC' },
      'accepted': { label: '✅ Принято', color: '#16845B', bg: '#E8F5EF' },
      'declined': { label: '❌ Отклонено', color: '#B3262E', bg: '#FCEBEC' }
    };
    return badges[status] || badges['pending'];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📅</span>
          <div>
            <h1>Мои назначения</h1>
            <p>Назначения на мероприятия</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {assignments.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>
              У вас пока нет назначений на мероприятия
            </p>
            <p style={{ color: '#667085' }}>
              Когда координатор назначит вас на мероприятие, оно появится здесь
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignments.map((assignment) => {
              const status = getStatusBadge(assignment.status);
              return (
                <div key={assignment.id} className="card" style={{ borderLeft: `4px solid ${status.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                        {assignment.event_title || 'Мероприятие'}
                      </h3>
                      <div style={{ color: '#667085', fontSize: '14px', marginTop: '4px' }}>
                        📅 {assignment.event_date ? new Date(assignment.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                        {assignment.location && ` • 📍 ${assignment.location}`}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                        {assignment.role && (
                          <span className="tag tag-blue">
                            🎯 {assignment.role === 'lead_tutor' ? '⭐ Старший тьютор' : 
                                    assignment.role === 'organizer' ? '📋 Организатор' : '📚 Тьютор'}
                          </span>
                        )}
                        {assignment.notes && (
                          <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                            📝 {assignment.notes}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                        👤 Назначил: {assignment.assigned_by_name || 'Неизвестно'}
                      </div>
                    </div>
                    {assignment.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-success"
                          style={{ padding: '6px 16px', fontSize: '13px' }}
                          onClick={() => handleRespond(assignment.id, 'accepted')}
                        >
                          ✅ Принять
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 16px', fontSize: '13px' }}
                          onClick={() => handleRespond(assignment.id, 'declined')}
                        >
                          ❌ Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}