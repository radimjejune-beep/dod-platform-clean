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
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'general',
    document_type: 'pdf',
    is_public: true,
    club_id: '',
    tags: []
  });
  const [clubs, setClubs] = useState([]);
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

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);

      // TODO: добавить API для получения документов
      setDocuments([]);

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

      // TODO: добавить API для создания документа
      await new Promise(resolve => setTimeout(resolve, 500));

      setMessage(editingDoc ? '✅ Документ обновлён!' : '✅ Документ создан!');
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
      // TODO: добавить API для удаления
      await new Promise(resolve => setTimeout(resolve, 300));
      setDocuments(documents.filter(d => d.id !== id));
      setMessage('✅ Документ удалён');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const categories = [
    { id: 'all', label: 'Все' },
    { id: 'general', label: 'Общие' },
    { id: 'regulations', label: 'Регламенты' },
    { id: 'instructions', label: 'Инструкции' },
    { id: 'templates', label: 'Шаблоны' },
    { id: 'reports', label: 'Отчёты' }
  ];

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
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {showForm && (
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
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="list-item"
                  style={{ borderLeftColor: '#174A7E' }}
                >
                  <div className="title">
                    {doc.title}
                    <span className="tag tag-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                      {doc.category}
                    </span>
                    {doc.is_public && (
                      <span className="tag" style={{ marginLeft: '8px', background: '#EDE7F6', color: '#6B46C1', fontSize: '10px' }}>
                        🌍 Общий
                      </span>
                    )}
                  </div>
                  <div className="subtitle">
                    📄 {doc.document_type}
                    {doc.club_name && ` • 🏫 ${doc.club_name}`}
                    {doc.tags && doc.tags.length > 0 && ` • 🏷️ ${doc.tags.join(', ')}`}
                  </div>
                  {doc.content && <div className="meta">{doc.content.substring(0, 100)}...</div>}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => handleEdit(doc)}
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => {}} // TODO: скачать
                    >
                      📥 Скачать
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => handleDelete(doc.id)}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}