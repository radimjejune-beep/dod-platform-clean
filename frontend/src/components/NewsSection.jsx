// frontend/src/components/NewsSection.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NewsSection({ limit = 3 }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  
  // ===== ДЛЯ РЕДАКТИРОВАНИЯ =====
  const [editingNews, setEditingNews] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', image_url: '' });
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    loadNews();
    loadProfile();
  }, []);

  // ===== ЗАГРУЗКА ПРОФИЛЯ (БЕЗ ТОКЕНА - НЕ КРИТИЧНО) =====
  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('👤 Нет токена, профиль не загружен');
        return;
      }
      
      const response = await fetch('https://dod-backend.relaxdev.ru/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        console.log('👤 Профиль загружен:', data.role);
      } else {
        console.log('👤 Не удалось загрузить профиль, статус:', response.status);
        // Не удаляем токен, просто не показываем кнопки управления
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      // Игнорируем ошибку - новости всё равно покажутся
    }
  };

  // ===== ЗАГРУЗКА НОВОСТЕЙ (ПУБЛИЧНЫЙ ДОСТУП - БЕЗ ТОКЕНА) =====
  const loadNews = async () => {
    try {
      setLoading(true);
      console.log('📰 Загрузка новостей...');
      
      // НЕ ОТПРАВЛЯЕМ ТОКЕН - ПУБЛИЧНЫЙ ДОСТУП
      const response = await fetch('https://dod-backend.relaxdev.ru/api/news');
      
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📰 Загружено новостей:', data?.length || 0);
      setNews(data || []);
      setError('');
    } catch (err) {
      console.error('❌ Ошибка загрузки новостей:', err);
      setError('Не удалось загрузить новости');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // ===== ПРОВЕРКА ПРАВ =====
  const canManage = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  // ===== ОТКРЫТИЕ МОДАЛКИ РЕДАКТИРОВАНИЯ =====
  const handleEditClick = (item) => {
    setEditingNews(item);
    setEditForm({
      title: item.title,
      content: item.content,
      image_url: item.image_url || ''
    });
    setEditImagePreview(item.image_url || '');
    setEditImageFile(null);
    setShowEditModal(true);
  };

  // ===== ОБРАБОТКА ФАЙЛА =====
  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ Файл слишком большой. Максимум 5MB');
      setMessageType('error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('❌ Пожалуйста, выберите изображение');
      setMessageType('error');
      return;
    }

    setEditImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ===== СОХРАНЕНИЕ ИЗМЕНЕНИЙ =====
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('❌ Не авторизован');
        setMessageType('error');
        setSaving(false);
        return;
      }
      
      // Если есть новое изображение — загружаем
      let imageUrl = editForm.image_url;
      if (editImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(editImageFile);
        });
        
        const uploadResponse = await fetch('https://dod-backend.relaxdev.ru/api/upload-news-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image_base64: base64 })
        });
        
        const uploadData = await uploadResponse.json();
        if (uploadData.error) {
          throw new Error(uploadData.error);
        }
        imageUrl = uploadData.image_url;
      }

      const response = await fetch(`https://dod-backend.relaxdev.ru/api/news/${editingNews.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editForm.title,
          content: editForm.content,
          image_url: imageUrl
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Новость обновлена!');
      setMessageType('success');
      setShowEditModal(false);
      loadNews();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  // ===== УДАЛЕНИЕ НОВОСТИ =====
  const handleDelete = async (id) => {
    if (!confirm('Удалить эту новость?')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('❌ Не авторизован');
        setMessageType('error');
        return;
      }
      
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/news/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Новость удалена');
      setMessageType('success');
      loadNews();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div className="news-loading">
        <div className="spinner-small" />
        <span>Загрузка новостей...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-error">
        <span>📭</span>
        <p>{error}</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="news-empty">
        <span>📰</span>
        <p>Новостей пока нет</p>
        {canManage && (
          <Link to="/admin/news" className="news-add-link">
            ➕ Создать новость
          </Link>
        )}
      </div>
    );
  }

  const displayNews = news.slice(0, limit);

  return (
    <div className="news-section">
      {/* СООБЩЕНИЕ */}
      {message && (
        <div className={messageType === 'success' ? 'news-message-success' : 'news-message-error'}>
          {message}
        </div>
      )}

      <div className="news-header">
        <h2>📰 Последние новости</h2>
        <div className="news-header-actions">
          {canManage && (
            <Link to="/admin/news" className="news-add-link">
              ➕ Управление новостями
            </Link>
          )}
          {news.length > limit && (
            <Link to="/news" className="news-all-link">Все новости →</Link>
          )}
        </div>
      </div>
      
      <div className="news-grid">
        {displayNews.map((item) => (
          <div key={item.id} className="news-card">
            {item.image_url && (
              <div className="news-image">
                <img src={item.image_url} alt={item.title} />
              </div>
            )}
            <div className="news-body">
              <div className="news-date">{formatDate(item.created_at)}</div>
              <h3 className="news-title">{item.title}</h3>
              <p className="news-excerpt">
                {item.content.length > 120 
                  ? item.content.substring(0, 120) + '...' 
                  : item.content}
              </p>
              <div className="news-actions">
                <Link to={`/news/${item.id}`} className="news-read-more">
                  Читать далее →
                </Link>
                {canManage && (
                  <div className="news-admin-actions">
                    <button 
                      className="news-edit-btn"
                      onClick={() => handleEditClick(item)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      className="news-delete-btn"
                      onClick={() => handleDelete(item.id)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ===== */}
      {showEditModal && editingNews && (
        <div className="news-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="news-modal" onClick={(e) => e.stopPropagation()}>
            <div className="news-modal-header">
              <h3>✏️ Редактировать новость</h3>
              <button className="news-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="news-modal-body">
                {message && (
                  <div className={messageType === 'success' ? 'news-message-success' : 'news-message-error'}>
                    {message}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Заголовок *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Текст *</label>
                  <textarea
                    rows="5"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Изображение</label>
                  <div className="news-image-upload"
                    onClick={() => document.getElementById('editImageInput').click()}
                  >
                    {editImagePreview ? (
                      <div>
                        <img src={editImagePreview} alt="Превью" className="news-edit-preview" />
                        <button
                          type="button"
                          className="news-remove-image"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditImagePreview('');
                            setEditImageFile(null);
                            setEditForm({ ...editForm, image_url: '' });
                            document.getElementById('editImageInput').value = '';
                          }}
                        >
                          ✕ Удалить фото
                        </button>
                      </div>
                    ) : (
                      <div className="news-upload-placeholder">
                        <span>🖼️</span>
                        <p>Нажмите для выбора фото</p>
                      </div>
                    )}
                    <input
                      id="editImageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>
              <div className="news-modal-footer">
                <button type="submit" className="btn-success" disabled={saving}>
                  {saving ? '⏳ Сохранение...' : '💾 Сохранить'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .news-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .news-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .news-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0;
        }

        .news-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .news-add-link {
          color: #C9A227;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 6px 16px;
          border: 2px solid #C9A227;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .news-add-link:hover {
          background: #C9A227;
          color: #0B1F3A;
        }

        .news-all-link {
          color: #667085;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .news-all-link:hover {
          color: #0B1F3A;
          transform: translateX(4px);
        }

        .news-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .news-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(11, 31, 58, 0.06);
          border: 1px solid #E2E7EF;
          transition: all 0.3s ease;
          position: relative;
        }

        .news-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.1);
        }

        .news-image {
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #F4F6F9;
        }

        .news-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .news-card:hover .news-image img {
          transform: scale(1.05);
        }

        .news-body {
          padding: 20px;
        }

        .news-date {
          font-size: 12px;
          color: #98A2B3;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .news-title {
          font-size: 18px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0 0 10px 0;
          line-height: 1.3;
          font-family: 'Playfair Display', serif;
        }

        .news-excerpt {
          font-size: 14px;
          color: #667085;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }

        .news-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .news-read-more {
          color: #C9A227;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .news-read-more:hover {
          color: #B8921F;
          gap: 8px;
        }

        .news-admin-actions {
          display: flex;
          gap: 4px;
        }

        .news-edit-btn,
        .news-delete-btn {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          background: transparent;
        }

        .news-edit-btn:hover {
          background: #EAF2FA;
        }

        .news-delete-btn:hover {
          background: #FCEBEC;
        }

        /* ===== МОДАЛЬНОЕ ОКНО ===== */
        .news-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(11, 31, 58, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .news-modal {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(11, 31, 58, 0.3);
        }

        .news-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E2E7EF;
        }

        .news-modal-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0;
        }

        .news-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #98A2B3;
          transition: all 0.2s ease;
        }

        .news-modal-close:hover {
          color: #0B1F3A;
        }

        .news-modal-body {
          padding: 24px;
        }

        .news-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #E2E7EF;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .news-image-upload {
          border: 2px dashed #D5DCE7;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #F8FAFC;
        }

        .news-image-upload:hover {
          border-color: #C9A227;
          background: #FBF4DC;
        }

        .news-edit-preview {
          max-height: 150px;
          max-width: 100%;
          border-radius: 8px;
        }

        .news-remove-image {
          display: block;
          margin: 8px auto 0;
          padding: 4px 12px;
          background: #FCEBEC;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #B3262E;
        }

        .news-remove-image:hover {
          background: #FED7D7;
        }

        .news-upload-placeholder span {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .news-upload-placeholder p {
          color: #98A2B3;
          margin: 0;
        }

        .news-message-success {
          padding: 12px 16px;
          background: #E8F5EF;
          color: #16845B;
          border-radius: 10px;
          margin-bottom: 16px;
          border-left: 4px solid #16845B;
        }

        .news-message-error {
          padding: 12px 16px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 10px;
          margin-bottom: 16px;
          border-left: 4px solid #B3262E;
        }

        .news-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px;
          color: #667085;
        }

        .spinner-small {
          width: 24px;
          height: 24px;
          border: 3px solid #E2E7EF;
          border-top-color: #C9A227;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .news-error,
        .news-empty {
          text-align: center;
          padding: 40px;
          color: #98A2B3;
        }

        .news-error span,
        .news-empty span {
          font-size: 32px;
          display: block;
          margin-bottom: 12px;
        }

        @media (max-width: 768px) {
          .news-grid {
            grid-template-columns: 1fr;
          }
          
          .news-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .news-header h2 {
            font-size: 22px;
          }

          .news-modal {
            max-width: 100%;
            margin: 10px;
          }
        }
      `}</style>
    </div>
  );
}