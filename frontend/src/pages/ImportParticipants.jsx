// frontend/src/pages/ImportParticipants.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ImportParticipants() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
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
      setProfile(userData);
    } catch (err) {
      console.error('Ошибка:', err);
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(`✅ Файл выбран: ${selectedFile.name}`);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage('❌ Пожалуйста, выберите файл');
      return;
    }
    setMessage('⏳ Импорт...');
    // TODO: Добавить реальный импорт через API
    setTimeout(() => {
      setMessage('✅ Импорт завершён!');
      setFile(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: '#F4F6F9', minHeight: '100vh' }}>
      <Navigation profile={profile} />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0B1F3A' }}>📥 Импорт участников</h1>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E2E7EF', marginTop: '20px' }}>
          <p style={{ color: '#667085', marginBottom: '16px' }}>Загрузите Excel-файл с данными участников</p>
          {message && <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '16px', background: message.includes('✅') ? '#E8F5EF' : '#FCEBEC', color: message.includes('✅') ? '#16845B' : '#B3262E' }}>{message}</div>}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button onClick={handleImport} disabled={!file} style={{ width: '100%', padding: '12px', marginTop: '16px', background: file ? '#0B1F3A' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: file ? 'pointer' : 'not-allowed' }}>Импортировать</button>
        </div>
      </div>
    </div>
  );
}