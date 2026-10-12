// frontend/src/pages/AdminNews.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { confirmAction } from '../lib/confirm';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';
import { newsImageSrc } from '../lib/news';

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

      const response = await fetch('https://dod-backend.relaxdev.ru/api/news');

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`);
      }

      const data = await response.json();
      setNews(data || []);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('Ошибка загрузки: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = profile && (profile.role === 'admin' || profile.role === 'movement_coordinator');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Файл слишком большой. Максимум 5MB');
      setMessageType('error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('Пожалуйста, выберите изображение');
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
      
      // Картинку отправляем, только если её меняли: новый файл — загружаем,
      // «Удалить фото» — пустая строка, не трогали — поле не шлём вовсе,
      // и сервер оставляет прежнее фото
      let imageUrl;
      if (form.image_file) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(form.image_file);
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
      } else if (!imagePreview) {
        imageUrl = '';
      }

      const data = {
        title: form.title.trim(),
        content: form.content.trim()
      };
      if (imageUrl !== undefined) data.image_url = imageUrl;

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

      if (!response.ok) {
        // Раньше сюда падал сырой JSON сервера; теперь разбираем его
        // так же, как везде, и показываем человеческое объяснение
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = null;
        }
        throw new Error(api.describeApiError(errorData, `Ошибка ${response.status}`));
      }

      setMessage(editingId ? 'Новость обновлена!' : 'Новость создана!');
      setMessageType('success');
      resetForm();
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('Ошибка: ' + err.message);
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
      image_url: '',
      image_file: null
    });
    setImagePreview(newsImageSrc(item));
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!await confirmAction({ title: 'Удалить эту новость?', tone: 'danger' })) return;
    
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
        throw new Error(api.describeApiError(result));
      }

      setMessage('Новость удалена');
      setMessageType('success');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">Новости</h1>
            <p className="page-subtitle">Публикации на главной странице сайта движения</p>
          </div>
          {/* ⚠️ Раньше кнопки создания не было вовсе: форма открывалась
              только через «Редактировать», так что завести новую новость
              с этой страницы было нельзя */}
          {canCreate && !showForm && (
            <button className="btn-gold" onClick={() => { resetForm(); setShowForm(true); }}>
              <Icon name="plus" /> Создать новость
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
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {editingId ? 'Редактировать новость' : 'Создать новость'}
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
                  border: '2px dashed var(--color-gray-200)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  background: 'var(--color-gray-50)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => document.getElementById('newsImageInput').click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--color-gold)';
                  e.currentTarget.style.background = 'var(--color-gold-pale)';
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--color-gray-200)';
                  e.currentTarget.style.background = 'var(--color-gray-50)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--color-gray-200)';
                  e.currentTarget.style.background = 'var(--color-gray-50)';
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
                      <img src={imagePreview} alt="Превью" style={{ maxHeight: '150px', maxWidth: '100%', borderRadius: '8px' }} />
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
                        Удалить фото
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '40px', display: 'block' }}><Icon name="upload" size={40} /></span>
                      <p style={{ color: 'var(--color-gray-400)' }}>
                        Нажмите или перетащите фото для новости
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
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
                  {saving ? 'Сохранение...' : editingId ? 'Обновить' : 'Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Отмена
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
              <div className="icon"><Icon name="archive" /></div>
              <p>Новостей пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {news.map((item) => (
                <div
                  key={item.id}
                  className="list-item"
                  style={{
                    borderLeftColor: 'var(--color-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  {newsImageSrc(item) && (
                    <img 
                      src={newsImageSrc(item)} 
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
                      {new Date(item.created_at).toLocaleDateString('ru-RU')}
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
                      <Icon name="edit" />
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Icon name="trash" />
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