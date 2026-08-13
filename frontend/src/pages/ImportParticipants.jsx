// frontend/src/pages/ImportParticipants.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import * as XLSX from 'xlsx';

export default function ImportParticipants() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [importedUsers, setImportedUsers] = useState([]);
  const [showPasswordList, setShowPasswordList] = useState(false);
  const [clubs, setClubs] = useState([]);
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

      const clubsData = await api.getClubs();
      setClubs(clubsData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFile(file);
    setPreviewData([]);
    setMessage('');
    setImportedUsers([]);
    setShowPasswordList(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const requiredColumns = ['full_name', 'email'];
        const firstRow = jsonData[0] || {};
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          setMessage(`❌ В файле отсутствуют колонки: ${missingColumns.join(', ')}`);
          setMessageType('error');
          return;
        }

        const formattedData = jsonData.map((row, index) => ({
          index: index + 1,
          full_name: row.full_name || '',
          email: row.email || '',
          phone: row.phone || '',
          school: row.school || '',
          class_name: row.class_name || '',
          club: row.club || row.club_name || '',
          birth_date: row.birth_date || '',
          role: row.role || 'participant'
        }));

        setPreviewData(formattedData);
        setMessage(`✅ Загружено ${formattedData.length} записей. Проверьте данные и нажмите "Импортировать".`);
        setMessageType('success');
      } catch (err) {
        setMessage('❌ Ошибка чтения файла: ' + err.message);
        setMessageType('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      setMessage('❌ Нет данных для импорта');
      setMessageType('error');
      return;
    }

    if (!confirm(`Импортировать ${previewData.length} участников?`)) return;

    setLoading(true);
    setMessage('');
    setImportedUsers([]);
    let successCount = 0;
    const errorList = [];

    const clubsMap = {};
    clubs.forEach(c => {
      clubsMap[c.name.toLowerCase()] = c.id;
    });

    const usersList = [];

    for (const row of previewData) {
      try {
        // Проверяем, существует ли пользователь
        const existingUsers = await api.getUsers();
        const existing = existingUsers.find(u => u.email === row.email);

        if (existing) {
          errorList.push(`⚠️ ${row.full_name} (${row.email}) — уже существует`);
          continue;
        }

        const tempPassword = Math.random().toString(36).slice(-8) + '!';

        let clubId = null;
        if (row.club) {
          const clubName = row.club.toLowerCase();
          if (clubsMap[clubName]) {
            clubId = clubsMap[clubName];
          } else {
            const foundClub = clubs.find(c => 
              c.name.toLowerCase().includes(clubName) || 
              clubName.includes(c.name.toLowerCase())
            );
            if (foundClub) {
              clubId = foundClub.id;
            }
          }
        }

        const result = await api.createUser({
          full_name: row.full_name,
          email: row.email,
          role: row.role || 'participant',
          phone: row.phone || '',
          school: row.school || '',
          class_name: row.class_name || '',
          club_id: clubId || ''
        });

        if (result.error) {
          errorList.push(`❌ ${row.full_name} (${row.email}) — ${result.error}`);
          continue;
        }

        usersList.push({
          full_name: row.full_name,
          email: row.email,
          password: tempPassword,
          role: row.role || 'participant'
        });

        successCount++;
      } catch (err) {
        errorList.push(`❌ ${row.full_name} (${row.email}) — ${err.message}`);
      }
    }

    setImportedUsers(usersList);

    if (usersList.length > 0) {
      setShowPasswordList(true);
    }

    if (errorList.length === 0) {
      setMessage(`✅ Успешно импортировано ${successCount} участников!`);
      setMessageType('success');
    } else {
      setMessage(`⚠️ Импортировано: ${successCount}, Ошибок: ${errorList.length}`);
      setMessageType('error');
    }

    setLoading(false);
  };

  const copyPasswords = () => {
    let text = '=== ДАННЫЕ ДЛЯ ВХОДА (ИМПОРТ) ===\n\n';
    importedUsers.forEach(u => {
      text += `ФИО: ${u.full_name}\nEmail: ${u.email}\nПароль: ${u.password}\nРоль: ${u.role}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setMessage('✅ Данные скопированы!');
    setMessageType('success');
    setTimeout(() => setMessage(''), 3000);
  };

  const downloadTemplate = () => {
    const template = [
      {
        full_name: 'Иванов Иван Иванович',
        email: 'ivan@example.com',
        phone: '+7 (999) 123-45-67',
        school: 'Школа №1',
        class_name: '8А',
        club: 'КЮД Москва',
        birth_date: '2010-01-15',
        role: 'participant'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Участники');
    
    ws['!cols'] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.writeFile(wb, 'Шаблон_импорта_участников.xlsx');
  };

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📥</span>
          <div>
            <h1>Импорт участников</h1>
            <p>Загрузите Excel-файл с данными участников для массового добавления</p>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* СПИСОК ПАРОЛЕЙ */}
        {showPasswordList && importedUsers.length > 0 && (
          <div className="card" style={{ 
            background: '#FBF4DC',
            border: '2px solid #C9A227',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0B1F3A' }}>
                🔑 Данные для входа (Импорт)
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={copyPasswords}>
                  📋 Скопировать все
                </button>
                <button className="btn-secondary" onClick={() => setShowPasswordList(false)}>
                  ✖ Закрыть
                </button>
              </div>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#F4F6F9' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>ФИО</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Пароль</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Роль</th>
                  </tr>
                </thead>
                <tbody>
                  {importedUsers.map((u, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #E2E7EF' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{u.full_name}</td>
                      <td style={{ padding: '8px 12px' }}>{u.email}</td>
                      <td>
                        <code style={{
                          background: '#F4F6F9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0B1F3A'
                        }}>
                          {u.password}
                        </code>
                      </td>
                      <td>{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '12px', padding: '12px', background: '#EAF2FA', borderRadius: '8px', fontSize: '13px', color: '#174A7E' }}>
              💡 Скопируйте данные и разошлите пользователям. Пароли можно изменить при первом входе.
            </div>
          </div>
        )}

        {/* ШАГ 1: СКАЧАТЬ ШАБЛОН */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
            📋 Шаг 1: Скачайте шаблон
          </h3>
          <p style={{ color: '#667085', marginBottom: '12px' }}>
            Скачайте шаблон Excel-файла с правильной структурой колонок
          </p>
          <button className="btn-primary" onClick={downloadTemplate}>
            📥 Скачать шаблон
          </button>
        </div>

        {/* ШАГ 2: ЗАГРУЗИТЬ ФАЙЛ */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
            📤 Шаг 2: Загрузите файл
          </h3>
          <p style={{ color: '#667085', marginBottom: '12px' }}>
            Загрузите заполненный Excel-файл (.xlsx или .xls)
          </p>
          <div style={{
            border: '2px dashed #D5DCE7',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            background: '#F8FAFC',
            transition: 'all 0.2s'
          }}
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
              const input = document.getElementById('fileInput');
              const dt = new DataTransfer();
              dt.items.add(file);
              input.files = dt.files;
              handleFileUpload({ target: input });
            }
          }}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📂</div>
            <p style={{ color: '#667085', marginBottom: '8px' }}>
              Перетащите файл сюда или нажмите для выбора
            </p>
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              className="btn-secondary"
              onClick={() => document.getElementById('fileInput').click()}
            >
              Выбрать файл
            </button>
            {file && (
              <div style={{ marginTop: '12px', color: '#16845B' }}>
                ✅ Файл выбран: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>
        </div>

        {/* ШАГ 3: ПРОВЕРКА ДАННЫХ */}
        {previewData.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                📊 Шаг 3: Проверка данных
              </h3>
              <span style={{ fontSize: '14px', color: '#667085' }}>
                {previewData.length} записей
              </span>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F4F6F9' }}>
                    <th style={{ padding: '8px 12px' }}>#</th>
                    <th style={{ padding: '8px 12px' }}>ФИО</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Школа</th>
                    <th style={{ padding: '8px 12px' }}>Класс</th>
                    <th style={{ padding: '8px 12px' }}>Клуб</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row) => (
                    <tr key={row.index} style={{ borderBottom: '1px solid #F4F6F9' }}>
                      <td style={{ padding: '8px 12px' }}>{row.index}</td>
                      <td style={{ padding: '8px 12px' }}>{row.full_name}</td>
                      <td style={{ padding: '8px 12px' }}>{row.email}</td>
                      <td style={{ padding: '8px 12px' }}>{row.school}</td>
                      <td style={{ padding: '8px 12px' }}>{row.class_name}</td>
                      <td style={{ padding: '8px 12px' }}>{row.club || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 20 && (
                <div style={{ padding: '8px', textAlign: 'center', color: '#98A2B3' }}>
                  ... и еще {previewData.length - 20} записей
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                className="btn-success"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? '⏳ Импорт...' : '✅ Импортировать всех'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setPreviewData([]);
                  setFile(null);
                  document.getElementById('fileInput').value = '';
                  setMessage('');
                  setImportedUsers([]);
                  setShowPasswordList(false);
                }}
              >
                ❌ Очистить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}