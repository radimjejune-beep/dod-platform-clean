// frontend/src/pages/TutorDashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function TutorDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assignments: 0,
    events: 0,
    pending_invitations: 0
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [responding, setResponding] = useState(null);
  const [error, setError] = useState('');
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

      // Раньше здесь стояли нули и пустые списки — буквально, в коде.
      // Тьютор с тремя назначениями и непрочитанным приглашением видел
      // «0 назначений» и «нет ожидающих приглашений», и на приглашение
      // никто не отвечал, потому что о нём никто не знал.
      const [assignments, invitations] = await Promise.all([
        api.getTutorAssignments(),
        api.getTutorInvitations()
      ]);

      const pending = invitations.filter((inv) => inv.status === 'pending');
      const accepted = assignments.filter((a) => a.status === 'accepted');

      setStats({
        assignments: assignments.length,
        events: new Set(accepted.map((a) => a.event_id)).size,
        pending_invitations: pending.length
      });
      setRecentAssignments(accepted.slice(0, 5));
      setPendingInvitations(pending.slice(0, 5));

    } catch (err) {
      console.error('Ошибка:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const respond = async (invitationId, status) => {
    setResponding(invitationId);
    setError('');
    try {
      const result = await api.respondToTutorInvitation(invitationId, status);
      if (result?.error) throw new Error(api.describeApiError(result));
      await loadData();
    } catch (err) {
      setError(err.message || 'Не удалось отправить ответ');
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">Дашборд тьютора</h1>
            <p className="page-subtitle">Ваши назначения и приглашения на мероприятия</p>
          </div>
        </div>

        {/* УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

        {error && <div className="message-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="grid-3" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="number">{stats.events}</div>
            <div className="label">Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.assignments}</div>
            <div className="label">Назначений</div>
          </div>
          <div className="stat-card" style={{ borderTop: stats.pending_invitations > 0 ? '3px solid var(--color-gold)' : '3px solid transparent' }}>
            <div className="number" style={{ color: stats.pending_invitations > 0 ? 'var(--color-gold)' : 'var(--color-gray-500)' }}>
              {stats.pending_invitations}
            </div>
            <div className="label">Приглашений</div>
            {stats.pending_invitations > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--color-gold)' }}>
                Ожидают ответа
              </div>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
              Ожидающие приглашения
            </h3>
            {pendingInvitations.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>Нет ожидающих приглашений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="list-item" style={{ borderLeftColor: 'var(--color-gold)' }}>
                    <div className="title">{inv.event_title || 'Мероприятие'}</div>
                    <div className="subtitle">
                      <Icon name="calendar" size={14} /> {inv.event_date ? new Date(inv.event_date).toLocaleDateString('ru-RU') : ''}
                      {inv.location && ` • ${inv.location}`}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      {/* Обе кнопки были пустыми: onClick={() => {}}.
                          Тьютор нажимал «Принять» и ничего не происходило */}
                      <button
                        className="btn-success"
                        style={{ padding: '4px 16px', fontSize: '12px' }}
                        disabled={responding === inv.id}
                        onClick={() => respond(inv.id, 'accepted')}
                      >
                        {responding === inv.id ? 'Отправляем…' : 'Принять'}
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 16px', fontSize: '12px' }}
                        disabled={responding === inv.id}
                        onClick={() => respond(inv.id, 'declined')}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px', padding: '8px' }}
              onClick={() => navigate('/tutor-invitations')}
            >
              Все приглашения →
            </button>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
              Мои мероприятия
            </h3>
            {recentAssignments.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>У вас пока нет назначений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="list-item" style={{ borderLeftColor: 'var(--color-primary-light)' }}>
                    <div className="title">{assignment.event_title || 'Мероприятие'}</div>
                    <div className="subtitle">
                      <Icon name="calendar" size={14} /> {assignment.event_date ? new Date(assignment.event_date).toLocaleDateString('ru-RU') : ''}
                      {assignment.location && ` • ${assignment.location}`}
                    </div>
                    <div className="meta">
                      {assignment.role || 'Роль не указана'}
                      {assignment.is_lead_tutor && (
                        <span className="tag tag-gold" style={{ marginLeft: '8px', fontSize: '10px' }}>
                          Старший
                        </span>
                      )}
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '8px', padding: '4px', fontSize: '12px' }}
                      onClick={() => navigate(`/tutor-journal/${assignment.event_id}`)}
                    >
                      Перейти к журналу
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
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '12px' }}>
            Быстрые действия
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/my-journal')}
            >
              Мой журнал
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff-calendar')}
            >
              Календарь
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/staff')}
            >
              Приглашения
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => navigate('/participants')}
            >
              Участники
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}