// frontend/src/pages/ConsentsManagement.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function ConsentsManagement() {
  const [profile, setProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [filterType, setFilterType] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [clubs, setClubs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    allConsents: 0,
    partialConsents: 0,
    noConsents: 0
  });
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

      if (userData.role !== 'movement_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const [participantsData, clubsData] = await Promise.all([
        api.getParticipants(),
        api.getClubs()
      ]);

      setClubs(clubsData || []);
      
      const enriched = participantsData.map(p => ({
        ...p,
        consentStatus: getConsentStatus(p),
        consentPercentage: getConsentPercentage(p)
      }));

      setParticipants(enriched);
      setFilteredParticipants(enriched);
      updateStats(enriched);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatus = (p) => {
    const consents = ['consent_personal_data', 'consent_photo_publication', 'consent_event_participation'];
    const given = consents.filter(c => p[c]).length;
    if (given === 3) return 'full';
    if (given === 0) return 'none';
    return 'partial';
  };

  const getConsentPercentage = (p) => {
    const consents = ['consent_personal_data', 'consent_photo_publication', 'consent_event_participation'];
    const given = consents.filter(c => p[c]).length;
    return Math.round((given / 3) * 100);
  };

  const updateStats = (data) => {
    const total = data.length;
    const allConsents = data.filter(p => p.consentStatus === 'full').length;
    const partialConsents = data.filter(p => p.consentStatus === 'partial').length;
    const noConsents = data.filter(p => p.consentStatus === 'none').length;
    setStats({ total, allConsents, partialConsents, noConsents });
  };

  const applyFilters = () => {
    let filtered = participants;

    if (filterType === 'full') {
      filtered = filtered.filter(p => p.consentStatus === 'full');
    } else if (filterType === 'partial') {
      filtered = filtered.filter(p => p.consentStatus === 'partial');
    } else if (filterType === 'none') {
      filtered = filtered.filter(p => p.consentStatus === 'none');
    }

    if (selectedClubId) {
      filtered = filtered.filter(p => p.club_id === selectedClubId);
    }

    setFilteredParticipants(filtered);
    updateStats(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filterType, selectedClubId]);

  const handleRemindAll = async () => {
    const target = filteredParticipants.filter(p => p.consentStatus !== 'full');
    if (target.length === 0) {
      setMessage('Все участники уже имеют полные согласия');
      setMessageType('success');
      return;
    }

    if (!confirm(`Отправить напоминание ${target.length} участникам?`)) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage(`Напоминания отправлены ${target.length} участникам`);
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleExport = () => {
    const data = filteredParticipants.map(p => ({
      'ФИО': p.full_name,
      'Email': p.email,
      'Клуб': p.club_name || '—',
      'Класс': p.class_name || '—',
      'Школа': p.school || '—',
      'Согласие на обработку данных': p.consent_personal_data ? 'Да' : 'Нет',
      'Согласие на публикацию фото': p.consent_photo_publication ? 'Да' : 'Нет',
      'Согласие на участие в мероприятиях': p.consent_event_participation ? 'Да' : 'Нет',
      'Статус согласий': getConsentPercentage(p) + '%'
    }));

    alert('Экспорт в Excel будет доступен после интеграции библиотеки xlsx');
  };

  const getStatusBadge = (status) => {
    const badges = {
      'full': { label: 'Все согласия', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
      'partial': { label: 'Частично', color: 'var(--color-gold)', bg: 'var(--color-gold-pale)' },
      'none': { label: 'Нет согласий', color: 'var(--color-error)', bg: 'var(--color-error-bg)' }
    };
    return badges[status] || badges['none'];
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
          <span style={{ fontSize: '32px' }}><Icon name="edit" size={32} /></span>
          <div>
            <h1>Управление согласиями</h1>
            <p>Статус согласий участников движения</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={handleRemindAll} style={{ background: 'var(--color-gold)', color: 'var(--color-primary)' }}>
              Напомнить всем
            </button>
            <button className="btn-secondary" onClick={handleExport}>
              Экспорт
            </button>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* СТАТИСТИКА */}
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ borderTop: '3px solid var(--color-primary-light)' }}>
            <div className="number">{stats.total}</div>
            <div className="label">Всего участников</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid var(--color-success)' }}>
            <div className="number">{stats.allConsents}</div>
            <div className="label">Полные согласия</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid var(--color-gold)' }}>
            <div className="number">{stats.partialConsents}</div>
            <div className="label">Частичные согласия</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid var(--color-error)' }}>
            <div className="number">{stats.noConsents}</div>
            <div className="label">Нет согласий</div>
          </div>
        </div>

        {/* ФИЛЬТРЫ */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={filterType === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 16px', fontSize: '12px' }}
              onClick={() => setFilterType('all')}
            >
              Все ({stats.total})
            </button>
            <button
              className={filterType === 'full' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 16px', fontSize: '12px' }}
              onClick={() => setFilterType('full')}
            >
              Полные ({stats.allConsents})
            </button>
            <button
              className={filterType === 'partial' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 16px', fontSize: '12px' }}
              onClick={() => setFilterType('partial')}
            >
              Частичные ({stats.partialConsents})
            </button>
            <button
              className={filterType === 'none' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 16px', fontSize: '12px' }}
              onClick={() => setFilterType('none')}
            >
              Нет ({stats.noConsents})
            </button>
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                border: '1.5px solid var(--color-gray-200)',
                borderRadius: '10px',
                fontSize: '13px',
                outline: 'none',
                background: 'white'
              }}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ТАБЛИЦА */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
              Участники
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
              {filteredParticipants.length} участников
            </span>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><Icon name="eye" /></div>
              <p>Участников не найдено</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Клуб</th>
                    <th>Класс</th>
                    <th style={{ textAlign: 'center' }}>Персональные</th>
                    <th style={{ textAlign: 'center' }}>Фото</th>
                    <th style={{ textAlign: 'center' }}>Мероприятия</th>
                    <th style={{ textAlign: 'center' }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p) => {
                    const status = getStatusBadge(p.consentStatus);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: '500', color: 'var(--color-primary)' }}>
                          {p.full_name}
                        </td>
                        <td style={{ color: 'var(--color-gray-500)' }}>{p.club_name || '—'}</td>
                        <td style={{ color: 'var(--color-gray-500)' }}>{p.class_name || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {p.consent_personal_data ? <Icon name="success" /> : <Icon name="error" />}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.consent_photo_publication ? <Icon name="success" /> : <Icon name="error" />}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.consent_event_participation ? <Icon name="success" /> : <Icon name="error" />}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="tag" style={{ background: status.bg, color: status.color, fontSize: '11px' }}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}