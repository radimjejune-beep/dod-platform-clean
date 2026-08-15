// frontend/src/pages/TasksPlanner.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function TasksPlanner() {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    category: 'general',
    assigned_to: '',
    recurrence: 'none',
    recurrence_end: ''
  });
  const [users, setUsers] = useState([]);
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

      if (userData.role !== 'movement_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const usersData = await api.getUsers();
      setUsers(usersData || []);

      // TODO: добавить API для задач
      setTasks([]);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!form.title.trim()) {
        setMessage('❌ Заголовок обязателен');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // TODO: добавить API для создания/обновления задачи
      await new Promise(resolve => setTimeout(resolve, 500));

      setMessage(editingTask ? '✅ Задача обновлена!' : '✅ Задача создана!');
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
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
      category: 'general',
      assigned_to: '',
      recurrence: 'none',
      recurrence_end: ''
    });
    setEditingTask(null);
    setShowForm(false);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      due_date: task.due_date || '',
      category: task.category || 'general',
      assigned_to: task.assigned_to || '',
      recurrence: task.recurrence || 'none',
      recurrence_end: task.recurrence_end || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить задачу?')) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setTasks(tasks.filter(t => t.id !== id));
      setMessage('✅ Задача удалена');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      // TODO: добавить API для обновления статуса
      await new Promise(resolve => setTimeout(resolve, 300));
      setTasks(tasks.map(t => 
        t.id === id ? { ...t, status } : t
      ));
      setMessage(`✅ Статус изменён на "${status}"`);
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      'low': { label: '🟢 Низкий', color: '#16845B', bg: '#E8F5EF' },
      'medium': { label: '🟡 Средний', color: '#C9A227', bg: '#FBF4DC' },
      'high': { label: '🔴 Высокий', color: '#B3262E', bg: '#FCEBEC' },
      'urgent': { label: '🔥 Срочный', color: '#B3262E', bg: '#FCEBEC' }
    };
    return badges[priority] || badges['medium'];
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { label: '⏳ Ожидает', color: '#C9A227', bg: '#FBF4DC' },
      'in_progress': { label: '🔄 В работе', color: '#174A7E', bg: '#EAF2FA' },
      'completed': { label: '✅ Выполнено', color: '#16845B', bg: '#E8F5EF' },
      'cancelled': { label: '❌ Отменено', color: '#B3262E', bg: '#FCEBEC' }
    };
    return badges[status] || badges['pending'];
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Не назначен';
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  const categories = [
    'general', 'reports', 'events', 'communications', 'administration'
  ];

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
            <h1>Планировщик задач</h1>
            <p>Управление задачами и дедлайнами</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? '✖ Закрыть' : '➕ Создать задачу'}
          </button>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {editingTask ? '✏️ Редактировать задачу' : '📝 Создать задачу'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Заголовок *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="Название задачи"
                  />
                </div>
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="general">📄 Общие</option>
                    <option value="reports">📋 Отчёты</option>
                    <option value="events">📅 Мероприятия</option>
                    <option value="communications">📨 Коммуникации</option>
                    <option value="administration">⚙️ Администрирование</option>
                  </select>
                </div>
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
                  <label>Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="pending">⏳ Ожидает</option>
                    <option value="in_progress">🔄 В работе</option>
                    <option value="completed">✅ Выполнено</option>
                    <option value="cancelled">❌ Отменено</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Срок выполнения</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Назначить</label>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  >
                    <option value="">Не назначено</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Описание</label>
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Подробное описание задачи..."
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Повторение</label>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        checked={form.recurrence === 'none'}
                        onChange={() => setForm({ ...form, recurrence: 'none', recurrence_end: '' })}
                      />
                      <span>Нет</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        checked={form.recurrence === 'daily'}
                        onChange={() => setForm({ ...form, recurrence: 'daily' })}
                      />
                      <span>Ежедневно</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        checked={form.recurrence === 'weekly'}
                        onChange={() => setForm({ ...form, recurrence: 'weekly' })}
                      />
                      <span>Еженедельно</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        checked={form.recurrence === 'monthly'}
                        onChange={() => setForm({ ...form, recurrence: 'monthly' })}
                      />
                      <span>Ежемесячно</span>
                    </label>
                  </div>
                  {form.recurrence !== 'none' && (
                    <input
                      type="date"
                      value={form.recurrence_end}
                      onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })}
                      style={{ marginTop: '8px' }}
                      placeholder="Дата окончания повторения"
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingTask ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ФИЛЬТРЫ */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <button
            className={filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '12px' }}
            onClick={() => setFilterStatus('all')}
          >
            Все ({tasks.length})
          </button>
          <button
            className={filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '12px' }}
            onClick={() => setFilterStatus('pending')}
          >
            ⏳ Ожидают
          </button>
          <button
            className={filterStatus === 'in_progress' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '12px' }}
            onClick={() => setFilterStatus('in_progress')}
          >
            🔄 В работе
          </button>
          <button
            className={filterStatus === 'completed' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '12px' }}
            onClick={() => setFilterStatus('completed')}
          >
            ✅ Выполнено
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 Задачи
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {filteredTasks.length} задач
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>Задач пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTasks.map((task) => {
                const priority = getPriorityBadge(task.priority);
                const status = getStatusBadge(task.status);
                return (
                  <div
                    key={task.id}
                    className="list-item"
                    style={{
                      borderLeftColor: task.status === 'completed' ? '#16845B' : priority.color,
                      opacity: task.status === 'completed' ? 0.7 : 1
                    }}
                  >
                    <div className="title">
                      {task.title}
                      <span className="tag" style={{ background: priority.bg, color: priority.color, marginLeft: '8px', fontSize: '10px' }}>
                        {priority.label}
                      </span>
                      <span className="tag" style={{ background: status.bg, color: status.color, marginLeft: '4px', fontSize: '10px' }}>
                        {status.label}
                      </span>
                    </div>
                    <div className="subtitle">
                      📅 {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : 'Без срока'}
                      {task.assigned_to && ` • 👤 ${getUserName(task.assigned_to)}`}
                      {task.category && ` • 📂 ${task.category}`}
                    </div>
                    {task.description && <div className="meta">{task.description}</div>}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleEdit(task)}
                      >
                        ✏️ Редактировать
                      </button>
                      {task.status !== 'completed' && (
                        <button
                          className="btn-success"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleStatusChange(task.id, 'completed')}
                        >
                          ✅ Завершить
                        </button>
                      )}
                      {task.status === 'pending' && (
                        <button
                          className="btn-primary"
                          style={{ padding: '4px 12px', fontSize: '12px', background: '#174A7E' }}
                          onClick={() => handleStatusChange(task.id, 'in_progress')}
                        >
                          🔄 Взять в работу
                        </button>
                      )}
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(task.id)}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}