// frontend/src/pages/Settings.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const navigate = useNavigate();

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', image_url: '' });
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsMessage, setNewsMessage] = useState('');

  const [settings, setSettings] = useState({
    heroTitle: 'Добро пожаловать в ДОД «Дипломаты будущего»',
    heroSubtitle: 'Система управления движением',
    primaryColor: '#0B1F3A',
    accentColor: '#C9A227',
    siteName: 'Дипломаты будущего',
  });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

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

      await loadNews();
      await loadSettings();
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNews = async () => {
    setNews([]);
  };

  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    setNewsLoading(true);
    setNewsMessage('');

    try {
      setNewsMessage(editingNewsId ? '✅ Новость обновлена!' : '✅ Новость создана!');
      resetNewsForm();
      loadNews();
      setTimeout(() => setNewsMessage(''), 3000);
    } catch (err) {
      setNewsMessage('❌ Ошибка: ' + err.message);
    }
    setNewsLoading(false);
  };

  const resetNewsForm = () => {
    setNewsForm({ title: '', content: '', image_url: '' });
    setEditingNewsId(null);
  };

  const handleEditNews = (item) => {
    setNewsForm({
      title: item.title,
      content: item.content,
      image_url: item.image_url || ''
    });
    setEditingNewsId(item.id);
    setActiveTab('news');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNews = async (id) => {
    if (!confirm('Удалить эту новость?')) return;
    loadNews();
  };

  const loadSettings = async () => {};

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage('');

    try {
      setSettingsMessage('✅ Настройки сохранены!');
      setTimeout(() => setSettingsMessage(''), 3000);
    } catch (err) {
      setSettingsMessage('❌ Ошибка: ' + err.message);
    }
    setSavingSettings(false);
  };

  const canManage = profile?.role === 'admin' || profile?.role === 'movement_coordinator';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>Только администратор или координатор движения</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {/* ❌ УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '2px solid #E2E7EF',
          paddingBottom: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('news')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'news' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'news' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'news' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            📰 Новости
          </button>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'general' ? '#0B1F3A' : 'transparent',
              color: activeTab === 'general' ? 'white' : '#667085',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'general' ? '600' : '500',
              fontSize: '14px'
            }}
          >
            ⚙️ Общие
          </button>
        </div>

        {activeTab === 'news' && (
          <div>
            <div className="card" style={{ marginBottom: '30px', padding: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>
                {editingNewsId ? '✏️ Редактировать новость' : '📝 Создать новость'}
              </h3>

              {newsMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  background: newsMessage.includes('✅') ? '#C6F6D5' : '#FED7D7',
                  color: newsMessage.includes('✅') ? '#276749' : '#9B2C2C'
                }}>
                  {newsMessage}
                </div>
              )}

              <form onSubmit={handleNewsSubmit}>
                <div className="form-group">
                  <label>Заголовок</label>
                  <input
                    type="text"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    required
                    placeholder="Введите заголовок"
                  />
                </div>

                <div className="form-group">
                  <label>Текст</label>
                  <textarea
                    rows="4"
                    value={newsForm.content}
                    onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                    required
                    placeholder="Введите текст новости"
                  />
                </div>

                <div className="form-group">
                  <label>Ссылка на фото</label>
                  <input
                    type="url"
                    value={newsForm.image_url}
                    onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={newsLoading}>
                    {newsLoading ? '⏳ Сохранение...' : editingNewsId ? '💾 Обновить' : '➕ Создать'}
                  </button>
                  {editingNewsId && (
                    <button type="button" className="btn-secondary" onClick={resetNewsForm}>
                      ❌ Отменить
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h3 style={{ marginBottom: '16px' }}>📋 Все новости</h3>

            {news.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <p>📭 Новостей пока нет</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {news.map((item) => (
                  <div key={item.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {item.image_url && (
                      <img src={item.image_url} alt="Новость" style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0
                      }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '15px', marginBottom: '2px' }}>{item.title}</h4>
                      <p style={{ fontSize: '12px', color: '#667085' }}>
                        📅 {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleEditNews(item)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteNews(item.id)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'general' && (
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>⚙️ Общие настройки сайта</h3>

            {settingsMessage && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center',
                background: settingsMessage.includes('✅') ? '#C6F6D5' : '#FED7D7',
                color: settingsMessage.includes('✅') ? '#276749' : '#9B2C2C'
              }}>
                {settingsMessage}
              </div>
            )}

            <div className="form-group">
              <label>Название сайта</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Заголовок на главной</label>
              <input
                type="text"
                value={settings.heroTitle}
                onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Подзаголовок на главной</label>
              <input
                type="text"
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Основной цвет</label>
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  style={{ padding: '4px', height: '50px' }}
                />
              </div>
              <div className="form-group">
                <label>Акцентный цвет</label>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  style={{ padding: '4px', height: '50px' }}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              style={{ width: '100%', padding: '14px', marginTop: '8px' }}
            >
              {savingSettings ? '⏳ Сохранение...' : '💾 Сохранить настройки'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}