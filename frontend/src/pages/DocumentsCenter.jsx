// frontend/src/pages/DocumentsCenter.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function DocumentsCenter() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [clubs, setClubs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'general',
    document_type: 'pdf',
    is_public: true,
    club_id: '',
    tags: []
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

      const isPresident = userData.is_president || false;
      if (userData.role === 'participant' || userData.role === 'parent' || isPresident) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      const token = localStorage.getItem('token');
      console.log('📥 Загрузка документов...');
      
      const response = await fetch('https://dod-backend.relaxdev.ru/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Загружено документов:', data?.length || 0);
      setDocuments(data || []);

    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки: ' + err.message);
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
      if (!form.title.trim()) {
        setMessage('❌ Заголовок обязателен');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Нет авторизации');
      }

      const data = {
        title: form.title.trim(),
        content: form.content || '',
        category: form.category || 'general',
        document_type: form.document_type || 'pdf',
        is_public: form.is_public !== undefined ? form.is_public : true,
        club_id: form.club_id || null,
        tags: form.tags || []
      };

      console.log('📤 Отправка документа:', { 
        title: data.title, 
        category: data.category,
        is_public: data.is_public,
        club_id: data.club_id
      });

      let response;
      let result;

      if (editingDoc) {
        response = await fetch(`https://dod-backend.relaxdev.ru/api/documents/${editingDoc.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
        console.log('📥 Ответ сервера (PUT):', result);
      } else {
        response = await fetch('https://dod-backend.relaxdev.ru/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
        console.log('📥 Ответ сервера (POST):', result);
      }

      if (!response.ok) {
        throw new Error(result.error || result.detail || 'Ошибка сохранения документа');
      }

      setMessage(editingDoc ? '✅ Документ обновлён!' : '✅ Документ создан!');
      setMessageType('success');
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      category: 'general',
      document_type: 'pdf',
      is_public: true,
      club_id: '',
      tags: []
    });
    setEditingDoc(null);
    setShowForm(false);
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setForm({
      title: doc.title || '',
      content: doc.content || '',
      category: doc.category || 'general',
      document_type: doc.document_type || 'pdf',
      is_public: doc.is_public !== undefined ? doc.is_public : true,
      club_id: doc.club_id || '',
      tags: doc.tags || []
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить документ?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка удаления');
      }

      setMessage('✅ Документ удалён');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleOpenModal = (doc) => {
    setSelectedDocument(doc);
    setShowModal(true);
    // Отметка о прочтении
    markAsRead(doc.id);
  };

  const markAsRead = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://dod-backend.relaxdev.ru/api/documents/${docId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Ошибка отметки о прочтении:', err);
    }
  };

  const categories = [
    { id: 'all', label: '📄 Все' },
    { id: 'general', label: '📄 Общие' },
    { id: 'regulations', label: '📋 Регламенты' },
    { id: 'instructions', label: '📖 Инструкции' },
    { id: 'templates', label: '📝 Шаблоны' },
    { id: 'reports', label: '📊 Отчёты' }
  ];

  const canManage = profile && ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile.role);

  const filteredDocuments = documents.filter(doc => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title?.toLowerCase().includes(q) ||
             doc.content?.toLowerCase().includes(q) ||
             doc.tags?.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

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
          <span style={{ fontSize: '32px' }}>📁</span>
          <div>
            <h1>Центр документов</h1>
            <p>Централизованное хранилище документов движения</p>
          </div>
          {canManage && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Добавить документ'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showForm && canManage && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {editingDoc ? '✏️ Редактировать документ' : '📝 Добавить документ'}
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
                    placeholder="Название документа"
                  />
                </div>
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="general">📄 Общие</option>
                    <option value="regulations">📋 Регламенты</option>
                    <option value="instructions">📖 Инструкции</option>
                    <option value="templates">📝 Шаблоны</option>
                    <option value="reports">📊 Отчёты</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Тип документа</label>
                  <select
                    value={form.document_type}
                    onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  >
                    <option value="pdf">📄 PDF</option>
                    <option value="docx">📝 DOCX</option>
                    <option value="xlsx">📊 XLSX</option>
                    <option value="link">🔗 Ссылка</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Клуб (если для конкретного)</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  >
                    <option value="">Для всех клубов</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Содержание</label>
                  <textarea
                    rows="6"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Текст документа или ссылка..."
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Теги (через запятую)</label>
                  <input
                    type="text"
                    value={form.tags.join(', ')}
                    onChange={(e) => setForm({
                      ...form,
                      tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="важный, шаблон, инструкция"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '500', color: '#0B1F3A' }}>
                      🌍 Доступен для всех
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : editingDoc ? '💾 Обновить' : '✅ Добавить'}
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
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по документам..."
              style={{
                width: '100%',
                padding: '8px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* СПИСОК ДОКУМЕНТОВ */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              📋 Все документы
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              {filteredDocuments.length} документов
            </span>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📁</div>
              <p>Документов пока нет</p>
              {canManage && (
                <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                  Нажмите <strong>"Добавить документ"</strong> чтобы создать первый документ
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredDocuments.map((doc) => {
                const category = categories.find(c => c.id === doc.category);
                const canEdit = canManage && (profile?.role === 'admin' || 
                              profile?.role === 'movement_coordinator' || 
                              doc.created_by === profile?.id);
                const canDelete = profile?.role === 'admin' || profile?.role === 'movement_coordinator';
                
                return (
                  <div
                    key={doc.id}
                    className="list-item"
                    style={{ 
                      borderLeftColor: doc.is_public ? '#174A7E' : '#C9A227',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleOpenModal(doc)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div className="title">
                      {doc.title}
                      <span className="tag tag-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                        {category?.label || doc.category}
                      </span>
                      {doc.is_public && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#EDE7F6', color: '#6B46C1', fontSize: '10px' }}>
                          🌍 Общий
                        </span>
                      )}
                      {doc.club_name && (
                        <span className="tag" style={{ marginLeft: '8px', background: '#EAF2FA', color: '#174A7E', fontSize: '10px' }}>
                          🏫 {doc.club_name}
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      📄 {doc.document_type}
                      {doc.created_by_name && ` • 👤 ${doc.created_by_name}`}
                      {doc.created_at && ` • 📅 ${new Date(doc.created_at).toLocaleDateString('ru-RU')}`}
                      {doc.tags && doc.tags.length > 0 && ` • 🏷️ ${doc.tags.join(', ')}`}
                    </div>
                    {doc.content && (
                      <div className="meta">
                        {doc.content.length > 150 ? doc.content.substring(0, 150) + '...' : doc.content}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(doc);
                        }}
                      >
                        👁️ Открыть
                      </button>
                      {canEdit && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(doc);
                          }}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                        >
                          🗑️ Удалить
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

      {/* ===== МОДАЛЬНОЕ ОКНО ПРОСМОТРА ДОКУМЕНТА ===== */}
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
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease'
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
                fontSize: '28px',
                color: '#98A2B3',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '28px' }}>📄</span>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                  {selectedDocument.title}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                  {categories.find(c => c.id === selectedDocument.category)?.label || selectedDocument.category}
                </span>
                <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                  📄 {selectedDocument.document_type}
                </span>
                {selectedDocument.is_public && (
                  <span className="tag" style={{ background: '#EDE7F6', color: '#6B46C1' }}>
                    🌍 Общий
                  </span>
                )}
                {selectedDocument.club_name && (
                  <span className="tag" style={{ background: '#EAF2FA', color: '#174A7E' }}>
                    🏫 {selectedDocument.club_name}
                  </span>
                )}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                    🏷️ {selectedDocument.tags.join(', ')}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '13px', color: '#98A2B3', marginTop: '8px' }}>
                👤 {selectedDocument.created_by_name || 'Неизвестно'}
                {' • '}
                📅 {new Date(selectedDocument.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                {selectedDocument.updated_at && selectedDocument.updated_at !== selectedDocument.created_at && (
                  <> • ✏️ Обновлён: {new Date(selectedDocument.updated_at).toLocaleDateString('ru-RU')}</>
                )}
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: '#F8FAFC',
              borderRadius: '12px',
              borderLeft: '4px solid #C9A227',
              marginBottom: '16px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <p style={{ 
                fontSize: '15px', 
                color: '#0B1F3A', 
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {selectedDocument.content || 'Содержание документа отсутствует'}
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              borderTop: '1px solid #E2E7EF',
              paddingTop: '16px'
            }}>
              {canManage && (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      handleEdit(selectedDocument);
                    }}
                  >
                    ✏️ Редактировать
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      setShowModal(false);
                      handleDelete(selectedDocument.id);
                    }}
                  >
                    🗑️ Удалить
                  </button>
                </>
              )}
              <button className="btn-primary" onClick={() => setShowModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}