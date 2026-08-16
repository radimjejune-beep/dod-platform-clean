// frontend/src/pages/EventManagement.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function EventManagement() {
  const { eventId } = useParams();
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'];
      if (!allowedRoles.includes(userData.role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const token = localStorage.getItem('token');

      // Загружаем мероприятие
      const events = await api.getEvents();
      const foundEvent = events.find(e => e.id === eventId);
      setEvent(foundEvent || null);

      // Загружаем участников
      const participantsRes = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        setParticipants(data || []);
      }

      // Загружаем доступных участников
      const availableRes = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/available-participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableParticipants(data || []);
      }

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки данных');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipants = async () => {
    if (selectedParticipants.length === 0) {
      setMessage('❌ Выберите хотя бы одного участника');
      setMessageType('error');
      return;
    }

    if (!confirm(`Добавить ${selectedParticipants.length} участников на мероприятие?`)) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const participantId of selectedParticipants) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ user_id: participantId })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    setMessage(`✅ Добавлено ${successCount} участников${errorCount > 0 ? `, ошибок: ${errorCount}` : ''}`);
    setMessageType(successCount > 0 ? 'success' : 'error');
    setShowAddModal(false);
    setSelectedParticipants([]);
    loadData();
    setTimeout(() => setMessage(''), 4000);
    setLoading(false);
  };

  const handleRemoveParticipant = async (participantId, fullName) => {
    if (!confirm(`Удалить "${fullName}" с мероприятия?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${eventId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления');
      }

      setMessage(`✅ ${fullName} удалён с мероприятия`);
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка удаления: ' + err.message);
      setMessageType('error');
    }
  };

  const toggleParticipantSelection = (id) => {
    setSelectedParticipants(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAvailable();
    if (selectedParticipants.length === filtered.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(filtered.map(p => p.id));
    }
  };

  const getFilteredAvailable = () => {
    if (!searchQuery) return availableParticipants;
    return availableParticipants.filter(p =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredAvailable = getFilteredAvailable();
  const isTutor = profile?.role === 'tutor';
  const isCoordinator = profile?.role === 'club_coordinator';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  const canManage = profile && ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile.role);

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <button
          className="btn-secondary"
          onClick={() => navigate('/events')}
          style={{ marginBottom: '20px' }}
        >
          ← Назад к мероприятиям
        </button>

        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📅</span>
          <div>
            <h1>{event?.title || 'Управление мероприятием'}</h1>
            <p>
              📅 {event?.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
              {event?.location && ` • 📍 ${event.location}`}
              {event?.is_global && <span className="tag" style={{ marginLeft: '8px', background: '#EDE7F6', color: '#6B46C1' }}>🌍 Глобальное</span>}
            </p>
          </div>
          {canManage && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowAddModal(true)}
            >
              ➕ Добавить участников
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              👥 Участники ({participants.length})
            </h3>
            {isTutor && (
              <button
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={() => navigate(`/tutor-journal/${eventId}`)}
              >
                📓 Журнал оценок
              </button>
            )}
          </div>

          {participants.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👀</div>
              <p>Участников пока нет</p>
              {canManage && (
                <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                  Нажмите <strong>"Добавить участников"</strong> чтобы добавить участников на мероприятие
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="list-item"
                  style={{ borderLeftColor: '#174A7E' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div className="title">
                        {p.full_name}
                        {p.club_name && (
                          <span className="tag" style={{ marginLeft: '8px', background: '#EAF2FA', color: '#174A7E', fontSize: '10px' }}>
                            🏫 {p.club_name}
                          </span>
                        )}
                        {p.status === 'attended' && (
                          <span className="tag" style={{ marginLeft: '8px', background: '#E8F5EF', color: '#16845B', fontSize: '10px' }}>
                            ✅ Присутствовал
                          </span>
                        )}
                      </div>
                      <div className="subtitle">
                        {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {p.score_status && (
                        <span className="tag" style={{
                          background: p.score_status === 'approved' ? '#E8F5EF' :
                                   p.score_status === 'submitted' ? '#FBF4DC' : '#F4F6F9',
                          color: p.score_status === 'approved' ? '#16845B' :
                                 p.score_status === 'submitted' ? '#C9A227' : '#667085',
                          fontSize: '10px'
                        }}>
                          {p.score_status === 'approved' ? '✅ Оценено' :
                           p.score_status === 'submitted' ? '⏳ На проверке' : '📝 Не оценено'}
                        </span>
                      )}
                      {canManage && (
                        <button
                          className="btn-danger"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleRemoveParticipant(p.user_id, p.full_name)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ УЧАСТНИКОВ */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 31, 58, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'modalSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              ➕ Добавить участников
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Выберите участников для добавления на мероприятие
            </p>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Поиск по имени, школе, классу..."
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#667085' }}>
                Доступно: {filteredAvailable.length} участников
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '2px 12px', fontSize: '11px' }}
                onClick={handleSelectAll}
              >
                {selectedParticipants.length === filteredAvailable.length ? 'Снять все' : 'Выбрать всех'}
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #E2E7EF', borderRadius: '8px' }}>
              {filteredAvailable.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#98A2B3' }}>
                  Все участники уже добавлены на мероприятие
                </div>
              ) : (
                filteredAvailable.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 14px',
                      borderBottom: '1px solid #F4F6F9',
                      cursor: 'pointer',
                      background: selectedParticipants.includes(p.id) ? '#FBF4DC' : 'transparent'
                    }}
                    onClick={() => toggleParticipantSelection(p.id)}
                    onMouseEnter={(e) => {
                      if (!selectedParticipants.includes(p.id)) {
                        e.currentTarget.style.background = '#F8FAFC';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedParticipants.includes(p.id)) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(p.id)}
                      onChange={() => toggleParticipantSelection(p.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        {p.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                        {p.school || 'Школа не указана'} • {p.class_name || 'Класс не указан'}
                        {p.club_name && ` • 🏫 ${p.club_name}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                className="btn-success"
                onClick={handleAddParticipants}
                disabled={selectedParticipants.length === 0 || loading}
                style={{ flex: 1 }}
              >
                {loading ? '⏳ Добавление...' : `✅ Добавить (${selectedParticipants.length})`}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}