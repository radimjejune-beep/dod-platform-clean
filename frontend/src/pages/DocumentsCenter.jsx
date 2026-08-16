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

      // Проверка прав - участники, родители и президенты клубов не видят документы
      const isPresident = userData.is_president || false;
      if (userData.role === 'participant' || userData.role === 'parent' || isPresident) {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      // Загружаем документы
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
                    style={{ borderLeftColor: doc.is_public ? '#174A7E' : '#C9A227' }}
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
                        {doc.content.length > 200 ? doc.content.substring(0, 200) + '...' : doc.content}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {canEdit && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleEdit(doc)}
                        >
                          ✏️ Редактировать
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(doc.id)}
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
    </div>
  );
}