// frontend/src/pages/DocumentsCenter.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function DocumentsCenter() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    document_type: 'pdf',
    is_public: true,
    club_id: null,
    tags: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const user = await api.getMe();
        setProfile(user);

        const docs = await api.getDocuments();
        setDocuments(docs || []);
        setFilteredDocuments(docs || []);
      } catch (err) {
        console.error('Ошибка загрузки документов:', err);
        setError('Ошибка загрузки документов');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  // ============================================================
  // ФИЛЬТРАЦИЯ ПО КАТЕГОРИЯМ
  // ============================================================
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredDocuments(documents);
    } else {
      setFilteredDocuments(documents.filter(doc => doc.category === activeCategory));
    }
  }, [activeCategory, documents]);

  // ============================================================
  // ПРОВЕРКА ПРАВ
  // ============================================================
  const canEditDocument = (doc) => {
    const role = profile?.role;
    if (role === 'admin') return true;
    if (role === 'movement_coordinator') {
      return doc.created_by === profile?.id;
    }
    if (role === 'club_coordinator') {
      return doc.created_by === profile?.id;
    }
    return false;
  };

  const canDeleteDocument = (doc) => {
    const role = profile?.role;
    if (role === 'admin') return true;
    if (role === 'movement_coordinator') {
      return doc.created_by === profile?.id;
    }
    if (role === 'club_coordinator') {
      return doc.created_by === profile?.id;
    }
    return false;
  };

  // ============================================================
  // СОЗДАНИЕ ДОКУМЕНТА
  // ============================================================
  const handleCreate = async () => {
    if (!formData.title.trim()) {
      setError('Название документа обязательно');
      return;
    }

    try {
      if (profile?.role === 'club_coordinator' && profile?.club_id) {
        formData.club_id = profile.club_id;
      }

      const doc = await api.createDocument(formData);
      setDocuments([doc, ...documents]);
      setShowModal(false);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        document_type: 'pdf',
        is_public: true,
        club_id: null,
        tags: []
      });
      setSuccess('Документ создан');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Ошибка создания:', err);
      setError('Ошибка создания документа');
    }
  };

  // ============================================================
  // РЕДАКТИРОВАНИЕ ДОКУМЕНТА
  // ============================================================
  const handleEdit = (doc) => {
    if (!canEditDocument(doc)) {
      setError('У вас нет прав на редактирование этого документа');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setEditingDoc(doc);
    setFormData({
      title: doc.title || '',
      content: doc.content || '',
      category: doc.category || 'general',
      document_type: doc.document_type || 'pdf',
      is_public: doc.is_public !== undefined ? doc.is_public : true,
      club_id: doc.club_id || null,
      tags: doc.tags || []
    });
    setShowModal(true);
  };

  // ============================================================
  // СОХРАНЕНИЕ ИЗМЕНЕНИЙ
  // ============================================================
  const handleUpdate = async () => {
    if (!formData.title.trim()) {
      setError('Название документа обязательно');
      return;
    }

    try {
      const updated = await api.updateDocument(editingDoc.id, formData);
      setDocuments(documents.map(d => d.id === updated.id ? updated : d));
      setShowModal(false);
      setEditingDoc(null);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        document_type: 'pdf',
        is_public: true,
        club_id: null,
        tags: []
      });
      setSuccess('Документ обновлён');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Ошибка обновления:', err);
      setError('Ошибка обновления документа');
    }
  };

  // ============================================================
  // УДАЛЕНИЕ ДОКУМЕНТА
  // ============================================================
  const handleDelete = async (doc) => {
    if (!canDeleteDocument(doc)) {
      setError('У вас нет прав на удаление этого документа');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!window.confirm(`Удалить документ «${doc.title}»?`)) return;

    try {
      await api.deleteDocument(doc.id);
      setDocuments(documents.filter(d => d.id !== doc.id));
      setSuccess('Документ удалён');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Ошибка удаления документа');
    }
  };

  // ============================================================
  // ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
  // ============================================================
  const closeModal = () => {
    setShowModal(false);
    setEditingDoc(null);
    setError('');
    setFormData({
      title: '',
      content: '',
      category: 'general',
      document_type: 'pdf',
      is_public: true,
      club_id: null,
      tags: []
    });
  };

  // ============================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================================
  const getDocumentStatus = (doc) => {
    if (doc.is_public) {
      return <span className="badge badge-success">Публичный</span>;
    }
    return <span className="badge badge-info">Приватный</span>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCategories = () => {
    const cats = new Set();
    documents.forEach(doc => {
      if (doc.category) cats.add(doc.category);
    });
    return Array.from(cats);
  };

  const categories = getCategories();

  const getCountByCategory = (category) => {
    if (category === 'all') return documents.length;
    return documents.filter(doc => doc.category === category).length;
  };

  const categoryLabels = {
    general: 'Общие',
    instructions: 'Инструкции',
    templates: 'Шаблоны',
    orders: 'Приказы',
    other: 'Другое'
  };

  const canCreate = ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile?.role);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F5F6F8' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      {/* ============================================================
         НАВИГАЦИЯ
         ============================================================ */}
      <Navigation profile={profile} />

      {/* ============================================================
         ОСНОВНОЙ КОНТЕНТ
         ============================================================ */}
      <div className="documents-page">
        {/* ЗАГОЛОВОК */}
        <div className="documents-header">
          <div className="documents-header-left">
            <h1>📁 Центр документов</h1>
            <p>Управление документами и материалами</p>
          </div>
          {canCreate && (
            <button
              className="btn btn-gold"
              onClick={() => {
                setEditingDoc(null);
                setFormData({
                  title: '',
                  content: '',
                  category: 'general',
                  document_type: 'pdf',
                  is_public: true,
                  club_id: profile?.club_id || null,
                  tags: []
                });
                setShowModal(true);
              }}
            >
              + Создать документ
            </button>
          )}
        </div>

        {/* СООБЩЕНИЯ */}
        {error && <div className="message message-error">{error}</div>}
        {success && <div className="message message-success">{success}</div>}

        {/* КАТЕГОРИИ */}
        <div className="category-filters">
          <button
            className={`category-filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Все документы
            <span className="category-count">{getCountByCategory('all')}</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {categoryLabels[cat] || cat}
              <span className="category-count">{getCountByCategory(cat)}</span>
            </button>
          ))}
        </div>

        {/* ============================================================
           СПИСОК ДОКУМЕНТОВ
           ============================================================ */}
        {filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>{activeCategory === 'all' ? 'Нет документов' : `Нет документов в категории «${categoryLabels[activeCategory] || activeCategory}»`}</h3>
            <p>{activeCategory === 'all' ? 'Документы пока не добавлены' : 'Попробуйте выбрать другую категорию'}</p>
            {canCreate && (
              <button
                className="btn btn-gold"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  setEditingDoc(null);
                  setFormData({
                    title: '',
                    content: '',
                    category: 'general',
                    document_type: 'pdf',
                    is_public: true,
                    club_id: profile?.club_id || null,
                    tags: []
                  });
                  setShowModal(true);
                }}
              >
                Создать первый документ
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Категория</th>
                  <th>Тип</th>
                  <th>Статус</th>
                  <th>Автор</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  const canEdit = canEditDocument(doc);
                  const canDelete = canDeleteDocument(doc);

                  return (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.title}</strong>
                      </td>
                      <td>
                        <span className="badge badge-info">{categoryLabels[doc.category] || doc.category}</span>
                      </td>
                      <td>{doc.document_type}</td>
                      <td>{getDocumentStatus(doc)}</td>
                      <td>{doc.created_by_name || 'Неизвестно'}</td>
                      <td>{formatDate(doc.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEdit(doc)}
                            disabled={!canEdit}
                            title={!canEdit ? 'Нет прав на редактирование' : ''}
                          >
                            Редактировать
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(doc)}
                            disabled={!canDelete}
                            title={!canDelete ? 'Нет прав на удаление' : ''}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
         МОДАЛЬНОЕ ОКНО
         ============================================================ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDoc ? '✏️ Редактировать документ' : '📝 Создать документ'}
              </h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="form-group">
              <label>Название документа <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Введите название документа"
              />
            </div>

            <div className="form-group">
              <label>Содержание</label>
              <textarea
                className="form-control"
                rows="6"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Введите текст документа"
              />
            </div>

            <div className="form-group">
              <label>Категория</label>
              <select
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="general">Общие</option>
                <option value="instructions">Инструкции</option>
                <option value="templates">Шаблоны</option>
                <option value="orders">Приказы</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className="form-group">
              <label>Тип документа</label>
              <select
                className="form-control"
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              >
                <option value="pdf">PDF</option>
                <option value="doc">DOC</option>
                <option value="docx">DOCX</option>
                <option value="xlsx">XLSX</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
                Публичный документ (доступен всем)
              </label>
            </div>

            {profile?.role === 'admin' && (
              <div className="form-group">
                <label>Клуб (ID)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.club_id || ''}
                  onChange={(e) => setFormData({ ...formData, club_id: e.target.value || null })}
                  placeholder="ID клуба (оставьте пустым для общего доступа)"
                />
              </div>
            )}

            {profile?.role === 'club_coordinator' && (
              <div className="form-group" style={{ opacity: 0.6 }}>
                <label>Клуб</label>
                <input
                  type="text"
                  className="form-control"
                  value={profile?.club_name || 'Ваш КЮД'}
                  disabled
                />
                <small>Документ будет привязан к вашему КЮДу</small>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-success"
                onClick={editingDoc ? handleUpdate : handleCreate}
              >
                {editingDoc ? '💾 Сохранить изменения' : '✅ Создать документ'}
              </button>
              <button
                className="btn btn-outline"
                onClick={closeModal}
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ============================================================
           СТРАНИЦА
           ============================================================ */
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .documents-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
          width: 100%;
        }

        /* ============================================================
           ЗАГОЛОВОК
           ============================================================ */
        .documents-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px 28px;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .documents-header-left h1 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #0A1628;
          margin: 0;
        }

        .documents-header-left p {
          font-size: 14px;
          color: #8A8480;
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
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        .btn-primary {
          background: #0A1628;
          color: white;
          box-shadow: 0 4px 16px rgba(10,22,40,0.15);
        }
        .btn-primary:hover {
          background: #1A3555;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.25);
        }

        .btn-success {
          background: #1A7A4C;
          color: white;
          box-shadow: 0 4px 16px rgba(26,122,76,0.2);
        }
        .btn-success:hover {
          background: #13663E;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(26,122,76,0.3);
        }

        .btn-danger {
          background: #B3262E;
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
          color: #0A1628;
          border: 1.5px solid #E4DFD8;
          box-shadow: none;
        }
        .btn-outline:hover {
          background: #F8F6F2;
          border-color: #C9A227;
          transform: translateY(-2px);
        }

        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed !important;
          pointer-events: none !important;
        }

        /* ============================================================
           СООБЩЕНИЯ
           ============================================================ */
        .message {
          padding: 14px 20px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
          border-left: 4px solid transparent;
        }

        .message-success {
          background: #E8F5EF;
          color: #1A7A4C;
          border-left-color: #1A7A4C;
        }

        .message-error {
          background: #FCEBEC;
          color: #B3262E;
          border-left-color: #B3262E;
        }

        /* ============================================================
           ФИЛЬТРЫ
           ============================================================ */
        .category-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .category-filter-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border: 1.5px solid #E4DFD8;
          border-radius: 8px;
          background: white;
          color: #6B6561;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .category-filter-btn:hover {
          border-color: #C9A227;
          color: #0A1628;
          background: #FBF4DC;
        }

        .category-filter-btn.active {
          border-color: #C9A227;
          background: #FBF4DC;
          color: #0A1628;
          font-weight: 600;
        }

        .category-count {
          background: #F8F6F2;
          padding: 1px 8px;
          border-radius: 12px;
          font-size: 11px;
          color: #8A8480;
        }

        .category-filter-btn.active .category-count {
          background: #E8D9A8;
          color: #0A1628;
        }

        /* ============================================================
           ТАБЛИЦА
           ============================================================ */
        .table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          width: 100%;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 700px;
        }

        .table thead {
          background: #F8F6F2;
          border-bottom: 1px solid #E4DFD8;
        }

        .table thead th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #8A8480;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .table tbody td {
          padding: 12px 16px;
          border-bottom: 1px solid #F0EDE8;
          color: #4D4744;
        }

        .table tbody tr:hover td {
          background: #F8F6F2;
        }

        .table tbody tr:last-child td {
          border-bottom: none;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* ============================================================
           БЕЙДЖИ
           ============================================================ */
        .badge {
          display: inline-block;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .badge-success {
          background: #E8F5EF;
          color: #16845B;
        }

        .badge-info {
          background: #EAF2FA;
          color: #174A7E;
        }

        .badge-blue {
          background: #EAF2FA;
          color: #174A7E;
        }

        /* ============================================================
           EMPTY STATE
           ============================================================ */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 1px dashed #E4DFD8;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: #4D4744;
          margin-bottom: 4px;
        }

        .empty-state p {
          font-size: 14px;
          color: #8A8480;
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
          border: 1px solid #E4DFD8;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #A8A29A;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .modal-close:hover {
          color: #0A1628;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .modal-actions .btn {
          flex: 1;
        }

        /* ============================================================
           ФОРМЫ
           ============================================================ */
        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #6B6561;
          margin-bottom: 4px;
        }

        .required {
          color: #B3262E;
        }

        .form-control {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E4DFD8;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #0A1628;
          background: white;
          transition: all 0.3s ease;
          outline: none;
          min-height: 44px;
        }

        .form-control:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

        .form-control:disabled {
          background: #F8F6F2;
          cursor: not-allowed;
        }

        textarea.form-control {
          resize: vertical;
          min-height: 100px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 400;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #C9A227;
          cursor: pointer;
        }

        small {
          font-size: 12px;
          color: #8A8480;
          display: block;
          margin-top: 4px;
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .documents-page {
            padding: 20px 24px 36px;
          }
        }

        @media (max-width: 768px) {
          .documents-page {
            padding: 16px 16px 28px;
          }

          .documents-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .documents-header .btn {
            width: 100%;
            justify-content: center;
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

          .table {
            min-width: 500px;
            font-size: 13px;
          }

          .category-filters {
            gap: 6px;
          }

          .category-filter-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .documents-page {
            padding: 12px 12px 20px;
          }

          .documents-header {
            padding: 14px 16px;
          }

          .documents-header-left h1 {
            font-size: 20px;
          }

          .table {
            min-width: 400px;
            font-size: 12px;
          }

          .table thead th,
          .table tbody td {
            padding: 8px 12px;
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

          .action-buttons {
            flex-direction: column;
            gap: 4px;
          }

          .action-buttons .btn {
            width: 100%;
            justify-content: center;
          }

          .category-filter-btn {
            padding: 4px 10px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}