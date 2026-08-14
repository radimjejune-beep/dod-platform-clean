// frontend/src/pages/Appeals.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Appeals() {
  const [profile, setProfile] = useState(null);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState('in_progress');
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  
  const [form, setForm] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });
  const navigate = useNavigate();

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

      const appealsData = await api.getAppeals();
      console.log('📥 Загружено обращений:', appealsData?.length || 0);
      setAppeals(appealsData || []);
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки данных');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = profile && profile.role === 'club_coordinator';
  const canReply = profile && ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile.role);
  const canView = profile && ['club_coordinator', 'movement_coordinator', 'admin', 'president', 'vice_president'].includes(profile.role);
  const canDelete = profile && profile.role === 'admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      const result = await api.addAppeal({
        subject: form.subject,
        message: form.message,
        priority: form.priority
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Обращение отправлено!');
      setMessageType('success');
      setForm({ subject: '', message: '', priority: 'medium' });
      setShowForm(false);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      if (!replyMessage.trim()) {
        setMessage('❌ Введите текст ответа');
        setMessageType('error');
        setSending(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('❌ Не авторизован');
        setMessageType('error');
        setSending(false);
        return;
      }

      console.log('📤 Отправка ответа на обращение:', selectedAppeal?.id);
      console.log('📤 Текст ответа:', replyMessage);
      console.log('📤 Статус:', replyStatus);

      const response = await fetch(`https://dod-backend.relaxdev.ru/api/appeals/${selectedAppeal.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: replyMessage.trim(),
          status: replyStatus
        })
      });

      console.log('📥 Статус ответа:', response.status);

      const data = await response.json();
      console.log('📥 Данные ответа:', data);
      
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Ошибка отправки ответа');
      }

      setMessage('✅ Ответ отправлен!');
      setMessageType('success');
      setReplyMessage('');
      setShowReplyModal(false);
      setShowReplies(false);
      
      await loadData();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage('❌ У вас нет прав для удаления обращений');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!confirm('Удалить это обращение?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/appeals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка удаления');
      }

      setMessage('✅ Обращение удалено');
      setMessageType('success');
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка удаления:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const loadReplies = async (appealId) => {
    try {
      setLoadingReplies(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/appeals/${appealId}/replies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('📥 Загружены ответы:', data);
      setReplies(data || []);
      setShowReplies(true);
    } catch (err) {
      console.error('❌ Ошибка загрузки ответов:', err);
      setMessage('❌ Ошибка загрузки ответов');
      setMessageType('error');
    } finally {
      setLoadingReplies(false);
    }
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

  const getStatusLabel = (status) => {
    const labels = {
      'pending': '⏳ Ожидает',
      'in_progress': '🔄 На рассмотрении',
      'resolved': '✅ Решено',
      'rejected': '❌ Отклонено'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#8A6A00',
      'in_progress': '#174A7E',
      'resolved': '#16845B',
      'rejected': '#B3262E'
    };
    return colors[status] || '#667085';
  };

  const getStatusBg = (status) => {
    const colors = {
      'pending': '#FBF4DC',
      'in_progress': '#EAF2FA',
      'resolved': '#E8F5EF',
      'rejected': '#FCEBEC'
    };
    return colors[status] || '#F4F6F9';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>Только координаторы и администраторы</p>
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
          <span style={{ fontSize: '32px' }}>📨</span>
          <div>
            <h1>Обращения</h1>
            <p>
              {profile?.role === 'club_coordinator' 
                ? `Ваши обращения к руководству (${appeals.length})` 
                : `Все обращения от координаторов КЮДов (${appeals.length})`}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              ✍️ Новое обращение
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Тема *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  placeholder="Кратко опишите вопрос"
                />
              </div>

              <div className="form-group">
                <label>Приоритет</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="urgent">Срочный</option>
                </select>
              </div>

              <div className="form-group">
                <label>Текст обращения *</label>
                <textarea
                  rows="5"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  placeholder="Опишите ваше обращение подробно..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={sending}>
                  {sending ? '⏳ Отправка...' : '📤 Отправить'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {appeals.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Обращений пока нет</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {appeals.map((appeal) => {
              const status = getStatusLabel(appeal.status);
              const statusColor = getStatusColor(appeal.status);
              const statusBg = getStatusBg(appeal.status);
              
              return (
                <div
                  key={appeal.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${statusColor}`,
                    position: 'relative'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        flexWrap: 'wrap' 
                      }}>
                        <h3 style={{ 
                          fontSize: '17px', 
                          fontWeight: '600', 
                          color: '#0B1F3A', 
                          margin: 0 
                        }}>
                          {appeal.subject}
                        </h3>
                        <span className="tag" style={{
                          background: statusBg,
                          color: statusColor
                        }}>
                          {status}
                        </span>
                        <span className="tag" style={{
                          background: appeal.priority === 'urgent' ? '#FCEBEC' :
                                    appeal.priority === 'high' ? '#FCEBEC' :
                                    appeal.priority === 'medium' ? '#FBF4DC' : '#F4F6F9',
                          color: appeal.priority === 'urgent' ? '#B3262E' :
                                 appeal.priority === 'high' ? '#B3262E' :
                                 appeal.priority === 'medium' ? '#8A6A00' : '#667085'
                        }}>
                          {getPriorityLabel(appeal.priority)}
                        </span>
                        {appeal.club_name && (
                          <span className="tag tag-blue">🏫 {appeal.club_name}</span>
                        )}
                        {appeal.coordinator_name && (
                          <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                            👤 {appeal.coordinator_name}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '14px', color: '#475467', marginTop: '8px' }}>
                        {appeal.message}
                      </div>

                      <div style={{ 
                        fontSize: '12px', 
                        color: '#98A2B3', 
                        marginTop: '4px',
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <span>📅 {new Date(appeal.created_at).toLocaleString('ru-RU')}</span>
                        {appeal.resolved_at && (
                          <span>✅ Рассмотрено: {new Date(appeal.resolved_at).toLocaleString('ru-RU')}</span>
                        )}
                        {appeal.reply_count > 0 && (
                          <span>💬 Ответов: {appeal.reply_count}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={async () => {
                          setSelectedAppeal(appeal);
                          await loadReplies(appeal.id);
                        }}
                      >
                        💬 Ответы ({appeal.reply_count || 0})
                      </button>
                      
                      {canReply && appeal.status !== 'resolved' && appeal.status !== 'rejected' && (
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedAppeal(appeal);
                            setShowReplyModal(true);
                            setReplyStatus('in_progress');
                            setReplyMessage('');
                          }}
                        >
                          📝 Ответить
                        </button>
                      )}
                      
                      {canDelete && (
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(appeal.id)}
                        >
                          🗑️ Удалить
                        </button>
                      )}
                    </div>
                  </div>

                  {showReplies && selectedAppeal?.id === appeal.id && (
                    <div style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid #E2E7EF' 
                    }}>
                      <h4 style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#0B1F3A', 
                        marginBottom: '12px' 
                      }}>
                        💬 История ответов
                      </h4>
                      
                      {loadingReplies ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <div className="spinner" style={{ width: '24px', height: '24px' }} />
                        </div>
                      ) : replies.length === 0 ? (
                        <p style={{ color: '#98A2B3', fontSize: '13px' }}>Ответов пока нет</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {replies.map((reply) => (
                            <div
                              key={reply.id}
                              style={{
                                padding: '12px 16px',
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                borderLeft: '3px solid #174A7E'
                              }}
                            >
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'flex-start' 
                              }}>
                                <div>
                                  <div style={{ fontSize: '14px', color: '#0B1F3A' }}>
                                    {reply.message}
                                  </div>
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#98A2B3', 
                                    marginTop: '4px' 
                                  }}>
                                    👤 {reply.author_name || 'Неизвестно'} 
                                    {reply.author_role && ` (${reply.author_role})`}
                                    {' • '}
                                    📅 {new Date(reply.created_at).toLocaleString('ru-RU')}
                                  </div>
                                </div>
                                {reply.appeal_status && (
                                  <span style={{
                                    fontSize: '11px',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    background: '#EAF2FA',
                                    color: '#174A7E'
                                  }}>
                                    Статус: {getStatusLabel(reply.appeal_status)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px', marginTop: '8px' }}
                        onClick={() => {
                          setShowReplies(false);
                          setReplies([]);
                        }}
                      >
                        ✖ Скрыть
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReplyModal && selectedAppeal && (
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
          onClick={() => setShowReplyModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#0B1F3A', 
              marginBottom: '4px' 
            }}>
              📝 Ответ на обращение
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Тема: <strong>{selectedAppeal.subject}</strong>
              <br />
              От: <strong>{selectedAppeal.coordinator_name || 'Координатор'}</strong>
            </p>

            <form onSubmit={handleReply}>
              <div className="form-group">
                <label>Статус обращения</label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="in_progress">🔄 На рассмотрении</option>
                  <option value="resolved">✅ Решено</option>
                  <option value="rejected">❌ Отклонено</option>
                </select>
              </div>

              <div className="form-group">
                <label>Текст ответа *</label>
                <textarea
                  rows="5"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                  placeholder="Введите ваш официальный ответ..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #D5DCE7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="submit" 
                  className="btn-success" 
                  disabled={sending}
                >
                  {sending ? '⏳ Отправка...' : '📤 Отправить ответ'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowReplyModal(false)}
                >
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