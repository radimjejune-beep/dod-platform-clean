// frontend/src/pages/AdminNews.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function AdminNews() {
  const [profile, setProfile] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image_url: '',
    image_file: null
  });
  const [imagePreview, setImagePreview] = useState('');
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

      if (userData.role !== 'admin' && userData.role !== 'movement_coordinator') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const token = localStorage.getItem('token');
      console.log('📰 Загрузка новостей...');
      
      const response = await fetch('https://dod-backend.relaxdev.ru/api/news', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📰 Загружено новостей:', data?.length || 0);
      setNews(data || []);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка загрузки: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
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

    setForm({ ...form, image_file: file });
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('success');

    try {
      const token = localStorage.getItem('token');
      
      // Загружаем изображение, если есть
      let imageUrl = form.image_url;
      if (form.image_file) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(form.image_file);
        });
        
        console.log('📤 Загрузка изображения...');
        const uploadResponse = await fetch('https://dod-backend.relaxdev.ru/api/upload-news-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image_base64: base64 })
        });
        
        const uploadData = await uploadResponse.json();
        console.log('📥 Ответ загрузки изображения:', uploadData);
        
        if (uploadData.error) {
          throw new Error(uploadData.error);
        }
        imageUrl = uploadData.image_url;
      }

      const data = {
        title: form.title.trim(),
        content: form.content.trim(),
        image_url: imageUrl || ''
      };

      console.log('📤 Отправка новости:', data);

      let response;
      if (editingId) {
        response = await fetch(`https://dod-backend.relaxdev.ru/api/news/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
      } else {
        response = await fetch('https://dod-backend.relaxdev.ru/api/news', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
      }

      console.log('📥 Статус ответа:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Результат:', result);

      setMessage(editingId ? '✅ Новость обновлена!' : '✅ Новость создана!');
      setMessageType('success');
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      image_url: '',
      image_file: null
    });
    setImagePreview('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title,
      content: item.content,
      image_url: item.image_url || '',
      image_file: null
    });
    setImagePreview(item.image_url || '');
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту новость?')) return;
    
    try {
      const token = localStorage.getItem('token');
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
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

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
          <span style={{ fontSize: '32px' }}>📰</span>
          <div>
            <h1>Управление новостями</h1>
            <p>Всего новостей: {news.length}</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? '✖ Закрыть' : '➕ Создать новость'}
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
              {editingId ? '✏️ Редактировать новость' : '📝 Создать новость'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Заголовок *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Введите заголовок новости"
                />
              </div>

              <div className="form-group">
                <label>Текст новости *</label>
                <textarea
                  rows="6"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  placeholder="Введите текст новости..."
                />
              </div>

              <div className="form-group">
                <label>Изображение</label>
                <div style={{
                  border: '2px dashed #D5DCE7',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => document.getElementById('newsImageInput').click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#C9A227';
                  e.currentTarget.style.background = '#FBF4DC';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D5DCE7';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#D5DCE7';
                  e.currentTarget.style.background = '#F8FAFC';
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const input = document.getElementById('newsImageInput');
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    input.files = dt.files;
                    handleFileChange({ target: input });
                  }
                }}
                >
                  {imagePreview ? (
                    <div>
                      <img src={imagePreview} alt="Превью" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px' }} />
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginTop: '8px', padding: '4px 16px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview('');
                          setForm({ ...form, image_file: null, image_url: '' });
                          document.getElementById('newsImageInput').value = '';
                        }}
                      >
                        ✕ Удалить фото
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '40px', display: 'block' }}>🖼️</span>
                      <p style={{ color: '#98A2B3' }}>
                        Нажмите или перетащите фото для новости
                      </p>
                      <p style={{ fontSize: '12px', color: '#98A2B3' }}>
                        Поддерживаются JPG, PNG, WEBP (макс. 5MB)
                      </p>
                    </div>
                  )}
                  <input
                    id="newsImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-success" disabled={saving}>
                  {saving ? '⏳ Сохранение...' : editingId ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Все новости
          </h3>
          
          {news.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>Новостей пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {news.map((item) => (
                <div
                  key={item.id}
                  className="list-item"
                  style={{
                    borderLeftColor: '#C9A227',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="title">{item.title}</div>
                    <div className="subtitle">
                      📅 {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="meta">
                      {item.content.length > 100 
                        ? item.content.substring(0, 100) + '...' 
                        : item.content}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => handleEdit(item)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => handleDelete(item.id)}
                    >
                      🗑️
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