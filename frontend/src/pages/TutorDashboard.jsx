// frontend/src/pages/TutorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TutorDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assignments: 0,
    reviews: 0,
    events: 0,
    pending_invitations: 0
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
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

      if (userData.role !== 'tutor') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      setStats({
        assignments: 0,
        reviews: 0,
        events: 0,
        pending_invitations: 0
      });
      setRecentAssignments([]);
      setPendingInvitations([]);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
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
        {/* ❌ УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="number">{stats.events}</div>
            <div className="label">Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.assignments}</div>
            <div className="label">Назначений</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.reviews}</div>
            <div className="label">Оценок</div>
          </div>
          <div className="stat-card" style={{ borderTop: stats.pending_invitations > 0 ? '3px solid #C9A227' : '3px solid transparent' }}>
            <div className="number" style={{ color: stats.pending_invitations > 0 ? '#C9A227' : '#667085' }}>
              {stats.pending_invitations}
            </div>
            <div className="label">Приглашений</div>
            {stats.pending_invitations > 0 && (
              <div style={{ fontSize: '11px', color: '#C9A227' }}>
                ⏳ Ожидают ответа
              </div>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📨 Ожидающие приглашения
            </h3>
            {pendingInvitations.length === 0 ? (
              <p style={{ color: '#667085' }}>Нет ожидающих приглашений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="list-item" style={{ borderLeftColor: '#C9A227' }}>
                    <div className="title">{inv.event_title || 'Мероприятие'}</div>
                    <div className="subtitle">
                      📅 {inv.event_date ? new Date(inv.event_date).toLocaleDateString('ru-RU') : ''}
                      {inv.location && ` • 📍 ${inv.location}`}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-success"
                        style={{ padding: '4px 16px', fontSize: '12px' }}
                        onClick={() => {}}
                      >
                        ✅ Принять
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 16px', fontSize: '12px' }}
                        onClick={() => {}}
                      >
                        ❌ Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/staff')}
            >
              Все приглашения →
            </button>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📋 Мои мероприятия
            </h3>
            {recentAssignments.length === 0 ? (
              <p style={{ color: '#667085' }}>У вас пока нет назначений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="list-item" style={{ borderLeftColor: '#174A7E' }}>
                    <div className="title">{assignment.event_title || 'Мероприятие'}</div>
                    <div className="subtitle">
                      📅 {assignment.event_date ? new Date(assignment.event_date).toLocaleDateString('ru-RU') : ''}
                      {assignment.location && ` • 📍 ${assignment.location}`}
                    </div>
                    <div className="meta">
                      🎯 {assignment.role || 'Роль не указана'}
                      {assignment.is_lead_tutor && (
                        <span className="tag tag-gold" style={{ marginLeft: '8px', fontSize: '10px' }}>
                          ⭐ Старший
                        </span>
                      )}
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '8px', padding: '4px', fontSize: '12px' }}
                      onClick={() => navigate(`/tutor-journal/${assignment.event_id}`)}
                    >
                      📝 Перейти к журналу
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/my-journal')}
            >
              Все мероприятия →
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0B1F3A', marginBottom: '12px' }}>
            ⚡ Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/my-journal')}
            >
              📋 Мой журнал
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff-calendar')}
            >
              📅 Календарь
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff')}
            >
              📨 Приглашения
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/participants')}
            >
              👥 Участники
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}