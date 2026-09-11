// frontend/src/components/AvatarUpload.jsx

import { useState, useRef } from 'react';
import api from '../lib/api';
import Icon from './Icon';

// size — диаметр кружка, hint — показывать ли подпись о размере файла.
// В шапке профиля подпись не нужна: она серая по тёмно-синему и налезала
// на имя, потому что размер аватара там ограничивали снаружи, а
// содержимое об этом не знало.
export default function AvatarUpload({ currentAvatar, onAvatarUpdated, userId, size = 120, hint = true }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(currentAvatar || null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ============================================================
    // ОГРАНИЧЕНИЕ РАЗМЕРА — МАКСИМУМ 500KB
    // ============================================================
    const MAX_SIZE = 500 * 1024; // 500KB
    
    if (file.size > MAX_SIZE) {
      setError(`Файл слишком большой! Максимум ${MAX_SIZE / 1024} KB. Сожмите изображение.`);
      setTimeout(() => setError(''), 4000);
      return;
    }

    // ============================================================
    // ОГРАНИЧЕНИЕ ТИПА ФАЙЛА
    // ============================================================
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ============================================================
      // СЖАТИЕ ИЗОБРАЖЕНИЯ ПЕРЕД ЗАГРУЗКОЙ
      // ============================================================
      const compressedBase64 = await compressImage(file, 200, 200, 0.7);
      
      // Загружаем на сервер
      const result = await api.uploadAvatar(compressedBase64);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Обновляем preview (не сохраняем в localStorage!)
      setPreview(result.avatar_url);
      
      // Сохраняем только ссылку в localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.avatar_url = result.avatar_url;
      localStorage.setItem('user', JSON.stringify(user));
      
      if (onAvatarUpdated) {
        onAvatarUpdated(result.avatar_url);
      }

      alert('Аватар обновлён!');

    } catch (err) {
      console.error('Ошибка загрузки аватара:', err);
      setError('Ошибка загрузки: ' + err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ФУНКЦИЯ СЖАТИЯ ИЗОБРАЖЕНИЯ
  // ============================================================
  const compressImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          // Вычисляем новые размеры
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Создаём canvas и сжимаем
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Конвертируем в JPEG с качеством quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        onClick={handleClick}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          flexShrink: 0,
          cursor: 'pointer',
          overflow: 'hidden',
          border: '3px solid var(--color-gold)',
          background: 'var(--color-gray-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-gold-light)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-gold)'}
      >
        {loading ? (
          <div className="spinner" style={{ width: '30px', height: '30px' }} />
        ) : preview ? (
          <img
            src={preview}
            alt="Аватар"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <Icon name="user" size={Math.round(size * 0.4)} style={{ color: 'var(--color-gray-400)' }} />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            background: 'rgba(11, 31, 58, 0.7)',
            color: 'white',
            fontSize: '10px',
            padding: '4px',
            textAlign: 'center'
          }}
        >
          {loading ? 'Загрузка...' : 'Изменить'}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{ color: 'var(--color-error)', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
          {error}
        </div>
      )}

      {hint && (
        <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', textAlign: 'center' }}>
          Максимум 500KB<br />
          Рекомендуемый размер: 200×200
        </div>
      )}
    </div>
  );
}