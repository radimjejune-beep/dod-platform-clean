// frontend/src/pages/Profile.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import AvatarUpload from '../components/AvatarUpload';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('main');
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getMe();
      if (data && data.id) {
        setProfile(data);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdated = (newAvatarUrl) => {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
    setMessage('✅ Аватар обновлён!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('success');

    try {
      let phone = profile.phone || '';
      phone = phone.replace(/[^0-9+]/g, '');

      const updateData = {
        full_name: profile.full_name.trim(),
        phone: phone,
        school: profile.school || '',
        class_name: profile.class_name || '',
        interests: profile.interests || '',
        bio: profile.bio || '',
        city: profile.city || '',
        birth_date: profile.birth_date || '',
        social_links: profile.social_links || '',
        skills: profile.skills || '',
        education: profile.education || '',
        achievements: profile.achievements || '',
        telegram: profile.telegram || '',
        vk: profile.vk || ''
      };

      console.log('📤 Отправка данных:', updateData);

      const result = await api.updateProfile(updateData);

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage('✅ Профиль успешно обновлён!');
      setProfile(result);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
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
          <span style={{ fontSize: '32px' }}>👤</span>
          <div>
            <h1>Мой профиль</h1>
            <p>Управление личными данными</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '1px solid #E2E7EF'
          }}>
            <AvatarUpload
              currentAvatar={profile?.avatar_url}
              onAvatarUpdated={handleAvatarUpdated}
              userId={profile?.id}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '24px',
            borderBottom: '2px solid #E2E7EF',
            paddingBottom: '4px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setActiveTab('main')}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === 'main' ? '#0B1F3A' : 'transparent',
                color: activeTab === 'main' ? 'white' : '#667085',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === 'main' ? '600' : '500',
                fontSize: '14px'
              }}
            >
              📋 Основное
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === 'contacts' ? '#0B1F3A' : 'transparent',
                color: activeTab === 'contacts' ? 'white' : '#667085',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === 'contacts' ? '600' : '500',
                fontSize: '14px'
              }}
            >
              📞 Контакты
            </button>
            <button
              onClick={() => setActiveTab('interests')}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === 'interests' ? '#0B1F3A' : 'transparent',
                color: activeTab === 'interests' ? 'white' : '#667085',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === 'interests' ? '600' : '500',
                fontSize: '14px'
              }}
            >
              🎯 Интересы
            </button>
            <button
              onClick={() => setActiveTab('extra')}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: activeTab === 'extra' ? '#0B1F3A' : 'transparent',
                color: activeTab === 'extra' ? 'white' : '#667085',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === 'extra' ? '600' : '500',
                fontSize: '14px'
              }}
            >
              🌟 Дополнительно
            </button>
          </div>

          <form onSubmit={handleSave}>
            {activeTab === 'main' && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>ФИО *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={profile?.full_name || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      style={{ background: '#F4F6F9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Дата рождения</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={profile?.birth_date || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Город</label>
                    <input
                      type="text"
                      name="city"
                      value={profile?.city || ''}
                      onChange={handleChange}
                      placeholder="Москва"
                    />
                  </div>
                  <div className="form-group">
                    <label>Школа</label>
                    <input
                      type="text"
                      name="school"
                      value={profile?.school || ''}
                      onChange={handleChange}
                      placeholder="Школа №1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Класс</label>
                    <input
                      type="text"
                      name="class_name"
                      value={profile?.class_name || ''}
                      onChange={handleChange}
                      placeholder="8А"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile?.phone || ''}
                      onChange={handleChange}
                      placeholder="+7 999 123 45 67"
                    />
                  </div>
                  <div className="form-group">
                    <label>Telegram</label>
                    <input
                      type="text"
                      name="telegram"
                      value={profile?.telegram || ''}
                      onChange={handleChange}
                      placeholder="@username"
                    />
                  </div>
                  <div className="form-group">
                    <label>VK</label>
                    <input
                      type="text"
                      name="vk"
                      value={profile?.vk || ''}
                      onChange={handleChange}
                      placeholder="https://vk.com/id..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Другие соцсети</label>
                    <input
                      type="text"
                      name="social_links"
                      value={profile?.social_links || ''}
                      onChange={handleChange}
                      placeholder="Ссылки через запятую"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interests' && (
              <div>
                <div className="form-group">
                  <label>Интересы</label>
                  <input
                    type="text"
                    name="interests"
                    value={profile?.interests || ''}
                    onChange={handleChange}
                    placeholder="Дипломатия, история, иностранные языки, спорт"
                  />
                </div>
                <div className="form-group">
                  <label>Навыки</label>
                  <input
                    type="text"
                    name="skills"
                    value={profile?.skills || ''}
                    onChange={handleChange}
                    placeholder="Публичные выступления, переговоры, английский язык"
                  />
                </div>
              </div>
            )}

            {activeTab === 'extra' && (
              <div>
                <div className="form-group">
                  <label>О себе</label>
                  <textarea
                    name="bio"
                    rows="4"
                    value={profile?.bio || ''}
                    onChange={handleChange}
                    placeholder="Расскажите о себе, своих целях и увлечениях..."
                  />
                </div>
                <div className="form-group">
                  <label>Дополнительное образование</label>
                  <textarea
                    name="education"
                    rows="3"
                    value={profile?.education || ''}
                    onChange={handleChange}
                    placeholder="Курсы, кружки, секции..."
                  />
                </div>
                <div className="form-group">
                  <label>Личные достижения</label>
                  <textarea
                    name="achievements"
                    rows="3"
                    value={profile?.achievements || ''}
                    onChange={handleChange}
                    placeholder="Ваши основные достижения..."
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}