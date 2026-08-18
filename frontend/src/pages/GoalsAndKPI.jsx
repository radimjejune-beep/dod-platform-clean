// frontend/src/pages/GoalsAndKPI.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function GoalsAndKPI() {
  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [clubs, setClubs] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'general',
    target_value: 0,
    current_value: 0,
    unit: 'participants',
    status: 'active',
    start_date: '',
    end_date: '',
    assigned_to: '',
    club_id: ''
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

      if (!['admin', 'movement_coordinator'].includes(userData.role)) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [goalsData, clubsData, usersData] = await Promise.all([
        api.getGoals(),
        api.getClubs(),
        api.getUsers()
      ]);

      setGoals(goalsData || []);
      setClubs(clubsData || []);
      setUsers(usersData || []);

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки данных');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!form.title.trim() || !form.target_value) {
        setMessage('❌ Заголовок и целевое значение обязательны');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const data = {
        title: form.title.trim(),
        description: form.description || '',
        category: form.category || 'general',
        target_value: parseInt(form.target_value),
        current_value: parseInt(form.current_value) || 0,
        unit: form.unit || 'participants',
        status: form.status || 'active',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        assigned_to: form.assigned_to || null,
        club_id: form.club_id || null
      };

      let result;
      if (editingGoal) {
        result = await api.updateGoal(editingGoal.id, data);
      } else {
        result = await api.createGoal(data);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage(editingGoal ? '✅ Цель обновлена!' : '✅ Цель создана!');
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
      category: 'general',
      target_value: 0,
      current_value: 0,
      unit: 'participants',
      status: 'active',
      start_date: '',
      end_date: '',
      assigned_to: '',
      club_id: ''
    });
    setEditingGoal(null);
    setShowForm(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      category: goal.category || 'general',
      target_value: goal.target_value || 0,
      current_value: goal.current_value || 0,
      unit: goal.unit || 'participants',
      status: goal.status || 'active',
      start_date: goal.start_date || '',
      end_date: goal.end_date || '',
      assigned_to: goal.assigned_to || '',
      club_id: goal.club_id || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить цель?')) return;

    try {
      await api.deleteGoal(id);
      setMessage('✅ Цель удалена');
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
      'active': { label: '🟢 Активна', color: '#16845B', bg: '#E8F5EF' },
      'completed': { label: '✅ Выполнена', color: '#174A7E', bg: '#EAF2FA' },
      'archived': { label: '📦 Архивирована', color: '#667085', bg: '#F4F6F9' }
    };
    return badges[status] || badges['active'];
  };

  const getUnitLabel = (unit) => {
    const labels = {
      'participants': '👥 Участников',
      'events': '📅 Мероприятий',
      'clubs': '🏫 Клубов',
      'achievements': '🏆 Достижений',
      'percent': '📊 %'
    };
    return labels[unit] || unit;
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Не назначен';
  };

  const getClubName = (clubId) => {
    const club = clubs.find(c => c.id === clubId);
    return club?.name || 'Все клубы';
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
          <span style={{ fontSize: '32px' }}>🎯</span>
          <div>
            <h1>Цели и KPI</h1>
            <p>Управление целями движения</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? '✖ Закрыть' : '➕ Создать цель'}
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
              {editingGoal ? '✏️ Редактировать цель' : '📝 Создать цель'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="Увеличить количество участников до 500"
                  />
                </div>
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="general">📄 Общие</option>
                    <option value="participants">👥 Участники</option>
                    <option value="events">📅 Мероприятия</option>
                    <option value="clubs">🏫 Клубы</option>
                    <option value="achievements">🏆 Достижения</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Целевое значение *</label>
                  <input
                    type="number"
                    value={form.target_value}
                    onChange={(e) => setForm({ ...form, target_value: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Текущее значение</label>
                  <input
                    type="number"
                    value={form.current_value}
                    onChange={(e) => setForm({ ...form, current_value: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Единица измерения</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="participants">👥 Участников</option>
                    <option value="events">📅 Мероприятий</option>
                    <option value="clubs">🏫 Клубов</option>
                    <option value="achievements">🏆 Достижений</option>
                    <option value="percent">📊 %</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">🟢 Активна</option>
                    <option value="completed">✅ Выполнена</option>
                    <option value="archived">📦 Архивирована</option>
                  </select>
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
                <div className="form-group">
                  <label>Назначить ответственного</label>
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
                <div className="form-group">
                  <label>Клуб</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Все клубы</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Описание</label>
                  <textarea
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Подробное описание цели..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingGoal ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 Все цели
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {goals.length} целей
            </span>
          </div>

          {goals.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🎯</div>
              <p>Целей пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goals.map((goal) => {
                const status = getStatusBadge(goal.status);
                const progress = goal.target_value > 0 
                  ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100)
                  : 0;
                
                return (
                  <div
                    key={goal.id}
                    className="list-item"
                    style={{
                      borderLeftColor: status.color,
                      opacity: goal.status === 'archived' ? 0.6 : 1
                    }}
                  >
                    <div className="title">
                      {goal.title}
                      <span className="tag" style={{ background: status.bg, color: status.color, marginLeft: '8px', fontSize: '10px' }}>
                        {status.label}
                      </span>
                    </div>
                    <div className="subtitle">
                      🎯 {getUnitLabel(goal.unit)}: {goal.current_value} / {goal.target_value}
                      {goal.assigned_to && ` • 👤 ${getUserName(goal.assigned_to)}`}
                      {goal.club_id && ` • 🏫 ${getClubName(goal.club_id)}`}
                      {goal.start_date && ` • 📅 с ${new Date(goal.start_date).toLocaleDateString('ru-RU')}`}
                      {goal.end_date && ` до ${new Date(goal.end_date).toLocaleDateString('ru-RU')}`}
                    </div>
                    {goal.description && <div className="meta">{goal.description}</div>}
                    
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#98A2B3' }}>
                        <span>Прогресс</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#F4F6F9',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '2px'
                      }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progress >= 100 ? '#16845B' : '#C9A227',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleEdit(goal)}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(goal.id)}
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