// frontend/src/pages/MyInvitations.jsx
//
// Приглашения КЮДа на форумы и выезды. Заменяет переписку в мессенджере
// и ссылку на Google-форму: руководитель видит, куда его клуб приглашён,
// до какого числа собрать команду и сколько человек можно заявить.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

const STATUS = {
  not_started: { label: 'Команда не собрана', color: 'var(--color-gold)', bg: 'var(--color-gold-pale)' },
  draft: { label: 'Черновик', color: 'var(--color-gray-600)', bg: 'var(--color-gray-100)' },
  submitted: { label: 'Отправлена на утверждение', color: 'var(--color-primary-light)', bg: 'var(--color-info-bg)' },
  approved: { label: 'Утверждена', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  revision_requested: { label: '↩ Возвращена на доработку', color: 'var(--color-error)', bg: 'var(--color-error-bg)' }
};

export default function MyInvitations() {
  const [profile, setProfile] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
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

      const data = await api.getMyClubInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Ошибка загрузки приглашений:', err);
      setMessage('Не удалось загрузить приглашения');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Черновик команды создаётся при первом переходе — руководителю не нужно
  // помнить про отдельную кнопку «создать»
  const openTeam = async (invitation) => {
    const key = `${invitation.event_id}:${invitation.club_id}`;
    setBusyKey(key);
    setMessage('');

    try {
      let submissionId = invitation.submission_id;

      if (!submissionId) {
        const created = await api.createTeamSubmission(invitation.event_id, invitation.club_id);
        if (created?.error) throw new Error(api.describeApiError(created));
        submissionId = created.id;
      }

      navigate(`/team/${submissionId}`);
    } catch (err) {
      setMessage('❌ ' + err.message);
      setMessageType('error');
      setBusyKey(null);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    return diff;
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
        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '8px' }}>Приглашения на мероприятия</h2>
          <div style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
            Здесь появляются форумы и выезды, на которые приглашён ваш КЮД.
            Состав команды собирается из участников клуба — данные подтянутся
            из их карточек.
          </div>
        </div>

        {invitations.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div>Приглашений пока нет</div>
            <div style={{ fontSize: '14px', color: 'var(--color-gray-500)', marginTop: '8px' }}>
              Когда координатор движения пригласит ваш КЮД на форум, приглашение появится здесь
            </div>
          </div>
        )}

        {invitations.map((inv) => {
          const status = STATUS[inv.status] || STATUS.not_started;
          const left = daysLeft(inv.deadline);
          const key = `${inv.event_id}:${inv.club_id}`;

          return (
            <div
              className="card"
              key={key}
              style={{
                padding: '20px',
                marginBottom: '16px',
                borderLeft: `4px solid ${inv.is_overdue ? 'var(--color-error)' : status.color}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <h3 style={{ marginBottom: '6px' }}>{inv.event_title}</h3>

                  <div style={{ fontSize: '14px', color: 'var(--color-gray-500)', marginBottom: '10px' }}>
                    {inv.club_name}
                    {inv.event_date && <> · {formatDate(inv.event_date)}</>}
                    {inv.location && <> · {inv.location}</>}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span
                      className="tag"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>

                    {inv.quota && (
                      <span className="tag">
                        до {inv.quota} чел.
                      </span>
                    )}

                    {inv.allow_escorts && <span className="tag">с сопровождающими</span>}

                    {inv.members_count > 0 && (
                      <span className="tag">в команде: {inv.members_count}</span>
                    )}
                  </div>

                  {inv.deadline && (
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: inv.is_overdue ? 'var(--color-error)' : left !== null && left <= 3 ? 'var(--color-gold-dark)' : 'var(--color-gray-600)'
                    }}>
                      {inv.is_overdue
                        ? `Срок истёк ${formatDate(inv.deadline)}`
                        : left === 0
                          ? 'Последний день — сегодня'
                          : `Собрать до ${formatDate(inv.deadline)}${left !== null && left > 0 ? ` (осталось дней: ${left})` : ''}`}
                    </div>
                  )}

                  {inv.message && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '14px',
                      color: 'var(--color-gray-700)'
                    }}>
                      {inv.message}
                    </div>
                  )}

                  {inv.status === 'revision_requested' && inv.review_comment && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      background: 'var(--color-error-bg)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '14px',
                      color: 'var(--color-error)'
                    }}>
                      <strong>Что исправить:</strong> {inv.review_comment}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <button
                    className={inv.status === 'approved' ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => openTeam(inv)}
                    disabled={busyKey === key}
                  >
                    {busyKey === key
                      ? 'Открываю...'
                      : inv.status === 'not_started'
                        ? 'Собрать команду'
                        : inv.status === 'approved'
                          ? 'Посмотреть состав'
                          : 'Открыть команду'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
