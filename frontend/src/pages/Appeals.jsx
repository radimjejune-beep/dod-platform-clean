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
      setAppeals(appealsData || []);
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки данных');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const isClubCoordinator = profile?.role === 'club_coordinator';
  const canCreate = isClubCoordinator;
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

      const data = await response.json();
      
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
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий',
      'urgent': 'Срочный'
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'var(--color-success)',
      'medium': 'var(--color-gold)',
      'high': 'var(--color-error)',
      'urgent': 'var(--color-error)'
    };
    return colors[priority] || 'var(--color-gray-500)';
  };

  const getPriorityBg = (priority) => {
    const colors = {
      'low': 'var(--color-success-bg)',
      'medium': 'var(--color-gold-pale)',
      'high': 'var(--color-error-bg)',
      'urgent': 'var(--color-error-bg)'
    };
    return colors[priority] || 'var(--color-gray-100)';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Ожидает',
      'in_progress': 'На рассмотрении',
      'resolved': 'Решено',
      'rejected': 'Отклонено'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'var(--color-gold-dark)',
      'in_progress': 'var(--color-primary-light)',
      'resolved': 'var(--color-success)',
      'rejected': 'var(--color-error)'
    };
    return colors[status] || 'var(--color-gray-500)';
  };

  const getStatusBg = (status) => {
    const colors = {
      'pending': 'var(--color-gold-pale)',
      'in_progress': 'var(--color-info-bg)',
      'resolved': 'var(--color-success-bg)',
      'rejected': 'var(--color-error-bg)'
    };
    return colors[status] || 'var(--color-gray-100)';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
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
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Доступ запрещён</p>
            <p style={{ color: 'var(--color-gray-500)' }}>Только координаторы и администраторы</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ============================================================
           ЗАГОЛОВОК + КНОПКА
           ============================================================ */}
        <div className="appeals-header">
          <div className="appeals-header-left">
            <h1>📨 Обращения</h1>
            <p>
              {isClubCoordinator 
                ? `Ваши обращения к руководству (${appeals.length})` 
                : `Все обращения от координаторов КЮДов (${appeals.length})`}
            </p>
          </div>
          {canCreate && (
            <button
              className={`btn ${showForm ? 'btn-secondary' : 'btn-gold'}`}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать обращение'}
            </button>
          )}
        </div>

        {/* ============================================================
           ФОРМА СОЗДАНИЯ ОБРАЩЕНИЯ
           ============================================================ */}
        {showForm && canCreate && (
          <div className="appeal-form">
            <h3>✍️ Новое обращение</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Тема обращения <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  placeholder="Кратко опишите суть вопроса"
                />
              </div>

              <div className="form-group">
                <label>Приоритет</label>
                <div className="priority-options">
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <label key={p} className="priority-option">
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={form.priority === p}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      />
                      <span 
                        className="priority-label"
                        style={{
                          background: getPriorityBg(p),
                          color: getPriorityColor(p)
                        }}
                      >
                        {getPriorityLabel(p)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Текст обращения <span className="required">*</span></label>
                <textarea
                  rows="5"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  placeholder="Опишите ваше обращение подробно..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={sending}>
                  {sending ? '⏳ Отправка...' : '📤 Отправить обращение'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
           СПИСОК ОБРАЩЕНИЙ
           ============================================================ */}
        {appeals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>Нет обращений</h3>
            <p>{isClubCoordinator ? 'У вас пока нет обращений' : 'Обращений пока нет'}</p>
            {canCreate && (
              <button className="btn btn-gold" onClick={() => setShowForm(true)}>
                ➕ Создать обращение
              </button>
            )}
          </div>
        ) : (
          <div className="appeals-list">
            {appeals.map((appeal) => {
              const status = getStatusLabel(appeal.status);
              const statusColor = getStatusColor(appeal.status);
              const statusBg = getStatusBg(appeal.status);
              const priorityColor = getPriorityColor(appeal.priority);
              const priorityBg = getPriorityBg(appeal.priority);
              
              return (
                <div key={appeal.id} className="appeal-card" style={{ borderLeftColor: statusColor }}>
                  <div className="appeal-card-top">
                    <div className="appeal-card-info">
                      <h3 className="appeal-card-title">{appeal.subject}</h3>
                      <div className="appeal-card-badges">
                        <span className="badge" style={{ background: statusBg, color: statusColor }}>
                          {status}
                        </span>
                        <span className="badge" style={{ background: priorityBg, color: priorityColor }}>
                          {getPriorityLabel(appeal.priority)}
                        </span>
                        {appeal.club_name && (
                          <span className="badge badge-blue">🏫 {appeal.club_name}</span>
                        )}
                        {appeal.coordinator_name && (
                          <span className="badge badge-gray">👤 {appeal.coordinator_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="appeal-card-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={async () => {
                          setSelectedAppeal(appeal);
                          await loadReplies(appeal.id);
                        }}
                      >
                        💬 {appeal.reply_count || 0}
                      </button>
                      {canReply && appeal.status !== 'resolved' && appeal.status !== 'rejected' && (
                        <button
                          className="btn btn-primary btn-sm"
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
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(appeal.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="appeal-card-message">{appeal.message}</p>

                  <div className="appeal-card-footer">
                    <span>📅 {new Date(appeal.created_at).toLocaleString('ru-RU')}</span>
                    {appeal.resolved_at && (
                      <span>✅ Рассмотрено: {new Date(appeal.resolved_at).toLocaleString('ru-RU')}</span>
                    )}
                  </div>

                  {/* ============================================================
                     ОТВЕТЫ
                     ============================================================ */}
                  {showReplies && selectedAppeal?.id === appeal.id && (
                    <div className="appeal-replies">
                      <h4>💬 История ответов</h4>
                      {loadingReplies ? (
                        <div className="loading-replies">
                          <div className="spinner-small" />
                        </div>
                      ) : replies.length === 0 ? (
                        <p className="no-replies">Ответов пока нет</p>
                      ) : (
                        replies.map((reply) => (
                          <div key={reply.id} className="appeal-reply">
                            <div className="appeal-reply-message">{reply.message}</div>
                            <div className="appeal-reply-meta">
                              👤 {reply.author_name || 'Неизвестно'}
                              {reply.author_role && ` (${reply.author_role})`}
                              {' • '}
                              📅 {new Date(reply.created_at).toLocaleString('ru-RU')}
                            </div>
                          </div>
                        ))
                      )}
                      <button
                        className="btn btn-outline btn-sm"
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

      {/* ============================================================
         МОДАЛЬНОЕ ОКНО: ОТВЕТ НА ОБРАЩЕНИЕ
         ============================================================ */}
      {showReplyModal && selectedAppeal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📝 Ответ на обращение</h3>
              <button className="modal-close" onClick={() => setShowReplyModal(false)}>✕</button>
            </div>

            <p className="modal-subtitle">
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
                  className="form-control"
                >
                  <option value="in_progress">🔄 На рассмотрении</option>
                  <option value="resolved">✅ Решено</option>
                  <option value="rejected">❌ Отклонено</option>
                </select>
              </div>

              <div className="form-group">
                <label>Текст ответа <span className="required">*</span></label>
                <textarea
                  rows="5"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                  placeholder="Введите ваш официальный ответ..."
                  className="form-control"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-success" disabled={sending}>
                  {sending ? '⏳ Отправка...' : '📤 Отправить ответ'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowReplyModal(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* ============================================================
           ЗАГОЛОВОК
           ============================================================ */
        .appeals-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px 28px;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--color-gray-200);
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .appeals-header-left h1 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0;
        }

        .appeals-header-left p {
          font-size: 14px;
          color: var(--color-gray-500);
          margin: 4px 0 0 0;
        }

        /* ============================================================
           КНОПКИ
           ============================================================ */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          min-height: 44px;
          min-width: 80px;
        }

        .btn-gold {
          background: linear-gradient(135deg, var(--color-gold), #D4B84A, var(--color-gold-light));
          color: var(--color-primary-dark);
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        .btn-primary {
          background: var(--color-primary-dark);
          color: white;
          box-shadow: 0 4px 16px rgba(10,22,40,0.15);
        }
        .btn-primary:hover {
          background: var(--color-primary-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.25);
        }

        .btn-success {
          background: var(--color-success);
          color: white;
          box-shadow: 0 4px 16px rgba(26,122,76,0.2);
        }
        .btn-success:hover {
          background: #13663E;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(26,122,76,0.3);
        }

        .btn-danger {
          background: var(--color-error);
          color: white;
          box-shadow: 0 4px 16px rgba(179,38,46,0.2);
        }
        .btn-danger:hover {
          background: #8A1C22;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(179,38,46,0.3);
        }

        .btn-outline {
          background: transparent;
          color: var(--color-primary-dark);
          border: 1.5px solid var(--color-gray-200);
          box-shadow: none;
        }
        .btn-outline:hover {
          background: var(--color-gray-50);
          border-color: var(--color-gold);
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: var(--color-gray-100);
          color: var(--color-primary-dark);
        }
        .btn-secondary:hover {
          background: var(--color-gray-200);
        }

        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
        }

        /* ============================================================
           ФОРМА ОБРАЩЕНИЯ
           ============================================================ */
        .appeal-form {
          background: white;
          border-radius: 12px;
          padding: 28px 32px;
          border: 1px solid var(--color-gray-200);
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 24px;
        }

        .appeal-form h3 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--color-primary-dark);
          margin: 0 0 20px 0;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-gray-600);
          margin-bottom: 4px;
        }

        .required {
          color: var(--color-error);
        }

        .form-group input,
        .form-group textarea,
        .form-control {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: var(--color-primary-dark);
          background: white;
          transition: all 0.3s ease;
          outline: none;
          min-height: 44px;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-control:focus {
          border-color: var(--color-gold);
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .priority-options {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .priority-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .priority-option input[type="radio"] {
          width: 16px;
          height: 16px;
          accent-color: var(--color-gold);
          cursor: pointer;
        }

        .priority-label {
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        /* ============================================================
           СПИСОК ОБРАЩЕНИЙ
           ============================================================ */
        .appeals-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .appeal-card {
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          border: 1px solid var(--color-gray-200);
          border-left: 4px solid;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          transition: all 0.3s ease;
        }

        .appeal-card:hover {
          box-shadow: 0 8px 32px rgba(10,22,40,0.08);
          transform: translateY(-2px);
        }

        .appeal-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
        }

        .appeal-card-info {
          flex: 1;
          min-width: 200px;
        }

        .appeal-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 600;
          color: var(--color-primary-dark);
          margin: 0 0 8px 0;
        }

        .appeal-card-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-block;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }

        .badge-blue {
          background: var(--color-info-bg);
          color: var(--color-primary-light);
        }

        .badge-gray {
          background: var(--color-gray-100);
          color: var(--color-gray-500);
        }

        .appeal-card-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .appeal-card-message {
          font-size: 14px;
          color: #475467;
          line-height: 1.6;
          margin: 12px 0 8px 0;
        }

        .appeal-card-footer {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--color-gray-400);
          flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px solid var(--color-gray-100);
        }

        /* ============================================================
           ОТВЕТЫ
           ============================================================ */
        .appeal-replies {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-gray-200);
        }

        .appeal-replies h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary-dark);
          margin: 0 0 12px 0;
        }

        .loading-replies {
          text-align: center;
          padding: 20px;
        }

        .spinner-small {
          width: 24px;
          height: 24px;
          border: 3px solid var(--color-gray-200);
          border-top-color: var(--color-gold);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-replies {
          color: var(--color-gray-400);
          font-size: 13px;
          padding: 8px 0;
        }

        .appeal-reply {
          padding: 12px 16px;
          background: var(--color-gray-50);
          border-radius: 8px;
          border-left: 3px solid var(--color-primary-light);
          margin-bottom: 10px;
        }

        .appeal-reply:last-child {
          margin-bottom: 0;
        }

        .appeal-reply-message {
          font-size: 14px;
          color: var(--color-primary-dark);
        }

        .appeal-reply-meta {
          font-size: 12px;
          color: var(--color-gray-400);
          margin-top: 4px;
        }

        /* ============================================================
           EMPTY STATE
           ============================================================ */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 1px dashed var(--color-gray-200);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: var(--color-gray-700);
          margin-bottom: 4px;
        }

        .empty-state p {
          font-size: 14px;
          color: var(--color-gray-500);
        }

        /* ============================================================
           МОДАЛЬНОЕ ОКНО
           ============================================================ */
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
          border: 1px solid var(--color-gray-200);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--color-primary-dark);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--color-gray-400);
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .modal-close:hover { color: var(--color-primary-dark); }

        .modal-subtitle {
          font-size: 14px;
          color: var(--color-gray-500);
          margin: 0 0 20px 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .modal-actions .btn {
          flex: 1;
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 768px) {
          .appeals-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .appeal-form {
            padding: 20px;
          }

          .appeal-card {
            padding: 16px 18px;
          }

          .appeal-card-top {
            flex-direction: column;
            align-items: stretch;
          }

          .appeal-card-actions {
            justify-content: flex-start;
          }

          .modal {
            padding: 20px;
            margin: 10px;
          }

          .modal-actions {
            flex-direction: column;
          }
          .modal-actions .btn {
            width: 100%;
          }

          .priority-options {
            gap: 6px;
          }

          .form-actions {
            flex-direction: column;
          }
          .form-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .appeals-header {
            padding: 14px 16px;
          }
          .appeals-header-left h1 {
            font-size: 20px;
          }

          .appeal-form {
            padding: 16px;
          }

          .appeal-card {
            padding: 14px 16px;
          }

          .appeal-card-title {
            font-size: 15px;
          }

          .appeal-card-badges {
            gap: 4px;
          }

          .badge {
            font-size: 10px;
            padding: 2px 10px;
          }

          .btn {
            padding: 8px 16px;
            font-size: 13px;
            min-height: 36px;
          }

          .btn-sm {
            padding: 4px 10px;
            font-size: 11px;
            min-height: 28px;
            min-width: 40px;
          }

          .modal {
            padding: 16px;
          }
          .modal-title {
            font-size: 18px;
          }

          .priority-options {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}