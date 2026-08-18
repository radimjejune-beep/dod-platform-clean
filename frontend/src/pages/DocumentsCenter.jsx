// frontend/src/pages/DocumentsCenter.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function DocumentsCenter() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
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
  // ПРОВЕРКА ПРАВ НА РЕДАКТИРОВАНИЕ
  // ============================================================
  const canEditDocument = (doc) => {
    const role = profile?.role;
    
    // Администратор может всё
    if (role === 'admin') return true;
    
    // Координатор движения может редактировать только свои документы
    if (role === 'movement_coordinator') {
      return doc.created_by === profile?.id;
    }
    
    // Координатор КЮДа — может редактировать ТОЛЬКО СВОИ документы
    if (role === 'club_coordinator') {
      return doc.created_by === profile?.id;
    }
    
    // Остальные не могут редактировать
    return false;
  };

  // ============================================================
  // ПРОВЕРКА ПРАВ НА УДАЛЕНИЕ
  // ============================================================
  const canDeleteDocument = (doc) => {
    const role = profile?.role;
    
    // Администратор может всё
    if (role === 'admin') return true;
    
    // Координатор движения может удалять только свои документы
    if (role === 'movement_coordinator') {
      return doc.created_by === profile?.id;
    }
    
    // Координатор КЮДа — может удалять ТОЛЬКО СВОИ документы
    if (role === 'club_coordinator') {
      return doc.created_by === profile?.id;
    }
    
    // Остальные не могут удалять
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
      // Для координатора КЮДа автоматически подставляем его club_id
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
    // Проверка прав
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
    // Проверка прав
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
  // ОТОБРАЖЕНИЕ СТАТУСА ДОКУМЕНТА
  // ============================================================
  const getDocumentStatus = (doc) => {
    if (doc.is_public) {
      return <span className="badge badge-success">Публичный</span>;
    }
    return <span className="badge badge-info">Приватный</span>;
  };

  // ============================================================
  // ФОРМАТИРОВАНИЕ ДАТЫ
  // ============================================================
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F5F6F8' }}>
        <div className="spinner" />
      </div>
    );
  }

  const canCreate = ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile?.role);

  return (
    <div className="container-page">
      {/* ============================================================
      ЗАГОЛОВОК
      ============================================================ */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">📁</div>
          <div>
            <h1>Центр документов</h1>
            <p>Управление документами и материалами</p>
          </div>
        </div>
        {canCreate && (
          <div className="page-header-actions">
            <button className="btn btn-gold" onClick={() => {
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
            }}>
              + Создать документ
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
      СООБЩЕНИЯ
      ============================================================ */}
      {error && (
        <div className="message message-error">
          {error}
        </div>
      )}
      {success && (
        <div className="message message-success">
          {success}
        </div>
      )}

      {/* ============================================================
      ФИЛЬТРЫ ПО КАТЕГОРИЯМ
      ============================================================ */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button className="btn btn-primary btn-sm">Все документы</button>
        <button className="btn btn-outline btn-sm">Общие</button>
        <button className="btn btn-outline btn-sm">Инструкции</button>
        <button className="btn btn-outline btn-sm">Шаблоны</button>
        <button className="btn btn-outline btn-sm">Приказы</button>
        <button className="btn btn-outline btn-sm">Другое</button>
      </div>

      {/* ============================================================
      СПИСОК ДОКУМЕНТОВ
      ============================================================ */}
      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>Нет документов</h3>
          <p>Документы пока не добавлены</p>
          {canCreate && (
            <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => {
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
            }}>
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
              {documents.map((doc) => {
                const canEdit = canEditDocument(doc);
                const canDelete = canDeleteDocument(doc);
                
                return (
                  <tr key={doc.id}>
                    <td>
                      <strong>{doc.title}</strong>
                    </td>
                    <td>
                      <span className="badge badge-info">{doc.category}</span>
                    </td>
                    <td>{doc.document_type}</td>
                    <td>{getDocumentStatus(doc)}</td>
                    <td>{doc.created_by_name || 'Неизвестно'}</td>
                    <td>{formatDate(doc.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handleEdit(doc)}
                          disabled={!canEdit}
                          style={{ 
                            opacity: canEdit ? 1 : 0.4, 
                            cursor: canEdit ? 'pointer' : 'not-allowed' 
                          }}
                          title={!canEdit ? 'Нет прав на редактирование (можно редактировать только свои документы)' : ''}
                        >
                          Редактировать
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleDelete(doc)}
                          disabled={!canDelete}
                          style={{ 
                            opacity: canDelete ? 1 : 0.4, 
                            cursor: canDelete ? 'pointer' : 'not-allowed' 
                          }}
                          title={!canDelete ? 'Нет прав на удаление (можно удалять только свои документы)' : ''}
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

      {/* ============================================================
      МОДАЛЬНОЕ ОКНО (СОЗДАНИЕ / РЕДАКТИРОВАНИЕ)
      ============================================================ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDoc ? 'Редактировать документ' : 'Создать документ'}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            {/* Название */}
            <div className="form-group">
              <label className="form-label">Название документа *</label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Введите название документа"
              />
            </div>

            {/* Содержание */}
            <div className="form-group">
              <label className="form-label">Содержание</label>
              <textarea
                className="form-control"
                rows="6"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Введите текст документа"
              />
            </div>

            {/* Категория */}
            <div className="form-group">
              <label className="form-label">Категория</label>
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

            {/* Тип документа */}
            <div className="form-group">
              <label className="form-label">Тип документа</label>
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

            {/* Публичность */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
                Публичный документ (доступен всем)
              </label>
            </div>

            {/* Клуб (только для админа) */}
            {profile?.role === 'admin' && (
              <div className="form-group">
                <label className="form-label">Клуб (ID)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.club_id || ''}
                  onChange={(e) => setFormData({ ...formData, club_id: e.target.value || null })}
                  placeholder="ID клуба (оставьте пустым для общего доступа)"
                />
              </div>
            )}

            {/* Информация о клубе для координатора КЮДа */}
            {profile?.role === 'club_coordinator' && (
              <div className="form-group" style={{ opacity: 0.6 }}>
                <label className="form-label">Клуб</label>
                <input
                  type="text"
                  className="form-control"
                  value={profile?.club_name || 'Ваш КЮД'}
                  disabled
                />
                <small style={{ color: '#98A2B3', display: 'block', marginTop: '4px' }}>
                  Документ будет привязан к вашему КЮДу
                </small>
              </div>
            )}

            {/* Кнопки */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-gold"
                onClick={editingDoc ? handleUpdate : handleCreate}
                style={{ flex: 1 }}
              >
                {editingDoc ? 'Сохранить изменения' : 'Создать документ'}
              </button>
              <button
                className="btn btn-outline"
                onClick={closeModal}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
      СТИЛИ
      ============================================================ */}
      <style>{`
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
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed !important;
          pointer-events: none !important;
        }
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
          box-shadow: 0 24px 64px rgba(10, 22, 40, 0.2);
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
        .form-group {
          margin-bottom: 18px;
        }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #6B6561;
          margin-bottom: 4px;
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
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.08);
        }
        .form-control:disabled {
          background: #F8F6F2;
          cursor: not-allowed;
        }
        textarea.form-control {
          resize: vertical;
          min-height: 100px;
        }
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
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10, 22, 40, 0.04);
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .page-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .page-header-icon {
          font-size: 32px;
        }
        .page-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #0A1628;
          margin: 0;
        }
        .page-header p {
          font-size: 14px;
          color: #8A8480;
          margin: 0;
        }
        .page-header-actions {
          display: flex;
          gap: 10px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 22px;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          letter-spacing: 0.01em;
          min-height: 40px;
          min-width: 80px;
          white-space: nowrap;
        }
        .btn-gold {
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          box-shadow: 0 2px 16px rgba(201, 162, 39, 0.25);
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
        }
        .btn-primary {
          background: #0A1628;
          color: white;
          box-shadow: 0 4px 16px rgba(10, 22, 40, 0.15);
        }
        .btn-primary:hover {
          background: #1A3555;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(10, 22, 40, 0.25);
        }
        .btn-danger {
          background: #B3262E;
          color: white;
          box-shadow: 0 4px 16px rgba(179, 38, 46, 0.2);
        }
        .btn-danger:hover {
          background: #8A1C22;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(179, 38, 46, 0.3);
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
        .table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10, 22, 40, 0.04);
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
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .page-header-actions {
            width: 100%;
          }
          .page-header-actions .btn {
            width: 100%;
            justify-content: center;
          }
          .modal {
            padding: 20px;
            margin: 10px;
          }
        }
        @media (max-width: 480px) {
          .page-header {
            padding: 16px 18px;
          }
          .page-header h1 {
            font-size: 20px;
          }
          .table {
            min-width: 500px;
            font-size: 12px;
          }
          .table thead th,
          .table tbody td {
            padding: 8px 12px;
          }
          .btn {
            padding: 6px 12px;
            font-size: 12px;
            min-height: 32px;
            min-width: 50px;
          }
          .btn-sm {
            padding: 4px 10px;
            font-size: 11px;
            min-height: 26px;
            min-width: 40px;
          }
          .modal {
            padding: 16px;
          }
          .modal-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}