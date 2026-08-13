// frontend/src/components/AvatarUpload.jsx

import { useState, useRef } from 'react';
import { uploadAvatar } from '../lib/api';

export default function AvatarUpload({ currentAvatar, onAvatarUpdated, userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentAvatar);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('❌ Файл слишком большой. Максимум 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('❌ Пожалуйста, выберите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
      handleUpload(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (base64Data) => {
    setLoading(true);
    setError('');

    try {
      const result = await uploadAvatar(base64Data);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (onAvatarUpdated) {
        onAvatarUpdated(result.avatar_url);
      }

      setPreview(result.avatar_url);
    } catch (err) {
      setError('❌ Ошибка загрузки: ' + err.message);
      setPreview(currentAvatar);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '8px'
    }}>
      <div 
        onClick={handleClick}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: preview ? `url(${preview}) center/cover` : '#F4F6F9',
          border: '3px solid #E2E7EF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          color: '#98A2B3',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = '#C9A227';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(201, 162, 39, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#E2E7EF';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {!preview && '📷'}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: 'white',
            fontSize: '14px'
          }}>
            ⏳
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div style={{
          fontSize: '13px',
          color: '#B3262E',
          background: '#FCEBEC',
          padding: '4px 12px',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '6px 16px',
          fontSize: '13px',
          background: 'transparent',
          border: '1.5px solid #D5DCE7',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#0B1F3A',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#C9A227';
          e.currentTarget.style.background = '#FBF4DC';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#D5DCE7';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {loading ? '⏳ Загрузка...' : '📷 Загрузить фото'}
      </button>
    </div>
  );
}