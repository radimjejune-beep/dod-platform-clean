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
  
  // ===== МОДАЛКА УЧАСТНИКОВ =====
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [registrationsStats, setRegistrationsStats] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  
  // ===== РЕГИСТРАЦИЯ НА МЕРОПРИЯТИЕ =====
  const [registering, setRegistering] = useState(false);
  
  // ===== НАЗНАЧЕНИЕ ТЬЮТОРА =====
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [selectedEventForTutor, setSelectedEventForTutor] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [tutors, setTutors] = useState([]);
  const [tutorRole, setTutorRole] = useState('tutor');
  const [tutorNotes, setTutorNotes] = useState('');
  
  // ===== ЭКСПОРТ =====
  const [exporting, setExporting] = useState(false);
  
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // ===== ФОРМА =====
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
    is_global: false,
    registration_deadline: '',
    max_participants: 0,
    target_clubs: []
  });
  
  const navigate = useNavigate();

  const isClubCoordinator = profile?.role === 'club_coordinator';
  const isMovementCoordinator = profile?.role === 'movement_coordinator';
  const isAdmin = profile?.role === 'admin';
  const canCreate = profile && ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'].includes(profile.role);
  const canModerate = ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile?.role);
  const canAssignTutor = ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile?.role);
  const canViewRegistrations = (event) => {
    const role = profile?.role;
    if (['admin', 'movement_coordinator'].includes(role)) return true;
    if (role === 'club_coordinator') {
      return event.club_id === coordinatorClubId;
    }
    return false;
  };

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
  // ЗАГРУЗКА РЕГИСТРАЦИЙ НА МЕРОПРИЯТИЕ
  // ============================================================
  const loadRegistrations = async (eventId) => {
    try {
      setLoadingRegistrations(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/events/${eventId}/registrations`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setRegistrations(data.registrations || []);
      setRegistrationsStats(data.stats || []);
    } catch (err) {
      console.error('Ошибка загрузки регистраций:', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // ============================================================
  // ЗАПИСЬ НА МЕРОПРИЯТИЕ
  // ============================================================
  const handleRegister = async (eventId) => {
    setRegistering(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        'https://dod-backend.relaxdev.ru/api/event-registrations',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ event_id: eventId })
        }
      );
      const data = await response.json();
      if (data.error) {
        setMessage('❌ ' + data.error);
        setMessageType('error');
      } else {
        setMessage(data.message || '✅ Вы успешно записались на мероприятие!');
        setMessageType('success');
        await loadData();
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setRegistering(false);
    }
  };

  // ============================================================
  // ОТПИСКА ОТ МЕРОПРИЯТИЯ
  // ============================================================
  const handleUnregister = async (registrationId) => {
    if (!confirm('Отписаться от мероприятия?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/event-registrations/${registrationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.error) {
        setMessage('❌ ' + data.error);
        setMessageType('error');
      } else {
        setMessage('✅ Вы отписались от мероприятия');
        setMessageType('success');
        await loadData();
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  // ============================================================
  // ИЗМЕНЕНИЕ СТАТУСА ЗАЯВКИ (ДЛЯ КООРДИНАТОРА)
  // ============================================================
  const handleRegistrationStatus = async (registrationId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/event-registrations/${registrationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      );
      const data = await response.json();
      if (data.error) {
        setMessage('❌ ' + data.error);
        setMessageType('error');
      } else {
        setMessage(`✅ Заявка ${status === 'confirmed' ? 'подтверждена' : 'отклонена'}`);
        setMessageType('success');
        await loadRegistrations(selectedEventForRegistrations?.id);
        await loadData();
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  // ============================================================
  // ОДОБРЕНИЕ ЗАЯВКИ КЛУБА (ДЛЯ КООРДИНАТОРА ДВИЖЕНИЯ)
  // ============================================================
  const handleApproveClub = async (registrationId, status) => {
    if (!confirm(`Подтвердить ${status === 'approved' ? 'одобрение' : 'отклонение'} заявки клуба?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/event-registrations/${registrationId}/approve-club`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessage(status === 'approved' ? '✅ Заявка клуба одобрена!' : '❌ Заявка клуба отклонена');
      setMessageType(status === 'approved' ? 'success' : 'error');
      await loadRegistrations(selectedEventForRegistrations?.id);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  // ============================================================
  // ЭКСПОРТ В EXCEL
  // ============================================================
  const handleExport = async (eventId, eventTitle) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://dod-backend.relaxdev.ru/api/events/${eventId}/export`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка экспорта');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ucastniki_${eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage('✅ Список участников выгружен!');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setExporting(false);
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
  // ПРОВЕРКА ПРАВ
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
        is_club_event: !!form.club_id,
        registration_deadline: form.registration_deadline || null,
        max_participants: parseInt(form.max_participants) || 0,
        target_clubs: form.target_clubs || []
      };

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
      is_global: false,
      registration_deadline: '',
      max_participants: 0,
      target_clubs: []
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
      is_global: event.is_global || false,
      registration_deadline: event.registration_deadline || '',
      max_participants: event.max_participants || 0,
      target_clubs: event.target_clubs || []
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

              <div className="grid-2">
                <div className="form-group">
                  <label>Дедлайн регистрации</label>
                  <input 
                    type="datetime-local" 
                    value={form.registration_deadline} 
                    onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} 
                  />
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    После этой даты запись будет закрыта
                  </div>
                </div>
                <div className="form-group">
                  <label>Максимум участников</label>
                  <input 
                    type="number" 
                    value={form.max_participants} 
                    onChange={(e) => setForm({ ...form, max_participants: e.target.value })} 
                    min="0"
                    placeholder="0 = без ограничений"
                  />
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    0 = без ограничений
                  </div>
                </div>
              </div>

              {/* ============================================================
                 ВЫБОР КЛУБОВ (ДЛЯ АДМИНА И КООРДИНАТОРА ДВИЖЕНИЯ)
                 ============================================================ */}
              {(isAdmin || isMovementCoordinator) && (
                <div className="form-group">
                  <label>🎯 Отправить мероприятие клубам</label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_global || false}
                      onChange={(e) => {
                        setForm({ 
                          ...form, 
                          is_global: e.target.checked,
                          target_clubs: e.target.checked ? [] : form.target_clubs
                        });
                      }}
                    />
                    <span style={{ fontWeight: '600', color: '#6B46C1' }}>🌍 ВСЕ КЛУБЫ (глобальное мероприятие)</span>
                  </label>
                  
                  {!form.is_global && (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '8px',
                      padding: '12px',
                      border: '1px solid #E2E7EF',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {clubs.map((club) => (
                        <label key={club.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          cursor: 'pointer',
                          padding: '4px 12px',
                          background: form.target_clubs?.includes(club.id) ? '#EAF2FA' : 'transparent',
                          borderRadius: '6px',
                          border: form.target_clubs?.includes(club.id) ? '1px solid #174A7E' : '1px solid transparent'
                        }}>
                          <input
                            type="checkbox"
                            checked={form.target_clubs?.includes(club.id) || false}
                            onChange={(e) => {
                              const targetClubs = form.target_clubs || [];
                              if (e.target.checked) {
                                setForm({ ...form, target_clubs: [...targetClubs, club.id] });
                              } else {
                                setForm({ ...form, target_clubs: targetClubs.filter(id => id !== club.id) });
                              }
                            }}
                          />
                          <span style={{ fontSize: '13px' }}>🏫 {club.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {form.target_clubs?.length > 0 && !form.is_global && (
                    <div style={{ fontSize: '12px', color: '#16845B', marginTop: '4px' }}>
                      ✅ Выбрано клубов: {form.target_clubs.length}
                    </div>
                  )}
                  {form.is_global && (
                    <div style={{ fontSize: '12px', color: '#6B46C1', marginTop: '4px' }}>
                      🌍 Мероприятие увидят ВСЕ КЮДы
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                    💡 Если выбрано "Все клубы" — мероприятие увидят все координаторы КЮДов
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label>Ссылка на форму / мероприятие</label>
                <input 
                  type="url" 
                  value={form.form_url} 
                  onChange={(e) => setForm({ ...form, form_url: e.target.value })} 
                  placeholder="https://example.com/event-form"
                />
                <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                  📎 Ссылка, которую увидят участники (Google Form, сайт и т.д.)
                </div>
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
                const canViewRegs = canViewRegistrations(event);
                const isParticipant = profile?.role === 'participant';
                const isClubCoord = profile?.role === 'club_coordinator';
                
                const userRegistration = event.user_registration || null;
                const isRegistered = userRegistration?.status === 'pending' || userRegistration?.status === 'confirmed';
                const isPending = userRegistration?.status === 'pending';
                const isConfirmed = userRegistration?.status === 'confirmed';
                const isRejected = userRegistration?.status === 'rejected';
                
                const isDeadlinePassed = event.registration_deadline 
                  ? new Date() > new Date(event.registration_deadline) 
                  : false;
                
                const isFull = event.max_participants > 0 && (event.registrations_count || 0) >= event.max_participants;
                const isOutgoingOrGlobal = event.type === 'outgoing' || event.type === 'global_forum' || event.is_global === true;
                
                let canRegister = false;
                if (isParticipant && !isOutgoingOrGlobal) {
                  canRegister = true;
                } else if (isClubCoord && isOutgoingOrGlobal) {
                  canRegister = true;
                }
                
                const clubRegistration = event.club_registration || null;
                
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
                      {isFull && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#FCEBEC', color: '#B3262E', fontSize: '10px' }}>
                          ⚠️ Мест нет
                        </span>
                      )}
                      {isDeadlinePassed && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#F4F6F9', color: '#667085', fontSize: '10px' }}>
                          ⛔ Регистрация закрыта
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      📅 {event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                      {event.location && ` 📍 ${event.location}`}
                      {event.club_name && ` 🏫 ${event.club_name}`}
                      {event.max_participants > 0 && ` 👥 ${event.registrations_count || 0}/${event.max_participants}`}
                      {event.registration_deadline && (
                        ` ⏰ Дедлайн: ${new Date(event.registration_deadline).toLocaleDateString('ru-RU')}`
                      )}
                    </div>
                    {event.description && <div className="meta">{event.description}</div>}
                    
                    {/* ССЫЛКА НА ФОРМУ */}
                    {event.form_url && (
                      <div style={{ marginTop: '6px' }}>
                        <a 
                          href={event.form_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#174A7E', 
                            textDecoration: 'underline',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#C9A227'}
                          onMouseLeave={(e) => e.target.style.color = '#174A7E'}
                        >
                          📎 Ссылка на мероприятие
                        </a>
                      </div>
                    )}
                    
                    {/* БЛОК РЕГИСТРАЦИИ */}
                    {canRegister && event.moderation_status === 'approved' && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {isParticipant && !isOutgoingOrGlobal && (
                          <>
                            {isRejected && (
                              <span style={{ color: '#B3262E', fontSize: '13px', fontWeight: '500' }}>
                                ❌ Ваша заявка отклонена
                              </span>
                            )}
                            {isPending && (
                              <span style={{ color: '#C9A227', fontSize: '13px', fontWeight: '500' }}>
                                ⏳ Заявка на рассмотрении
                              </span>
                            )}
                            {isConfirmed && (
                              <span style={{ color: '#16845B', fontSize: '13px', fontWeight: '500' }}>
                                ✅ Вы записаны
                              </span>
                            )}
                            {!isRegistered && !isDeadlinePassed && !isFull && (
                              <button
                                className="btn-success btn-sm"
                                onClick={() => handleRegister(event.id)}
                                disabled={registering}
                              >
                                {registering ? '⏳' : '📝 Записаться'}
                              </button>
                            )}
                            {isPending && (
                              <button
                                className="btn-danger btn-sm"
                                onClick={() => handleUnregister(userRegistration.id)}
                              >
                                ❌ Отменить заявку
                              </button>
                            )}
                            {isConfirmed && (
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => handleUnregister(userRegistration.id)}
                              >
                                ❌ Отписаться
                              </button>
                            )}
                            {isDeadlinePassed && !isRegistered && (
                              <span style={{ color: '#98A2B3', fontSize: '13px' }}>
                                ⛔ Регистрация закрыта
                              </span>
                            )}
                            {isFull && !isRegistered && (
                              <span style={{ color: '#B3262E', fontSize: '13px' }}>
                                ⚠️ Все места заняты
                              </span>
                            )}
                          </>
                        )}
                        
                        {isClubCoord && isOutgoingOrGlobal && (
                          <>
                            {clubRegistration?.status === 'pending' && (
                              <span style={{ color: '#C9A227', fontSize: '13px', fontWeight: '500' }}>
                                ⏳ Заявка клуба на рассмотрении
                              </span>
                            )}
                            {clubRegistration?.status === 'confirmed' && (
                              <span style={{ color: '#16845B', fontSize: '13px', fontWeight: '500' }}>
                                ✅ Заявка клуба одобрена
                              </span>
                            )}
                            {clubRegistration?.status === 'rejected' && (
                              <span style={{ color: '#B3262E', fontSize: '13px', fontWeight: '500' }}>
                                ❌ Заявка клуба отклонена
                              </span>
                            )}
                            {!clubRegistration && !isDeadlinePassed && !isFull && (
                              <button
                                className="btn-gold btn-sm"
                                onClick={() => handleRegister(event.id)}
                                disabled={registering}
                              >
                                {registering ? '⏳' : '📝 Подать заявку от клуба'}
                              </button>
                            )}
                            {clubRegistration?.status === 'pending' && (
                              <button
                                className="btn-danger btn-sm"
                                onClick={() => handleUnregister(clubRegistration.id)}
                              >
                                ❌ Отменить заявку
                              </button>
                            )}
                            {isDeadlinePassed && !clubRegistration && (
                              <span style={{ color: '#98A2B3', fontSize: '13px' }}>
                                ⛔ Регистрация закрыта
                              </span>
                            )}
                            {isFull && !clubRegistration && (
                              <span style={{ color: '#B3262E', fontSize: '13px' }}>
                                ⚠️ Все места заняты
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {userCanEdit && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleEdit(event)}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                      {userCanDelete && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(event.id)}
                        >
                          🗑️ Удалить
                        </button>
                      )}
                      {canModerate && event.moderation_status === 'pending' && (
                        <>
                          <button
                            className="btn-success btn-sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowModerationModal(true);
                            }}
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowModerationModal(true);
                            }}
                          >
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                      {canViewRegs && event.moderation_status === 'approved' && (
                        <>
                          <button
                            className="btn-primary btn-sm"
                            style={{ background: '#6B46C1', color: 'white' }}
                            onClick={async () => {
                              setSelectedEventForRegistrations(event);
                              await loadRegistrations(event.id);
                              setShowRegistrationsModal(true);
                            }}
                          >
                            👥 Участники ({event.registrations_count || 0})
                          </button>
                          <button
                            className="btn-primary btn-sm"
                            style={{ background: '#16845B', color: 'white' }}
                            onClick={() => handleExport(event.id, event.title)}
                            disabled={exporting}
                          >
                            {exporting ? '⏳' : '📊 Excel'}
                          </button>
                        </>
                      )}
                      {canAssignTutorLocal && (
                        <button
                          className="btn-primary btn-sm"
                          style={{ background: '#6B46C1', color: 'white' }}
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

      {/* ============================================================
         МОДАЛЬНОЕ ОКНО: СПИСОК УЧАСТНИКОВ
         ============================================================ */}
      {showRegistrationsModal && selectedEventForRegistrations && (
        <div className="modal-overlay" onClick={() => setShowRegistrationsModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">👥 Участники мероприятия</h3>
              <button className="modal-close" onClick={() => setShowRegistrationsModal(false)}>✕</button>
            </div>

            <p style={{ color: '#667085', marginBottom: '12px' }}>
              <strong>{selectedEventForRegistrations.title}</strong>
              {selectedEventForRegistrations.max_participants > 0 && (
                <span style={{ marginLeft: '12px' }}>
                  👥 {selectedEventForRegistrations.registrations_count || 0}/{selectedEventForRegistrations.max_participants}
                </span>
              )}
            </p>

            {loadingRegistrations ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : registrations.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👀</div>
                <p>Пока нет зарегистрированных участников</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {registrationsStats.map((stat) => (
                    <span key={stat.status} className="tag" style={{
                      background: stat.status === 'confirmed' ? '#E8F5EF' :
                                stat.status === 'pending' ? '#FBF4DC' :
                                stat.status === 'rejected' ? '#FCEBEC' : '#F4F6F9',
                      color: stat.status === 'confirmed' ? '#16845B' :
                             stat.status === 'pending' ? '#8A6A00' :
                             stat.status === 'rejected' ? '#B3262E' : '#667085',
                      padding: '4px 14px',
                      fontSize: '13px'
                    }}>
                      {stat.status === 'confirmed' ? '✅ Подтверждено' :
                       stat.status === 'pending' ? '⏳ Ожидает' :
                       stat.status === 'rejected' ? '❌ Отклонено' : stat.status}: {stat.count}
                    </span>
                  ))}
                </div>

                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-primary btn-sm"
                    style={{ background: '#16845B', color: 'white' }}
                    onClick={() => handleExport(selectedEventForRegistrations.id, selectedEventForRegistrations.title)}
                    disabled={exporting}
                  >
                    {exporting ? '⏳' : '📊 Выгрузить в Excel'}
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Участник</th>
                        <th>Контакт</th>
                        <th>Клуб</th>
                        <th>Статус</th>
                        <th>Дата заявки</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg) => {
                        const isClubRegistration = reg.registration_type === 'club';
                        return (
                          <tr key={reg.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: isClubRegistration ? 'linear-gradient(135deg, #C9A227, #E8D9A8)' : 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isClubRegistration ? '#0B1F3A' : 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {isClubRegistration ? '🏫' : (reg.full_name?.charAt(0) || '?')}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                    {reg.full_name}
                                    {isClubRegistration && (
                                      <span className="tag" style={{ marginLeft: '8px', background: '#FBF4DC', color: '#8A6A00', fontSize: '9px' }}>
                                        🏫 Заявка от клуба
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#98A2B3' }}>
                                    {reg.school || 'Школа не указана'} • {reg.class_name || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px', color: '#667085' }}>
                                {reg.email}
                                {reg.phone && <div style={{ fontSize: '12px', color: '#98A2B3' }}>📞 {reg.phone}</div>}
                              </div>
                            </td>
                            <td>
                              <span className="tag" style={{ background: '#EAF2FA', color: '#174A7E', fontSize: '11px' }}>
                                {reg.club_name || '—'}
                              </span>
                            </td>
                            <td>
                              <span className="tag" style={{
                                background: reg.status === 'confirmed' ? '#E8F5EF' :
                                          reg.status === 'pending' ? '#FBF4DC' :
                                          reg.status === 'rejected' ? '#FCEBEC' : '#F4F6F9',
                                color: reg.status === 'confirmed' ? '#16845B' :
                                       reg.status === 'pending' ? '#8A6A00' :
                                       reg.status === 'rejected' ? '#B3262E' : '#667085',
                                padding: '4px 12px',
                                fontSize: '12px'
                              }}>
                                {reg.status === 'confirmed' ? '✅ Подтверждён' :
                                 reg.status === 'pending' ? '⏳ Ожидает' :
                                 reg.status === 'rejected' ? '❌ Отклонён' : reg.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '13px', color: '#98A2B3' }}>
                              {new Date(reg.registered_at).toLocaleDateString('ru-RU')}
                              {reg.confirmed_at && (
                                <div style={{ fontSize: '11px', color: '#16845B' }}>
                                  ✅ {new Date(reg.confirmed_at).toLocaleDateString('ru-RU')}
                                </div>
                              )}
                            </td>
                            <td>
                              {reg.status === 'pending' && !isClubRegistration && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    className="btn-success btn-sm"
                                    onClick={() => handleRegistrationStatus(reg.id, 'confirmed')}
                                    style={{ padding: '2px 10px', fontSize: '11px' }}
                                  >
                                    ✅
                                  </button>
                                  <button
                                    className="btn-danger btn-sm"
                                    onClick={() => handleRegistrationStatus(reg.id, 'rejected')}
                                    style={{ padding: '2px 10px', fontSize: '11px' }}
                                  >
                                    ❌
                                  </button>
                                </div>
                              )}
                              {reg.status === 'pending' && isClubRegistration && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    className="btn-success btn-sm"
                                    onClick={() => handleApproveClub(reg.id, 'approved')}
                                    style={{ padding: '2px 10px', fontSize: '11px' }}
                                  >
                                    ✅ Одобрить клуб
                                  </button>
                                  <button
                                    className="btn-danger btn-sm"
                                    onClick={() => handleApproveClub(reg.id, 'rejected')}
                                    style={{ padding: '2px 10px', fontSize: '11px' }}
                                  >
                                    ❌ Отклонить
                                  </button>
                                </div>
                              )}
                              {reg.status === 'confirmed' && (
                                <span style={{ color: '#16845B', fontSize: '12px' }}>✅ Подтверждён</span>
                              )}
                              {reg.status === 'rejected' && (
                                <span style={{ color: '#B3262E', fontSize: '12px' }}>❌ Отклонён</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setShowRegistrationsModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
         МОДАЛЬНОЕ ОКНО МОДЕРАЦИИ
         ============================================================ */}
      {showModerationModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowModerationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Модерация</h3>
              <button className="modal-close" onClick={() => setShowModerationModal(false)}>✕</button>
            </div>

            <p><strong>{selectedEvent.title}</strong><br />🏫 {selectedEvent.club_name || 'Без клуба'}</p>

            <div className="form-group">
              <label>Комментарий</label>
              <textarea
                rows="3"
                className="form-control"
                value={moderationComment}
                onChange={(e) => setModerationComment(e.target.value)}
                placeholder="Причина..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-success" style={{ flex: 1 }} onClick={() => handleModerate(selectedEvent.id, 'approved')}>
                ✅ Одобрить
              </button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={() => handleModerate(selectedEvent.id, 'rejected')}>
                ❌ Отклонить
              </button>
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setShowModerationModal(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
         МОДАЛЬНОЕ ОКНО: НАЗНАЧЕНИЕ ТЬЮТОРА
         ============================================================ */}
      {showTutorModal && selectedEventForTutor && (
        <div className="modal-overlay" onClick={() => setShowTutorModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🧑‍🏫 Назначить тьютора</h3>
              <button className="modal-close" onClick={() => setShowTutorModal(false)}>✕</button>
            </div>

            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Мероприятие: <strong>{selectedEventForTutor.title}</strong>
            </p>

            <div className="form-group">
              <label>Выберите тьютора *</label>
              <select
                className="form-control"
                value={selectedTutor}
                onChange={(e) => setSelectedTutor(e.target.value)}
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
                className="form-control"
                value={tutorRole}
                onChange={(e) => setTutorRole(e.target.value)}
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
                className="form-control"
                value={tutorNotes}
                onChange={(e) => setTutorNotes(e.target.value)}
                placeholder="Дополнительная информация..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-success" style={{ flex: 1 }} onClick={handleAssignTutor}>
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
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

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
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
          min-height: 44px;
          min-width: 80px;
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
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

        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(10, 22, 40, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 560px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(10,22,40,0.2);
          border: 1px solid #E4DFD8;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-large {
          max-width: 800px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #A8A29A;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 4px 8px;
        }
        .modal-close:hover { color: #0A1628; }

        .form-control {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E4DFD8;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #0A1628;
          background: white;
          transition: all 0.3s ease;
          outline: none;
          min-height: 44px;
        }
        .form-control:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

        .table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 600px;
        }

        .table thead {
          background: #F8F6F2;
          border-bottom: 1px solid #E4DFD8;
        }

        .table thead th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #8A8480;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .table tbody td {
          padding: 12px 16px;
          border-bottom: 1px solid #F0EDE8;
          color: #4D4744;
        }

        .table tbody tr:hover td {
          background: #F8F6F2;
        }

        .table tbody tr:last-child td {
          border-bottom: none;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #E4DFD8;
          border-top-color: #C9A227;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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
          .modal {
            padding: 20px;
          }
          .modal-large {
            max-width: 100%;
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
          .table {
            min-width: 480px;
            font-size: 12px;
          }
          .table thead th,
          .table tbody td {
            padding: 8px 12px;
          }
          .list-item {
            padding: 12px 14px;
          }
          .list-item .title {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}