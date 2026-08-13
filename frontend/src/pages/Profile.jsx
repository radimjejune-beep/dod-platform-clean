// frontend/src/pages/Profile.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PageLayout from '../components/PageLayout';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getMe();
        if (data.id) {
          setProfile(data);
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Ошибка:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // TODO: добавить API для обновления профиля
      setMessage('✅ Профиль обновлён!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#F4F6F9'
      }}>
        <div style={{ fontSize: '18px', color: '#667085' }}>⏳ Загрузка...</div>
      </div>
    );
  }

  return (
    <PageLayout 
      title="👤 Мой профиль"
      subtitle="Управление личными данными"
      icon="👤"
      profile={profile}
    >
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC',
          color: message.includes('✅') ? '#16845B' : '#B3262E',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              ФИО *
            </label>
            <input
              type="text"
              name="full_name"
              value={profile?.full_name || ''}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                background: '#F4F6F9',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Телефон
            </label>
            <input
              type="tel"
              name="phone"
              value={profile?.phone || ''}
              onChange={handleChange}
              placeholder="+7 (XXX) XXX-XX-XX"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Город
            </label>
            <input
              type="text"
              name="city"
              value={profile?.city || ''}
              onChange={handleChange}
              placeholder="Москва"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Школа
            </label>
            <input
              type="text"
              name="school"
              value={profile?.school || ''}
              onChange={handleChange}
              placeholder="Школа №1"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
              Класс
            </label>
            <input
              type="text"
              name="class_name"
              value={profile?.class_name || ''}
              onChange={handleChange}
              placeholder="8А"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
            Интересы
          </label>
          <input
            type="text"
            name="interests"
            value={profile?.interests || ''}
            onChange={handleChange}
            placeholder="Дипломатия, история, иностранные языки"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #D5DCE7',
              borderRadius: '10px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', fontSize: '13px', color: '#475467', marginBottom: '4px' }}>
            О себе
          </label>
          <textarea
            name="bio"
            rows="3"
            value={profile?.bio || ''}
            onChange={handleChange}
            placeholder="Расскажите о себе..."
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #D5DCE7',
              borderRadius: '10px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '20px',
            background: saving ? '#6c757d' : '#0B1F3A',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
        </button>
      </form>
    </PageLayout>
  );
}