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
  
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [selectedEventForTutor, setSelectedEventForTutor] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [tutors, setTutors] = useState([]);
  const [tutorRole, setTutorRole] = useState('tutor');
  const [tutorNotes, setTutorNotes] = useState('');
  
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

  // ============================================================
  // ОПРЕДЕЛЯЕМ РОЛИ
  // ============================================================
  const isClubCoordinator = profile?.role === 'club_coordinator';
  const isMovementCoordinator = profile?.role === 'movement_coordinator';
  const isAdmin = profile?.role === 'admin';
  const canCreate = profile && ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'].includes(profile.role);
  const canModerate = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);
  const canAssignTutor = ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile?.role);

  // Получаем ID клуба координатора
  const getCoordinatorClubId = () => {
    if (!isClubCoordinator) return null;
    let clubId = profile?.club_id;
    if (!clubId) {
      const found = clubs.find(c => 
        c.coordinator_id === profile?.id || 
        c.leader_id === profile?.id
      );
      if (found) clubId = found.id;
    }
    return clubId;
  };

  const coordinatorClubId = getCoordinatorClubId();

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================================
  useEffect(() => {
    const clubId = localStorage.getItem('clubEventTarget');
    if (clubId && clubs.length > 0) {
      const club = clubs.find(c => c.id === clubId);
      if (club) {
        setForm(prev => ({ ...prev, club_id: clubId }));
        setMessage(`📝 Создание мероприятия для клуба: "${club.name}"`);
        setMessageType('success');
        setShowForm(true);
        localStorage.removeItem('clubEventTarget');
        setTimeout(() => setMessage(''), 4000);
      } else {
        localStorage.removeItem('clubEventTarget');
      }
    }
  }, [clubs]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const [clubsData, eventsData] = await Promise.all([
        api.getClubs().catch(() => []),
        api.getEvents().catch(() => [])
      ]);

      setClubs(clubsData || []);
      
      // ============================================================
      // ФИЛЬТРАЦИЯ СОБЫТИЙ ДЛЯ КООРДИНАТОРА КЮДА
      // ============================================================
      let filteredEvents = eventsData || [];
      
      if (userData.role === 'club_coordinator') {
        let coordinatorClubId = userData.club_id;
        
        if (!coordinatorClubId) {
          try {
            const coordResponse = await fetch(
              `https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${userData.id}`,
              { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
            );
            const coordData = await coordResponse.json();
            if (coordData && coordData.length > 0) {
              coordinatorClubId = coordData[0].club_id;
            }
          } catch (e) {
            console.log('Ошибка получения координатора:', e);
          }
        }

        if (coordinatorClubId) {
          // Координатор видит:
          // 1. Внутренние мероприятия своего клуба
          // 2. Выездные (outgoing) — все
          // 3. Глобальные (global_forum) — все
          filteredEvents = eventsData.filter(e => {
            if (e.type === 'internal' || e.is_club_event) {
              return e.club_id === coordinatorClubId;
            }
            return ['outgoing', 'global_forum'].includes(e.type) || e.is_global === true;
          });
          console.log(`🏫 Координатор КЮДа: показано ${filteredEvents.length} мероприятий`);
        } else {
          filteredEvents = [];
        }
      } else if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userData.role)) {
        filteredEvents = eventsData;
      }

      setAllEvents(filteredEvents);
      
      // ✅ НЕ ЗАГРУЖАЕМ users — у координатора нет прав!
      // Загружаем тьюторов только если есть права
      if (['admin', 'movement_coordinator'].includes(userData.role)) {
        try {
          const usersData = await api.getUsers().catch(() => []);
          const tutorList = usersData.filter(u => u.role === 'tutor');
          setTutors(tutorList || []);
        } catch (e) {
          console.log('Ошибка загрузки тьюторов:', e);
        }
      }
      
      const pending = filteredEvents.filter(e => e.moderation_status === 'pending');
      setPendingEvents(pending || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ФИЛЬТРЫ
  // ============================================================
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
    },
    {
      key: 'is_club_event',
      type: 'checkbox',
      label: '🏫 Внутренние клуба'
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

    if (filters.is_club_event) {
      filtered = filtered.filter(e => e.is_club_event === true);
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  // ============================================================
  // ПРОВЕРКА ПРАВ НА РЕДАКТИРОВАНИЕ/УДАЛЕНИЕ
  // ============================================================
  const canEdit = (event) => {
    const role = profile?.role;
    if (['admin', 'movement_coordinator'].includes(role)) return true;
    if (['president', 'vice_president'].includes(role)) return true;
    if (role === 'club_coordinator') {
      return event.club_id === coordinatorClubId;
    }
    return false;
  };

  const canDelete = (event) => {
    const role = profile?.role;
    if (role === 'admin') return true;
    if (role === 'movement_coordinator') return true;
    return false;
  };

  // ============================================================
  // СОЗДАНИЕ/ОБНОВЛЕНИЕ МЕРОПРИЯТИЯ
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      let eventData = {
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
        is_global: form.is_global || false,
        is_club_event: !!form.club_id
      };

      // Для координатора КЮДа — автоматически подставляем его клуб
      if (isClubCoordinator && coordinatorClubId) {
        if (form.type === 'internal' || !form.is_global) {
          eventData.club_id = coordinatorClubId;
          eventData.is_club_event = true;
          eventData.is_global = false;
        } else {
          eventData.club_id = null;
          eventData.is_club_event = false;
          eventData.is_global = true;
        }
      }

      if (isMovementCoordinator) {
        eventData.is_global = true;
        eventData.is_club_event = false;
        eventData.club_id = null;
      }

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

      const successMessage = form.id 
        ? '✅ Мероприятие обновлено!' 
        : eventData.is_global 
          ? '✅ Глобальное мероприятие создано!' 
          : eventData.club_id 
            ? '✅ Внутреннее мероприятие клуба создано!' 
            : '✅ Мероприятие создано!';
      
      setMessage(successMessage);
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

  const handleAssignTutor = async () => {
    if (!selectedTutor) {
      setMessage('❌ Выберите тьютора');
      setMessageType('error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/events/${selectedEventForTutor.id}/tutors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tutor_id: selectedTutor,
          role: tutorRole,
          notes: tutorNotes
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Тьютор назначен на мероприятие!');
      setMessageType('success');
      setShowTutorModal(false);
      setSelectedTutor('');
      setTutorNotes('');
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
        
        {/* ============================================================
           ШАПКА С КНОПКОЙ СОЗДАНИЯ
           ============================================================ */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
              📅 Мероприятия
            </h1>
            <p style={{ color: '#667085', margin: '4px 0 0 0' }}>
              Всего: {filteredEvents.length}
            </p>
          </div>
          
          {canCreate && (
            <button 
              className="btn-gold"
              onClick={() => { 
                setShowForm(!showForm); 
              }}
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать мероприятие'}
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
          <div style={{ 
            fontSize: '14px', 
            color: '#667085', 
            padding: '6px 16px', 
            background: '#F8FAFC', 
            borderRadius: '20px',
            border: '1px solid #E2E7EF',
            whiteSpace: 'nowrap'
          }}>
            Найдено: <strong style={{ color: '#0B1F3A' }}>{filteredEvents.length}</strong>
          </div>
        </FilterBar>

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>{form.id ? '✏️ Редактировать' : '📝 Создать мероприятие'}</h3>
            
            {isClubCoordinator && coordinatorClubId && (
              <div style={{ 
                padding: '10px 16px', 
                background: '#EAF2FA', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '14px',
                color: '#174A7E',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏫 <strong>Мероприятие для вашего клуба:</strong> {clubs.find(c => c.id === coordinatorClubId)?.name || 'КЮД'}
              </div>
            )}

            {isMovementCoordinator && (
              <div style={{ 
                padding: '12px 16px', 
                background: '#EAF2FA', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '14px',
                color: '#174A7E',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🌍 <strong>Глобальное мероприятие</strong> — будет доступно всем участникам движения
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label>Место</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Дата начала *</label>
                  <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Дата окончания</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Время начала</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Время окончания</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              
              <div className="grid-3">
                <div className="form-group">
                  <label>Тип</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="internal">Внутреннее</option>
                    <option value="outgoing">Выездное</option>
                    <option value="global_forum">Глобальный форум</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Лимит мест</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min="1" />
                </div>
              </div>
              
              <div className="form-group">
                <label>Ссылка на форму</label>
                <input type="url" value={form.form_url} onChange={(e) => setForm({ ...form, form_url: e.target.value })} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳' : form.id ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>❌ Отмена</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Все мероприятия</h3>
          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>Мероприятий не найдено</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEvents.map((event) => {
                const userCanEdit = canEdit(event);
                const userCanDelete = canDelete(event);
                const canAssignTutorLocal = ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile?.role);
                
                return (
                  <div
                    key={event.id}
                    className="list-item"
                    style={{
                      borderLeftColor: event.moderation_status === 'pending' ? '#C9A227' :
                                    event.is_global ? '#6B46C1' :
                                    event.is_club_event ? '#174A7E' :
                                    event.type === 'internal' ? '#174A7E' :
                                    event.type === 'outgoing' ? '#C9A227' : '#B3262E'
                    }}
                  >
                    <div className="title">
                      {event.title}
                      {event.is_global && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#EDE7F6', color: '#6B46C1', fontSize: '10px' }}>
                          🌍 Глобальное
                        </span>
                      )}
                      {event.is_club_event && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#EAF2FA', color: '#174A7E', fontSize: '10px' }}>
                          🏫 Внутреннее
                        </span>
                      )}
                      {event.type === 'outgoing' && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#FBF4DC', color: '#8A6A00', fontSize: '10px' }}>
                          🌍 Выездное
                        </span>
                      )}
                      {event.moderation_status === 'pending' && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#FBF4DC', color: '#8A6A00', fontSize: '10px' }}>
                          ⏳ На модерации
                        </span>
                      )}
                      {event.moderation_status === 'rejected' && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#FCEBEC', color: '#B3262E', fontSize: '10px' }}>
                          ❌ Отклонено
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                      {event.location && ` 📍 ${event.location}`}
                      {event.club_name && ` 🏫 ${event.club_name}`}
                    </div>
                    {event.description && <div className="meta">{event.description}</div>}
                    
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {userCanEdit && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleEdit(event)}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                      {userCanDelete && (
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(event.id)}
                        >
                          🗑️ Удалить
                        </button>
                      )}
                      {canModerate && event.moderation_status === 'pending' && (
                        <>
                          <button
                            className="btn-success"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowModerationModal(true);
                            }}
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowModerationModal(true);
                            }}
                          >
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                      {canAssignTutorLocal && (
                        <button
                          className="btn-primary"
                          style={{ padding: '4px 12px', fontSize: '12px', background: '#6B46C1', color: 'white' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventForTutor(event);
                            setSelectedTutor('');
                            setTutorNotes('');
                            setShowTutorModal(true);
                          }}
                        >
                          🧑‍🏫 Назначить тьютора
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО МОДЕРАЦИИ */}
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

      {/* МОДАЛЬНОЕ ОКНО: НАЗНАЧЕНИЕ ТЬЮТОРА */}
      {showTutorModal && selectedEventForTutor && (
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
          onClick={() => setShowTutorModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '100%', padding: '32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🧑‍🏫 Назначить тьютора
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Мероприятие: <strong>{selectedEventForTutor.title}</strong>
            </p>

            <div className="form-group">
              <label>Выберите тьютора *</label>
              <select
                value={selectedTutor}
                onChange={(e) => setSelectedTutor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              >
                <option value="">— Выберите тьютора —</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Роль</label>
              <select
                value={tutorRole}
                onChange={(e) => setTutorRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              >
                <option value="tutor">📚 Тьютор</option>
                <option value="lead_tutor">⭐ Старший тьютор</option>
                <option value="organizer">📋 Организатор</option>
              </select>
            </div>

            <div className="form-group">
              <label>Примечание</label>
              <textarea
                rows="3"
                value={tutorNotes}
                onChange={(e) => setTutorNotes(e.target.value)}
                placeholder="Дополнительная информация..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-success"
                style={{ flex: 1 }}
                onClick={handleAssignTutor}
              >
                ✅ Назначить
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowTutorModal(false);
                  setSelectedTutor('');
                  setTutorNotes('');
                }}
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          box-shadow: 0 2px 16px rgba(201, 162, 39, 0.25);
          min-height: 44px;
          min-width: 80px;
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
        }
        
        .btn-success {
          background: #1A7A4C;
          color: white;
          box-shadow: 0 4px 16px rgba(26,122,76,0.2);
        }
        .btn-success:hover {
          background: #13663E;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(26,122,76,0.3);
        }
        
        .btn-secondary {
          background: transparent;
          color: #0A1628;
          border: 1.5px solid #E4DFD8;
          box-shadow: none;
        }
        .btn-secondary:hover {
          background: #F8F6F2;
          border-color: #C9A227;
          transform: translateY(-2px);
        }
        
        .btn-danger {
          background: #B3262E;
          color: white;
          box-shadow: 0 4px 16px rgba(179,38,46,0.2);
        }
        .btn-danger:hover {
          background: #8A1C22;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(179,38,46,0.3);
        }
        
        .btn-primary {
          background: #6B46C1;
          color: white;
          box-shadow: 0 4px 16px rgba(107,70,193,0.2);
        }
        .btn-primary:hover {
          background: #5A3AAD;
          transform: translateY(-2px);
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          color: #0B1F3A;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #D5DCE7;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
          color: #0B1F3A;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 20px;
        }
        
        .list-item {
          padding: 14px 18px;
          border-left: 3px solid #0B1F3A;
          background: #F8FAFC;
          border-radius: 0 8px 8px 0;
          transition: all 0.2s ease;
        }
        .list-item:hover {
          background: #F0EDE8;
          transform: translateX(4px);
        }
        .list-item .title {
          font-weight: 600;
          color: #0B1F3A;
          font-size: 15px;
        }
        .list-item .subtitle {
          font-size: 13px;
          color: #667085;
          margin-top: 2px;
        }
        .list-item .meta {
          font-size: 12px;
          color: #98A2B3;
          margin-top: 4px;
        }
        
        .tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        
        .message-success {
          padding: 12px 16px;
          background: #E8F5EF;
          color: #16845B;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #16845B;
        }
        .message-error {
          padding: 12px 16px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #B3262E;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }
        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }
        .empty-state p {
          color: #667085;
          font-size: 14px;
        }
        
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }
        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }
        
        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }
          .grid-2, .grid-3 {
            grid-template-columns: 1fr;
          }
          .card {
            padding: 16px;
          }
        }
        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }
          .btn-gold {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}