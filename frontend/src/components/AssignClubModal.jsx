// frontend/src/components/AssignClubModal.jsx

import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function AssignClubModal({ 
  isOpen, 
  onClose, 
  userId, 
  userFullName, 
  currentClubId,
  onAssigned 
}) {
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(currentClubId || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    if (isOpen) {
      loadClubs();
    }
  }, [isOpen]);

  const loadClubs = async () => {
    try {
      const data = await api.getClubs();
      setClubs(data || []);
    } catch (err) {
      console.error('Ошибка загрузки клубов:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedClubId) {
      setMessage('❌ Выберите КЮД');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await api.assignUserToClub(userId, selectedClubId);
      if (result.error) throw new Error(result.error);

      setMessage(`✅ ${userFullName} прикреплён к КЮДУ!`);
      setMessageType('success');
      
      // Обновляем данные
      if (onAssigned) onAssigned();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(11, 31, 58, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
          📌 Прикрепить к КЮДу
        </h3>
        <p style={{ color: '#667085', marginBottom: '16px', fontSize: '14px' }}>
          Пользователь: <strong>{userFullName}</strong>
        </p>

        {message && (
          <div
            className={messageType === 'success' ? 'message-success' : 'message-error'}
            style={{ marginBottom: '16px' }}
          >
            {message}
          </div>
        )}

        <div className="form-group">
          <label>Выберите КЮД</label>
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #D5DCE7',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              background: 'white'
            }}
          >
            <option value="">— Выберите КЮД —</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} ({club.city || 'Город не указан'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            className="btn-success"
            onClick={handleAssign}
            disabled={loading || !selectedClubId}
            style={{ flex: 1 }}
          >
            {loading ? '⏳ Сохранение...' : '✅ Прикрепить'}
          </button>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ background: '#F4F6F9', color: '#0B1F3A', border: '1px solid #D5DCE7' }}
          >
            ❌ Отмена
          </button>
        </div>

        {currentClubId && (
          <div style={{ marginTop: '12px', padding: '8px 12px', background: '#FBF4DC', borderRadius: '8px', fontSize: '13px', color: '#8A6A00' }}>
            📌 Текущий КЮД: {clubs.find(c => c.id === currentClubId)?.name || 'Не указан'}
          </div>
        )}
      </div>
    </div>
  );
}