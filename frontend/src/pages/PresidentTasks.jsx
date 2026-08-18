// frontend/src/pages/PresidentTasks.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function PresidentTasks() {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [clubs, setClubs] = useState([]);
  
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    club_id: '',
    assigned_to: '',
    is_global: false
  });
  const navigate = useNavigate();

  const role = profile?.role;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('⚠️ Нет токена для загрузки заданий');
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/president-tasks', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📥 Статус /president-tasks:', response.status);

        if (response.status === 404) {
          console.warn('⚠️ API /president-tasks не найден (404)');
          setTasks([]);
        } else if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Ошибка загрузки заданий:', response.status, errorText);
          setTasks([]);
        } else {
          const data = await response.json();
          console.log('📥 Загружено заданий:', data?.length || 0);
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        console.error('❌ Ошибка запроса заданий:', fetchError);
        setTasks([]);
      }

      try {
        const clubsData = await api.getClubs();
        setClubs(Array.isArray(clubsData) ? clubsData : []);
      } catch (clubsError) {
        console.error('❌ Ошибка загрузки клубов:', clubsError);
        setClubs([]);
      }

      try {
        const usersData = await api.getUsers();
        const filteredUsers = Array.isArray(usersData) 
          ? usersData.filter(u => u.role === 'participant' && u.club_id)
          : [];
        setAllUsers(filteredUsers);
        console.log('👥 Загружено участников для выбора:', filteredUsers.length);
      } catch (usersError) {
        console.error('❌ Ошибка загрузки пользователей:', usersError);
        setAllUsers([]);
      }

    } catch (err) {
      console.error('❌ Общая ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки данных');
      setMessageType('error');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedUser(null);
    setForm({ ...form, assigned_to: '' });

    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const filtered = allUsers.filter(u =>
      u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.full_name);
    setForm({ ...form, assigned_to: user.id, club_id: user.club_id || '' });
    setShowDropdown(false);
    console.log('✅ Выбран участник:', user.full_name, 'клуб:', user.club_id);
  };

  const canCreate = profile && ['admin', 'movement_coordinator', 'vice_president', 'club_coordinator'].includes(profile.role);
  const isPresident = profile?.role === 'president' || profile?.role === 'vice_president';

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!form.title || form.title.trim() === '') {
        setMessage('❌ Введите заголовок задания');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (!form.assigned_to && !form.is_global) {
        setMessage('❌ Выберите участника для назначения задания');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessage('❌ Нет авторизации');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const requestData = {
        title: form.title.trim(),
        description: form.description || '',
        priority: form.priority,
        deadline: form.deadline || null,
        club_id: form.club_id || null,
        assigned_to: form.assigned_to || null,
        is_global: form.is_global || false
      };

      console.log('📤 Отправка задания:', requestData);

      const response = await fetch('https://dod-backend.relaxdev.ru/api/president-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('📥 Статус создания задания:', response.status);

      if (response.status === 404) {
        setMessage('⚠️ API создания заданий ещё не реализован. Функция временно недоступна.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setMessage('✅ Задание создано!');
      setMessageType('success');
      setShowCreateForm(false);
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка создания задания:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      deadline: '',
      club_id: '',
      assigned_to: '',
      is_global: false
    });
    setSearchQuery('');
    setSelectedUser(null);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/president-tasks/${selectedTask.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response: responseText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setMessage('✅ Ответ отправлен!');
      setMessageType('success');
      setShowResponseModal(false);
      setResponseText('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId, status) => {
    if (!confirm(`Подтвердить изменение статуса на "${status}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/president-tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setMessage(`✅ Статус изменён на "${status}"`);
      setMessageType('success');
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

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showCreateForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              📝 Создать задание
            </h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Заголовок *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Например: Подготовить отчёт о деятельности"
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Подробное описание задания..."
                />
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label>Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">🟢 Низкий</option>
                    <option value="medium">🟡 Средний</option>
                    <option value="high">🔴 Высокий</option>
                    <option value="urgent">🔥 Срочный</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Срок выполнения</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Клуб (если для конкретного)</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Все клубы</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Назначить участнику *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Начните вводить фамилию участника..."
                    required
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div
                      ref={dropdownRef}
                      style={{
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
                      }}
                    >
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F4F6F9',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F6F9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => handleSelectUser(u)}
                        >
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#0B1F3A' }}>
                            {u.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {u.school || 'Школа не указана'} • {u.class_name || 'Класс не указан'}
                            {u.club_name && ` • 🏫 ${u.club_name}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUser && (
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
                    ✅ Выбран: <strong>{selectedUser.full_name}</strong>
                    {selectedUser.club_name && <span style={{ color: '#98A2B3' }}>• 🏫 {selectedUser.club_name}</span>}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#B3262E', cursor: 'pointer', marginLeft: 'auto' }}
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery('');
                        setForm({ ...form, assigned_to: '', club_id: '' });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
                  💡 Начните вводить фамилию участника — система покажет подходящих
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_global}
                    onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                    🌍 Глобальное задание (для всех президентов)
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>
              {isPresident ? 'У вас пока нет заданий' : 'Заданий пока нет'}
            </p>
            {canCreate && <p style={{ color: '#667085' }}>Создайте первое задание для президентов</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tasks.map((task) => {
              const status = getStatusBadge(task.status);
              const isAssignedToMe = task.assigned_to === profile?.id || task.assigned_to === null;
              const canRespond = isPresident && isAssignedToMe && task.status !== 'completed';
              const canManageStatus = ['admin', 'movement_coordinator', 'vice_president'].includes(role) || task.created_by === profile?.id;

              return (
                <div key={task.id} className="card" style={{ borderLeft: `4px solid ${status.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                          {task.title}
                        </h3>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                        <span className="tag" style={{
                          background: task.priority === 'urgent' ? '#FCEBEC' :
                                    task.priority === 'high' ? '#FCEBEC' :
                                    task.priority === 'medium' ? '#FBF4DC' : '#F4F6F9',
                          color: task.priority === 'urgent' ? '#B3262E' :
                                 task.priority === 'high' ? '#B3262E' :
                                 task.priority === 'medium' ? '#8A6A00' : '#667085'
                        }}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        {task.is_global && (
                          <span className="tag" style={{ background: '#EDE7F6', color: '#6B46C1' }}>
                            🌍 Глобальное
                          </span>
                        )}
                        {task.club_name && (
                          <span className="tag tag-blue">🏫 {task.club_name}</span>
                        )}
                      </div>

                      {task.description && (
                        <p style={{ color: '#475467', marginTop: '8px', fontSize: '14px' }}>
                          {task.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        {task.assigned_to_name && (
                          <span>👤 Назначено: {task.assigned_to_name}</span>
                        )}
                        {task.created_by_name && (
                          <span>📝 Создал: {task.created_by_name}</span>
                        )}
                        {task.deadline && (
                          <span>📅 Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
                        )}
                        {task.completed_at && (
                          <span>✅ Завершено: {new Date(task.completed_at).toLocaleDateString('ru-RU')}</span>
                        )}
                        <span>💬 Ответов: {task.response_count || 0}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {canRespond && (
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedTask(task);
                            setShowResponseModal(true);
                          }}
                        >
                          📝 Ответить
                        </button>
                      )}

                      {canManageStatus && task.status !== 'completed' && task.status !== 'rejected' && (
                        <>
                          <button
                            className="btn-success"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                          >
                            🔄 В работу
                          </button>
                          <button
                            className="btn-success"
                            style={{ padding: '6px 12px', fontSize: '12px', background: '#16845B' }}
                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                          >
                            ✅ Завершить
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleUpdateStatus(task.id, 'rejected')}
                          >
                            ❌ Отклонить
                          </button>
                        </>
                      )}

                      {(role === 'admin' || role === 'movement_coordinator' || task.created_by === profile?.id) && (
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            if (confirm('Удалить задание?')) {
                              try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`https://dod-backend.relaxdev.ru/api/president-tasks/${task.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${token}`
                                  }
                                });
                                if (!response.ok) {
                                  const errorData = await response.json().catch(() => ({}));
                                  throw new Error(errorData.error || `Ошибка ${response.status}`);
                                }
                                setMessage('✅ Задание удалено');
                                setMessageType('success');
                                loadData();
                                setTimeout(() => setMessage(''), 3000);
                              } catch (err) {
                                setMessage('❌ Ошибка: ' + err.message);
                                setMessageType('error');
                              }
                            }
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showResponseModal && selectedTask && (
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
          onClick={() => setShowResponseModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', padding: '32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              📝 Ответ на задание
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Задание: <strong>{selectedTask.title}</strong>
            </p>

            <form onSubmit={handleSubmitResponse}>
              <div className="form-group">
                <label>Ваш ответ *</label>
                <textarea
                  rows="5"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  required
                  placeholder="Напишите ваш ответ..."
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D5DCE7', borderRadius: '10px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Отправка...' : '📤 Отправить ответ'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowResponseModal(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}