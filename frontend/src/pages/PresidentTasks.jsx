// frontend/src/pages/PresidentTasks.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function PresidentTasks() {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: ''
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

      // TODO: добавить API для получения заданий президента
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
      // TODO: добавить API для создания задания
      setMessage('✅ Задание создано!');
      setMessageType('success');
      setForm({ title: '', description: '', deadline: '' });
      setShowTaskForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': { text: 'Ожидает', color: '#8A6A00', bg: '#FBF4DC' },
      'in_progress': { text: 'В работе', color: '#174A7E', bg: '#EAF2FA' },
      'completed': { text: 'Выполнено', color: '#16845B', bg: '#E8F5EF' },
      'rejected': { text: 'Отклонено', color: '#B3262E', bg: '#FCEBEC' }
    };
    return labels[status] || labels['pending'];
  };

  const canCreate = profile?.role === 'admin' || 
                    profile?.role === 'movement_coordinator' ||
                    profile?.role === 'club_coordinator';

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
          <span style={{ fontSize: '32px' }}>👑</span>
          <div>
            <h1>Задания президента</h1>
            <p>Управление заданиями для президентов КЮДов</p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowTaskForm(!showTaskForm)}
            >
              {showTaskForm ? '✖ Закрыть' : '➕ Создать задание'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ ЗАДАНИЯ */}
        {showTaskForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📝 Создать задание для президента
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название задания *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Например: Подготовить отчет о деятельности клуба"
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

              <div className="form-group">
                <label>Срок выполнения</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowTaskForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК ЗАДАНИЙ */}
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Заданий пока нет</p>
            {canCreate && <p style={{ color: '#667085' }}>Создайте первое задание для президента КЮДа</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tasks.map((task) => {
              const status = getStatusLabel(task.status);
              return (
                <div key={task.id} className="card" style={{ borderLeft: `4px solid ${status.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', margin: 0 }}>
                        {task.title}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#667085', marginTop: '4px' }}>
                        <span>🏫 {task.club_name || 'КЮД'}</span>
                        {task.deadline && (
                          <>
                            <span style={{ margin: '0 8px' }}>•</span>
                            <span>📅 Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
                          </>
                        )}
                      </div>
                      {task.description && (
                        <p style={{ color: '#475467', marginTop: '8px', fontSize: '14px' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="tag" style={{ background: status.bg, color: status.color }}>
                        {status.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}