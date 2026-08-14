// frontend/src/pages/OfficialDocuments.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function OfficialDocuments() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    document_type: 'decree',
    is_urgent: false,
    priority: 'normal'
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

      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data || []);
      } else {
        console.error('Ошибка загрузки документов:', response.status);
        setDocuments([]);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const canCreate = profile && ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile.role);
  const canApprove = profile && ['president', 'vice_president'].includes(profile.role);
  const canPublish = profile && ['admin', 'movement_coordinator', 'president', 'vice_president'].includes(profile.role);
  const canView = profile && ['admin', 'movement_coordinator', 'club_coordinator', 'tutor', 'president', 'vice_president'].includes(profile.role);

  const getDocumentTypeLabel = (type) => {
    const labels = {
      'decree': '📜 Распоряжение',
      'invitation': '📩 Приглашение',
      'regulation': '📋 Регламент',
      'announcement': '📢 Объявление'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { label: '📝 Черновик', color: '#8A9AAA', bg: '#F4F6F9' },
      'pending_approval': { label: '⏳ На согласовании', color: '#C9A227', bg: '#FBF4DC' },
      'approved': { label: '✅ Одобрено', color: '#16845B', bg: '#E8F5EF' },
      'published': { label: '📢 Опубликовано', color: '#174A7E', bg: '#EAF2FA' },
      'rejected': { label: '❌ Отклонено', color: '#B3262E', bg: '#FCEBEC' }
    };
    return badges[status] || badges['draft'];
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'normal': '🟢 Обычный',
      'high': '🔴 Высокий',
      'urgent': '🔥 Срочный'
    };
    return labels[priority] || priority;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://dod-backend.relaxdev.ru/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          document_type: form.document_type,
          is_urgent: form.is_urgent,
          priority: form.priority
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Автоматически отправляем на согласование
      const submitResponse = await fetch(`https://dod-backend.relaxdev.ru/api/documents/${result.id}/submit`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      await submitResponse.json();

      setMessage('✅ Документ создан и отправлен на согласование президенту движения!');
      setMessageType('success');
      setShowForm(false);
      setForm({
        title: '',
        content: '',
        document_type: 'decree',
        is_urgent: false,
        priority: 'normal'
      });
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/documents/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Документ одобрен!');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      setMessage('❌ Укажите причину отклонения');
      setMessageType('error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/documents/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('❌ Документ отклонён');
      setMessageType('error');
      setShowRejectModal(false);
      setRejectReason('');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handlePublish = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/documents/${id}/publish`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('📢 Документ опубликован!');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://dod-backend.relaxdev.ru/api/documents/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      loadData();
    } catch (err) {
      console.error('Ошибка:', err);
    }
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
            <p style={{ color: '#667085' }}>Только сотрудники движения</p>
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
          <span style={{ fontSize: '32px' }}>📜</span>
          <div>
            <h1>Официальные документы ДОД</h1>
            <p>Распоряжения, регламенты и официальные объявления движения</p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setForm({
                    title: '',
                    content: '',
                    document_type: 'decree',
                    is_urgent: false,
                    priority: 'normal'
                  });
                }
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать документ'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ФОРМА СОЗДАНИЯ */}
        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #C9A227' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              📝 Создать официальный документ
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Тип документа *</label>
                <select
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  required
                >
                  <option value="decree">📜 Распоряжение</option>
                  <option value="invitation">📩 Приглашение</option>
                  <option value="regulation">📋 Регламент</option>
                  <option value="announcement">📢 Объявление</option>
                </select>
              </div>

              <div className="form-group">
                <label>Заголовок *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Официальный заголовок документа"
                />
              </div>

              <div className="form-group">
                <label>Текст документа *</label>
                <textarea
                  rows="8"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  placeholder="Содержание документа..."
                  style={{ fontFamily: 'serif' }}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="normal">🟢 Обычный</option>
                    <option value="high">🔴 Высокий</option>
                    <option value="urgent">🔥 Срочный</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_urgent}
                      onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      🔥 Срочный документ
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Создание...' : '✅ Создать и отправить на согласование'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>

              <div style={{ marginTop: '12px', padding: '12px 16px', background: '#FBF4DC', borderRadius: '8px', fontSize: '13px', color: '#8A6A00' }}>
                📌 После создания документ будет отправлен на согласование <strong>президенту движения</strong>.
                После одобрения он станет доступен всем сотрудникам движения.
              </div>
            </form>
          </div>
        )}

        {/* СПИСОК ДОКУМЕНТОВ */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 Все документы
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {documents.length} документов
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📜</div>
              <p style={{ fontSize: '18px', color: '#0B1F3A' }}>
                Официальных документов пока нет
              </p>
              {canCreate && (
                <p style={{ color: '#667085' }}>
                  Создайте первый документ для публикации
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc) => {
                const status = getStatusBadge(doc.status);
                const isUrgent = doc.is_urgent || doc.priority === 'urgent';
                const isRead = doc.is_read === true || doc.is_read === 'true' || doc.is_read === 1;
                
                return (
                  <div
                    key={doc.id}
                    className="list-item"
                    style={{
                      borderLeftColor: isUrgent ? '#B3262E' :
                                    doc.status === 'published' ? '#174A7E' :
                                    doc.status === 'approved' ? '#16845B' : '#C9A227',
                      background: isUrgent ? '#FCEBEC' : (isRead ? '#F8FAFC' : 'transparent'),
                      opacity: isRead ? 0.85 : 1
                    }}
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowModal(true);
                      if (!isRead && doc.status === 'published') {
                        handleMarkAsRead(doc.id);
                      }
                    }}
                  >
                    <div className="title">
                      {getDocumentTypeLabel(doc.document_type)}
                      <span style={{ marginLeft: '8px' }}>•</span>
                      {doc.title}
                      {isUrgent && (
                        <span className="tag tag-danger" style={{ marginLeft: '8px', fontSize: '10px' }}>
                          🔥 Срочно
                        </span>
                      )}
                      {doc.priority === 'high' && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#FCEBEC', color: '#B3262E', fontSize: '10px' }}>
                          Высокий приоритет
                        </span>
                      )}
                      <span className="tag" style={{ marginLeft: '8px', background: status.bg, color: status.color, fontSize: '10px' }}>
                        {status.label}
                      </span>
                      {!isRead && doc.status === 'published' && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#EAF2FA', color: '#174A7E', fontSize: '10px' }}>
                          🔵 Новое
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      👤 {doc.created_by_name || 'Неизвестно'}
                      {doc.approved_by_name && ` • ✅ Одобрено: ${doc.approved_by_name}`}
                      {doc.published_at && ` • 📅 ${new Date(doc.published_at).toLocaleDateString('ru-RU')}`}
                      {doc.read_count > 0 && ` • 👁️ ${doc.read_count} прочитали`}
                    </div>
                    {doc.content && (
                      <div className="meta">
                        {doc.content.length > 150 ? doc.content.substring(0, 150) + '...' : doc.content}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {canApprove && doc.status === 'pending_approval' && (
                        <>
                          <button
                            className="btn-success"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(doc.id);
                            }}
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocument(doc);
                              setShowRejectModal(true);
                            }}
                          >
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                      {canPublish && doc.status === 'approved' && (
                        <button
                          className="btn-primary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish(doc.id);
                          }}
                        >
                          📢 Опубликовать
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(doc);
                          setShowModal(true);
                          if (!isRead && doc.status === 'published') {
                            handleMarkAsRead(doc.id);
                          }
                        }}
                      >
                        📖 Подробнее
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДОКУМЕНТА */}
      {showModal && selectedDocument && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '700px',
              width: '100%',
              padding: '32px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#98A2B3',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>
                {selectedDocument.document_type === 'decree' ? '📜' :
                 selectedDocument.document_type === 'invitation' ? '📩' :
                 selectedDocument.document_type === 'regulation' ? '📋' : '📢'}
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                {selectedDocument.title}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span className="tag" style={{
                background: '#F4F6F9',
                color: '#667085'
              }}>
                {getDocumentTypeLabel(selectedDocument.document_type)}
              </span>
              <span className="tag" style={{
                background: getStatusBadge(selectedDocument.status).bg,
                color: getStatusBadge(selectedDocument.status).color
              }}>
                {getStatusBadge(selectedDocument.status).label}
              </span>
              {selectedDocument.priority && (
                <span className="tag" style={{
                  background: selectedDocument.priority === 'urgent' ? '#FCEBEC' :
                             selectedDocument.priority === 'high' ? '#FCEBEC' : '#F4F6F9',
                  color: selectedDocument.priority === 'urgent' ? '#B3262E' :
                         selectedDocument.priority === 'high' ? '#B3262E' : '#667085'
                }}>
                  {getPriorityLabel(selectedDocument.priority)}
                </span>
              )}
              {selectedDocument.is_urgent && (
                <span className="tag tag-danger">🔥 Срочно</span>
              )}
            </div>

            <div style={{
              padding: '16px 20px',
              background: '#F8FAFC',
              borderRadius: '8px',
              borderLeft: '4px solid #C9A227',
              marginBottom: '16px'
            }}>
              <p style={{ fontSize: '15px', color: '#0B1F3A', lineHeight: '1.8', whiteSpace: 'pre-wrap', margin: 0 }}>
                {selectedDocument.content}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '13px',
              color: '#667085',
              paddingTop: '16px',
              borderTop: '1px solid #E2E7EF'
            }}>
              <div>
                <span style={{ color: '#98A2B3' }}>Создал:</span>
                <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                  {selectedDocument.created_by_name || 'Неизвестно'}
                </div>
              </div>
              {selectedDocument.approved_by_name && (
                <div>
                  <span style={{ color: '#98A2B3' }}>Одобрил:</span>
                  <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                    {selectedDocument.approved_by_name}
                  </div>
                </div>
              )}
              {selectedDocument.created_at && (
                <div>
                  <span style={{ color: '#98A2B3' }}>Создан:</span>
                  <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                    {new Date(selectedDocument.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              )}
              {selectedDocument.published_at && (
                <div>
                  <span style={{ color: '#98A2B3' }}>Опубликован:</span>
                  <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                    {new Date(selectedDocument.published_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              )}
              {selectedDocument.read_count !== undefined && (
                <div>
                  <span style={{ color: '#98A2B3' }}>Прочитали:</span>
                  <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                    {selectedDocument.read_count} человек
                  </div>
                </div>
              )}
            </div>

            {canApprove && selectedDocument.status === 'pending_approval' && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E7EF', display: 'flex', gap: '12px' }}>
                <button
                  className="btn-success"
                  style={{ flex: 1 }}
                  onClick={() => {
                    handleApprove(selectedDocument.id);
                    setShowModal(false);
                  }}
                >
                  ✅ Одобрить
                </button>
                <button
                  className="btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowModal(false);
                    setShowRejectModal(true);
                  }}
                >
                  ❌ Отклонить
                </button>
              </div>
            )}

            {canPublish && selectedDocument.status === 'approved' && (
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={() => {
                  handlePublish(selectedDocument.id);
                  setShowModal(false);
                }}
              >
                📢 Опубликовать документ
              </button>
            )}

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setShowModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ОТКЛОНЕНИЯ */}
      {showRejectModal && selectedDocument && (
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
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              ❌ Отклонить документ
            </h3>
            <p style={{ color: '#667085', marginBottom: '16px' }}>
              Документ: <strong>{selectedDocument.title}</strong>
            </p>

            <div className="form-group">
              <label>Причина отклонения *</label>
              <textarea
                rows="4"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите причину отклонения документа..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => handleReject(selectedDocument.id)}
              >
                ❌ Отклонить
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}