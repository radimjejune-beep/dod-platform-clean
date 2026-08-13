// frontend/src/pages/Profile.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import AvatarUpload from '../components/AvatarUpload'; // 👈 ДОБАВИТЬ

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
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

  // 👈 ДОБАВИТЬ: обработчик обновления аватара
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
        city: profile.city || ''
      };

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
          {/* 👇 АВАТАР */}
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

          <form onSubmit={handleSave}>
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

            <div className="form-group">
              <label>Интересы</label>
              <input
                type="text"
                name="interests"
                value={profile?.interests || ''}
                onChange={handleChange}
                placeholder="Дипломатия, история, иностранные языки"
              />
            </div>

            <div className="form-group">
              <label>О себе</label>
              <textarea
                name="bio"
                rows="3"
                value={profile?.bio || ''}
                onChange={handleChange}
                placeholder="Расскажите о себе..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}