// frontend/src/pages/Events.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';

export default function Events() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [pendingEvents, setPendingEvents] = useState([]);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [moderationComment, setModerationComment] = useState('');
  
  // ===== ФИЛЬТРЫ =====
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [form, setForm] = useState({
    id: null,
    title: '',
    description: '',
    location: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    type: 'internal',
    capacity: 20,
    club_id: '',
    form_url: '',
    is_global: false
  });
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

      const [clubsData, eventsData] = await Promise.all([
        api.getClubs(),
        api.getEvents()
      ]);

      setClubs(clubsData || []);
      setAllEvents(eventsData || []);
      
      const pending = eventsData.filter(e => e.moderation_status === 'pending');
      setPendingEvents(pending || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== ФИЛЬТРАЦИЯ =====
  const filterConfig = [
    {
      key: 'type',
      type: 'select',
      label: 'Тип',
      placeholder: 'Все типы',
      options: [
        { value: 'internal', label: '📌 Внутреннее' },
        { value: 'outgoing', label: '🌍 Выездное' },
        { value: 'global_forum', label: '🏛️ Форум' }
      ]
    },
    {
      key: 'moderation_status',
      type: 'select',
      label: 'Статус',
      placeholder: 'Все статусы',
      options: [
        { value: 'approved', label: '✅ Одобрено' },
        { value: 'pending', label: '⏳ На модерации' },
        { value: 'rejected', label: '❌ Отклонено' }
      ]
    },
    {
      key: 'is_global',
      type: 'checkbox',
      label: '🌍 Глобальные'
    }
  ];

  const getFilteredEvents = () => {
    let filtered = allEvents;

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    if (filters.moderation_status) {
      filtered = filtered.filter(e => e.moderation_status === filters.moderation_status);
    }

    if (filters.is_global) {
      filtered = filtered.filter(e => e.is_global === true);
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  // ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====
  const canEdit = (event) => {
    const role = profile?.role;
    const userId = profile?.id;
    if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role)) {
      return true;
    }
    if (role === 'club_coordinator') {
      const userClub = clubs.find(c => c.coordinator_id === userId || c.leader_id === userId);
      if (userClub && event.club_id === userClub.id) {
        return true;
      }
    }
    return false;
  };

  const canDelete = (event) => {
    const role = profile?.role;
    if (['admin', 'movement_coordinator'].includes(role)) {
      return true;
    }
    return false;
  };

  const canCreate = ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'].includes(profile?.role);
  const canModerate = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const eventData = {
        title: form.title,
        description: form.description,
        location: form.location,
        event_date: form.event_date,
        end_date: form.end_date || form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        type: form.type,
        capacity: parseInt(form.capacity),
        club_id: form.club_id || null,
        form_url: form.form_url || null,
        is_global: form.is_global || false
      };

      let result;
      if (form.id) {
        const eventToEdit = allEvents.find(e => e.id === form.id);
        if (!canEdit(eventToEdit)) {
          throw new Error('У вас нет прав для редактирования этого мероприятия');
        }
        result = await api.updateEvent(form.id, eventData);
      } else {
        result = await api.createEvent(eventData);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(form.id ? '✅ Мероприятие обновлено!' : '✅ Мероприятие создано!');
      setMessageType('success');
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      title: '',
      description: '',
      location: '',
      event_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      type: 'internal',
      capacity: 20,
      club_id: '',
      form_url: '',
      is_global: false
    });
    setShowForm(false);
  };

  const handleEdit = (event) => {
    setForm({
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      event_date: event.event_date || '',
      end_date: event.end_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      type: event.type || 'internal',
      capacity: event.capacity || 20,
      club_id: event.club_id || '',
      form_url: event.form_url || '',
      is_global: event.is_global || false
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить это мероприятие?')) return;
    try {
      const result = await api.deleteEvent(id);
      if (result.error) throw new Error(result.error);
      setMessage('✅ Мероприятие удалено');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleModerate = async (id, status) => {
    if (!confirm(`Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${id}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: status,
          comment: moderationComment
        })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setMessage(status === 'approved' ? '✅ Мероприятие одобрено!' : '❌ Мероприятие отклонено');
      setMessageType(status === 'approved' ? 'success' : 'error');
      setShowModerationModal(false);
      setModerationComment('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
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
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📅</span>
          <div>
            <h1>Мероприятия</h1>
            <p>Всего: {filteredEvents.length}</p>
          </div>
          {canCreate && (
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { resetForm(); setShowForm(!showForm); }}>
              {showForm ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {canModerate && pendingEvents.length > 0 && (
          <div className="card" style={{ marginBottom: '20px', background: '#FBF4DC', border: '2px solid #C9A227' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#8A6A00' }}>
              ⏳ Ожидают модерации ({pendingEvents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {pendingEvents.map((e) => (
                <div key={e.id} style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', border: '1px solid #E2E7EF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{e.title}</div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>🏫 {e.club_name || 'Без клуба'}</div>
                  </div>
                  <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => { setSelectedEvent(e); setShowModerationModal(true); }}>
                    📋 Рассмотреть
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setSearchQuery}
          searchPlaceholder="🔍 Поиск по названию, описанию, месту..."
        >
          <div style={{ fontSize: '14px', color: '#667085', padding: '6px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
            Найдено: <strong>{filteredEvents.length}</strong>
          </div>
        </FilterBar>

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>{form.id ? '✏️ Редактировать' : '📝 Создать'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Название *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="form-group"><label>Описание</label><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label>Место</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="grid-2">
                <div className="form-group"><label>Дата начала *</label><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required /></div>
                <div className="form-group"><label>Дата окончания</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Время начала</label><input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="form-group"><label>Время окончания</label><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="grid-3">
                <div className="form-group"><label>Тип</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="internal">Внутреннее</option><option value="outgoing">Выездное</option><option value="global_forum">Глобальный форум</option></select></div>
                <div className="form-group"><label>Лимит мест</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min="1" /></div>
                <div className="form-group"><label>Клуб</label><select value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}><option value="">Без клуба</option>{clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="form-group"><label>Ссылка на форму</label><input type="url" value={form.form_url} onChange={(e) => setForm({ ...form, form_url: e.target.value })} /></div>
              {profile?.role === 'club_coordinator' && (
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={form.is_global} onChange={(e) => setForm({ ...form, is_global: e.target.checked })} /> 🌍 Глобальное мероприятие</label></div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>{loading ? '⏳' : form.id ? '💾 Обновить' : '✅ Создать'}</button>
                <button type="button" className="btn-secondary" onClick={resetForm}>❌ Отмена</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Все мероприятия</h3>
          {filteredEvents.length === 0 ? (
            <div className="empty-state"><div className="icon">📭</div><p>Мероприятий не найдено</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEvents.map((event) => (
                <div key={event.id} className="list-item" style={{ borderLeftColor: event.moderation_status === 'pending' ? '#C9A227' : event.is_global ? '#6B46C1' : '#174A7E' }}>
                  <div className="title">
                    {event.title}
                    {event.is_global && <span className="tag" style={{ marginLeft: '8px', background: '#EDE7F6', color: '#6B46C1', fontSize: '10px' }}>🌍 Глобальное</span>}
                    {event.moderation_status === 'pending' && <span className="tag" style={{ marginLeft: '8px', background: '#FBF4DC', color: '#8A6A00', fontSize: '10px' }}>⏳ На модерации</span>}
                    {event.moderation_status === 'rejected' && <span className="tag" style={{ marginLeft: '8px', background: '#FCEBEC', color: '#B3262E', fontSize: '10px' }}>❌ Отклонено</span>}
                  </div>
                  <div className="subtitle">📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'} {event.location && `📍 ${event.location}`} {event.club_name && `🏫 ${event.club_name}`}</div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {canEdit(event) && <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => handleEdit(event)}>✏️ Редактировать</button>}
                    {canDelete(event) && <button className="btn-danger" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => handleDelete(event.id)}>🗑️ Удалить</button>}
                    {canModerate && event.moderation_status === 'pending' && (
                      <>
                        <button className="btn-success" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => { setSelectedEvent(event); setShowModerationModal(true); }}>✅ Одобрить</button>
                        <button className="btn-danger" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => { setSelectedEvent(event); setShowModerationModal(true); }}>❌ Отклонить</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModerationModal && selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 31, 58, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowModerationModal(false)}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
            <h3>📋 Модерация</h3>
            <p><strong>{selectedEvent.title}</strong><br />🏫 {selectedEvent.club_name || 'Без клуба'}</p>
            <div className="form-group"><label>Комментарий</label><textarea rows="3" value={moderationComment} onChange={(e) => setModerationComment(e.target.value)} placeholder="Причина..." /></div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-success" style={{ flex: 1 }} onClick={() => handleModerate(selectedEvent.id, 'approved')}>✅ Одобрить</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={() => handleModerate(selectedEvent.id, 'rejected')}>❌ Отклонить</button>
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setShowModerationModal(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}