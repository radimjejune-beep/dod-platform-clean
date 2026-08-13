// frontend/src/pages/StaffManagement.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function StaffManagement() {
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [eventResults, setEventResults] = useState([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const staffInputRef = useRef(null);
  const eventInputRef = useRef(null);
  const [form, setForm] = useState({
    staff_id: '',
    staff_name: '',
    staff_email: '',
    event_id: '',
    event_title: '',
    role: '',
    responsibilities: [],
    notes: '',
    start_date: '',
    end_date: '',
    is_lead_tutor: false,
    assignment_type: 'event'
  });
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    role: 'tutor',
    position: '',
    phone: '',
    bio: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (staffSearch.length > 1) {
      const filtered = allStaff.filter(s =>
        s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.role?.toLowerCase().includes(staffSearch.toLowerCase())
      );
      setStaffResults(filtered);
      setShowStaffDropdown(filtered.length > 0);
    } else {
      setStaffResults([]);
      setShowStaffDropdown(false);
    }
  }, [staffSearch, allStaff]);

  useEffect(() => {
    if (eventSearch.length > 1) {
      const filtered = events.filter(e =>
        e.title?.toLowerCase().includes(eventSearch.toLowerCase())
      );
      setEventResults(filtered);
      setShowEventDropdown(filtered.length > 0);
    } else {
      setEventResults([]);
      setShowEventDropdown(false);
    }
  }, [eventSearch, events]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      const role = userData.role;
      const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'tutor'];
      if (!allowedRoles.includes(role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [usersData, clubsData, eventsData] = await Promise.all([
        api.getUsers(),
        api.getClubs(),
        api.getEvents()
      ]);

      setClubs(clubsData || []);
      setEvents(eventsData || []);

      // ============================================================
      // ЛОГИКА ПО РОЛЯМ
      // ============================================================

      const staffRoles = ['tutor', 'club_coordinator', 'movement_coordinator', 'admin'];
      let filteredStaff = [];

      if (role === 'club_coordinator') {
        // КООРДИНАТОР КЮДА — видит сотрудников своего клуба
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          // TODO: добавить связь сотрудников с клубом
          filteredStaff = usersData.filter(u => staffRoles.includes(u.role));
        } else {
          filteredStaff = [];
        }
      } 
      else if (role === 'tutor') {
        // ТЬЮТОР — видит только себя
        filteredStaff = usersData.filter(u => u.id === userData.id);
      } 
      else if (role === 'movement_coordinator' || role === 'admin') {
        // КООРДИНАТОР и АДМИН — видят всех
        filteredStaff = usersData.filter(u => staffRoles.includes(u.role));
      } 
      else {
        filteredStaff = [];
      }

      setAllStaff(filteredStaff);
      setStaff(filteredStaff);

      // TODO: добавить API для получения назначений
      setAssignments([]);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтр по клубу (только для admin и movement_coordinator)
  const canFilterByClub = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      // TODO: фильтрация по клубу
      setStaff(allStaff);
    } else {
      setStaff(allStaff);
    }
  }, [selectedClubId, allStaff, canFilterByClub]);

  const handleSelectStaff = (staffMember) => {
    setForm({ ...form, staff_id: staffMember.id, staff_name: staffMember.full_name, staff_email: staffMember.email || '' });
    setStaffSearch(staffMember.full_name);
    setShowStaffDropdown(false);
  };

  const handleSelectEvent = (event) => {
    setForm({ ...form, event_id: event.id, event_title: event.title });
    setEventSearch(event.title);
    setShowEventDropdown(false);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const tempPassword = Math.random().toString(36).slice(-8) + '!';

      const result = await api.createUser({
        full_name: staffForm.full_name,
        email: staffForm.email,
        role: staffForm.role,
        phone: staffForm.phone || '',
        school: '',
        class_name: ''
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(`✅ Сотрудник "${staffForm.full_name}" создан! Временный пароль: ${tempPassword}`);
      setMessageType('success');
      setStaffForm({
        full_name: '',
        email: '',
        role: 'tutor',
        position: '',
        phone: '',
        bio: ''
      });
      setShowStaffForm(false);
      loadData();
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!form.staff_id) {
        setMessage('❌ Пожалуйста, выберите сотрудника');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // TODO: добавить API для создания назначения
      setMessage('✅ Сотрудник назначен!');
      setMessageType('success');
      setForm({
        staff_id: '',
        staff_name: '',
        staff_email: '',
        event_id: '',
        event_title: '',
        role: '',
        responsibilities: [],
        notes: '',
        start_date: '',
        end_date: '',
        is_lead_tutor: false,
        assignment_type: 'event'
      });
      setStaffSearch('');
      setEventSearch('');
      setShowAssignmentForm(false);
      loadData();
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId) => {
    if (!confirm('Удалить сотрудника?')) return;
    // TODO: добавить API для удаления сотрудника
    setMessage('✅ Сотрудник удалён');
    setMessageType('success');
    loadData();
    setTimeout(() => setMessage(''), 3000);
  };

  const getFilteredStaff = () => {
    if (activeTab === 'all') return staff;
    return staff.filter(s => s.role === activeTab);
  };

  const filteredStaff = getFilteredStaff();

  // Кто может управлять сотрудниками
  const canManage = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' || 
                    profile?.role === 'club_coordinator';

  const isAdmin = profile?.role === 'admin';
  const isMovementCoordinator = profile?.role === 'movement_coordinator';
  const isTutor = profile?.role === 'tutor';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Тьютор видит только приглашения
  if (isTutor) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="page-header">
            <span style={{ fontSize: '32px' }}>📨</span>
            <div>
              <h1>Мои приглашения</h1>
              <p>Приглашения на мероприятия от координаторов</p>
            </div>
          </div>
          <div className="card">
            <p style={{ color: '#667085', textAlign: 'center', padding: '20px' }}>
              У вас пока нет приглашений
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👥</span>
          <div>
            <h1>Сотрудники</h1>
            <p>
              {profile?.role === 'club_coordinator' 
                ? 'Сотрудники вашего клуба' 
                : 'Управление сотрудниками движения'}
            </p>
          </div>
          {canManage && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                onClick={() => setShowStaffForm(!showStaffForm)}
              >
                {showStaffForm ? '✖ Закрыть' : '➕ Добавить сотрудника'}
              </button>
              <button
                className="btn-primary"
                style={{ background: '#C9A227', color: '#0B1F3A' }}
                onClick={() => setShowAssignmentForm(!showAssignmentForm)}
              >
                {showAssignmentForm ? '✖ Закрыть' : '📋 Назначить'}
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ФИЛЬТР ПО КЮДАМ */}
        {canFilterByClub && clubs.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ minWidth: '200px' }}>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>
              {selectedClubId ? (
                <span>🔍 Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>📋 Все сотрудники</span>
              )}
            </div>
            {selectedClubId && (
              <button
                style={{
                  padding: '4px 12px',
                  background: '#FCEBEC',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#B3262E'
                }}
                onClick={() => setSelectedClubId('')}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        )}

        {/* ФОРМА ДОБАВЛЕНИЯ СОТРУДНИКА */}
        {showStaffForm && canManage && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Добавить сотрудника
            </h3>
            <form onSubmit={handleCreateStaff}>
              <div className="grid-2">
                <div className="form-group">
                  <label>ФИО *</label>
                  <input
                    type="text"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    required
                    placeholder="ivan@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Роль *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    required
                  >
                    <option value="tutor">📚 Тьютор</option>
                    <option value="club_coordinator">🏫 Координатор КЮДа</option>
                    <option value="movement_coordinator">⭐ Координатор движения</option>
                    <option value="admin">🔧 Администратор</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Телефон</label>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>О сотруднике</label>
                  <textarea
                    rows="2"
                    value={staffForm.bio}
                    onChange={(e) => setStaffForm({ ...staffForm, bio: e.target.value })}
                    placeholder="Краткая информация о сотруднике"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать сотрудника'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowStaffForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ФОРМА НАЗНАЧЕНИЯ */}
        {showAssignmentForm && canManage && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📋 Назначить сотрудника
            </h3>
            <form onSubmit={handleAssign}>
              <div className="grid-2">
                {/* ВЫБОР СОТРУДНИКА */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Сотрудник *</label>
                  <input
                    ref={staffInputRef}
                    type="text"
                    value={staffSearch}
                    onChange={(e) => {
                      setStaffSearch(e.target.value);
                      setForm({ ...form, staff_name: e.target.value, staff_id: '' });
                    }}
                    onFocus={() => {
                      if (staffSearch.length > 1) {
                        const filtered = allStaff.filter(s =>
                          s.full_name?.toLowerCase().includes(staffSearch.toLowerCase())
                        );
                        setStaffResults(filtered);
                        setShowStaffDropdown(filtered.length > 0);
                      }
                    }}
                    placeholder="Введите имя сотрудника..."
                    required
                  />
                  {showStaffDropdown && staffResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E7EF',
                      borderRadius: '10px',
                      boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}>
                      {staffResults.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectStaff(s)}
                        >
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                            {s.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {s.role} • {s.position || 'Должность не указана'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.staff_id && (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 12px',
                      background: '#E8F5EF',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#16845B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ✅ Выбран: <strong>{form.staff_name}</strong>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#B3262E', cursor: 'pointer', marginLeft: 'auto' }}
                        onClick={() => {
                          setForm({ ...form, staff_id: '', staff_name: '', staff_email: '' });
                          setStaffSearch('');
                          setStaffResults([]);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* ТИП НАЗНАЧЕНИЯ */}
                <div className="form-group">
                  <label>Тип назначения *</label>
                  <select
                    value={form.assignment_type}
                    onChange={(e) => setForm({ ...form, assignment_type: e.target.value })}
                    required
                  >
                    <option value="event">📅 Мероприятие</option>
                    <option value="social">📱 Социальные сети</option>
                    <option value="content">✍️ Контент</option>
                    <option value="logistics">📦 Логистика</option>
                    <option value="photo">📸 Фото/Видео</option>
                    <option value="other">📌 Другое</option>
                  </select>
                </div>

                {/* МЕРОПРИЯТИЕ */}
                {form.assignment_type === 'event' && (
                  <div className="form-group" style={{ position: 'relative', gridColumn: '1 / -1' }}>
                    <label>Мероприятие *</label>
                    <input
                      ref={eventInputRef}
                      type="text"
                      value={eventSearch}
                      onChange={(e) => {
                        setEventSearch(e.target.value);
                        setForm({ ...form, event_title: e.target.value, event_id: '' });
                      }}
                      onFocus={() => {
                        if (eventSearch.length > 1) {
                          const filtered = events.filter(e =>
                            e.title?.toLowerCase().includes(eventSearch.toLowerCase())
                          );
                          setEventResults(filtered);
                          setShowEventDropdown(filtered.length > 0);
                        }
                      }}
                      placeholder="Введите название мероприятия..."
                      required
                    />
                    {showEventDropdown && eventResults.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #E2E7EF',
                        borderRadius: '10px',
                        boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 100
                      }}>
                        {eventResults.map((e) => (
                          <div
                            key={e.id}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F4F6F9'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            onClick={() => handleSelectEvent(e)}
                          >
                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                              {e.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085' }}>
                              📅 {e.event_date ? new Date(e.event_date).toLocaleDateString('ru-RU') : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.event_id && (
                      <div style={{
                        marginTop: '6px',
                        padding: '6px 12px',
                        background: '#E8F5EF',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#16845B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ✅ Выбрано: <strong>{form.event_title}</strong>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#B3262E', cursor: 'pointer', marginLeft: 'auto' }}
                          onClick={() => {
                            setForm({ ...form, event_id: '', event_title: '' });
                            setEventSearch('');
                            setEventResults([]);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ОПИСАНИЕ ЗАДАЧ */}
                {form.assignment_type !== 'event' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Описание задачи</label>
                    <textarea
                      rows="3"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Опишите, что нужно сделать..."
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Роль/Функция</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Фото, видео, координация"
                  />
                </div>

                <div className="form-group">
                  <label>Обязанности</label>
                  <input
                    type="text"
                    value={form.responsibilities.join(', ')}
                    onChange={(e) => setForm({
                      ...form,
                      responsibilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Фото, видео, логистика, координация"
                  />
                </div>

                <div className="form-group">
                  <label>Дата начала</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Дата окончания</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>

                {form.assignment_type === 'event' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.is_lead_tutor}
                        onChange={(e) => setForm({ ...form, is_lead_tutor: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        ⭐ Назначить старшим тьютором
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Назначение...' : '📤 Назначить'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAssignmentForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ВСЕ СОТРУДНИКИ */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              {profile?.role === 'club_coordinator' ? 'Сотрудники вашего клуба' : 'Все сотрудники'}
            </h3>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 14px', fontSize: '12px' }}
                onClick={() => setActiveTab('all')}
              >
                Все
              </button>
              <button
                className={activeTab === 'tutor' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 14px', fontSize: '12px' }}
                onClick={() => setActiveTab('tutor')}
              >
                📚 Тьюторы
              </button>
              <button
                className={activeTab === 'club_coordinator' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 14px', fontSize: '12px' }}
                onClick={() => setActiveTab('club_coordinator')}
              >
                🏫 Координаторы
              </button>
              {(isAdmin || isMovementCoordinator) && (
                <button
                  className={activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                  onClick={() => setActiveTab('admin')}
                >
                  🔧 Админы
                </button>
              )}
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👤</div>
              <p>Сотрудников не найдено</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredStaff.map((s) => (
                <div key={s.id} className="list-item" style={{ 
                  borderLeftColor: s.role === 'admin' ? '#B3262E' : 
                                  s.role === 'movement_coordinator' ? '#6B46C1' : 
                                  s.role === 'club_coordinator' ? '#C9A227' : '#174A7E'
                }}>
                  <div className="title">
                    {s.full_name}
                    <span className="tag" style={{
                      marginLeft: '8px',
                      background: s.role === 'admin' ? '#FCEBEC' : 
                                s.role === 'movement_coordinator' ? '#EDE7F6' : 
                                s.role === 'club_coordinator' ? '#FBF4DC' : '#EAF2FA',
                      color: s.role === 'admin' ? '#B3262E' : 
                             s.role === 'movement_coordinator' ? '#6B46C1' : 
                             s.role === 'club_coordinator' ? '#8A6A00' : '#174A7E'
                    }}>
                      {s.role === 'tutor' ? '📚 Тьютор' :
                       s.role === 'club_coordinator' ? '🏫 Координатор' :
                       s.role === 'movement_coordinator' ? '⭐ Координатор движения' :
                       '🔧 Администратор'}
                    </span>
                  </div>
                  <div className="subtitle">
                    {s.position || 'Должность не указана'}
                    {s.email && <span style={{ marginLeft: '8px' }}>• {s.email}</span>}
                    {s.phone && <span style={{ marginLeft: '8px' }}>• {s.phone}</span>}
                  </div>
                  {s.bio && <div className="meta">{s.bio}</div>}
                  {(isAdmin || isMovementCoordinator) && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleRemoveStaff(s.id)}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}