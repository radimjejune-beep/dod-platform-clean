// frontend/src/pages/Participants.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';

export default function Participants() {
  const [profile, setProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [isClubCoordinator, setIsClubCoordinator] = useState(false);
  
  // ===== ФИЛЬТРЫ =====
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // Получаем уникальные классы
  const getUniqueClasses = () => {
    const classes = allParticipants
      .map(p => p.class_name)
      .filter(Boolean);
    return [...new Set(classes)].sort();
  };

  const classes = getUniqueClasses();

  // Статистика по классам
  const getClassStats = () => {
    const stats = {};
    classes.forEach(cls => {
      stats[cls] = allParticipants.filter(p => p.class_name === cls).length;
    });
    return stats;
  };

  const classStats = getClassStats();

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const [participantsData, clubsData] = await Promise.all([
        api.getParticipants(),
        api.getClubs()
      ]);

      console.log('📥 Загружено участников:', participantsData?.length || 0);
      console.log('📥 Загружено клубов:', clubsData?.length || 0);

      setClubs(clubsData || []);

      const role = userData.role;
      let filtered = [];

      if (role === 'club_coordinator') {
        setIsClubCoordinator(true);
        let clubId = userData.club_id;
        if (!clubId) {
          try {
            const coordResponse = await fetch(`https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${userData.id}`);
            const coordData = await coordResponse.json();
            if (coordData && coordData.length > 0) {
              clubId = coordData[0].club_id;
            }
          } catch (e) {
            console.log('Ошибка получения координатора:', e);
          }
        }
        if (clubId) {
          filtered = participantsData.filter(p => p.club_id === clubId);
        } else {
          filtered = [];
        }
      } else if (['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'].includes(role)) {
        filtered = participantsData;
      } else {
        filtered = [];
      }

      setAllParticipants(filtered);
      setParticipants(filtered);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== ФИЛЬТРАЦИЯ =====
  const filterConfig = [
    {
      key: 'club_id',
      type: 'select',
      label: 'Клуб',
      placeholder: 'Все КЮДы',
      options: clubs.map(c => ({ value: c.id, label: c.name }))
    },
    {
      key: 'status',
      type: 'select',
      label: 'Статус',
      placeholder: 'Все статусы',
      options: [
        { value: 'active', label: '🟢 Активен' },
        { value: 'inactive', label: '🔴 Неактивен' },
        { value: 'pending', label: '⏳ Ожидает' }
      ]
    }
  ];

  const getFilteredParticipants = () => {
    let filtered = allParticipants;

    // ПОИСК
    if (searchQuery && searchQuery.trim() !== '') {
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ФИЛЬТР ПО КЛУБУ
    if (filters.club_id) {
      filtered = filtered.filter(p => p.club_id === filters.club_id);
    }

    // ФИЛЬТР ПО СТАТУСУ
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // ФИЛЬТР ПО КЛАССАМ
    if (selectedClasses.length > 0) {
      filtered = filtered.filter(p => selectedClasses.includes(p.class_name));
    }

    return filtered;
  };

  const filtered = getFilteredParticipants();

  const role = profile?.role;
  const canView = ['club_coordinator', 'tutor', 'movement_coordinator', 'admin', 'president', 'vice_president'].includes(role);
  const canEdit = ['admin', 'movement_coordinator'].includes(role);
  const canDelete = ['admin'].includes(role);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
            <p style={{ color: '#667085' }}>Только координаторы, тьюторы и администраторы</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>👥</span>
          <div>
            <h1>Участники</h1>
            <p>
              {isClubCoordinator 
                ? `Участники вашего клуба (${filtered.length})` 
                : `Все участники движения (${filtered.length})`}
            </p>
            {/* СТАТИСТИКА ПО КЛАССАМ */}
            {!isClubCoordinator && classes.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px', 
                marginTop: '8px',
                padding: '8px 12px',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E7EF'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1F3A' }}>
                  📊 Статистика по классам:
                </span>
                {Object.entries(classStats).map(([cls, count]) => (
                  <span key={cls} style={{
                    fontSize: '13px',
                    padding: '2px 10px',
                    background: selectedClasses.includes(cls) ? '#FBF4DC' : '#F4F6F9',
                    borderRadius: '12px',
                    color: selectedClasses.includes(cls) ? '#8A6A00' : '#667085',
                    cursor: 'pointer',
                    border: selectedClasses.includes(cls) ? '1px solid #C9A227' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (selectedClasses.includes(cls)) {
                      setSelectedClasses(selectedClasses.filter(c => c !== cls));
                    } else {
                      setSelectedClasses([...selectedClasses, cls]);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedClasses.includes(cls)) {
                      e.currentTarget.style.background = '#EAF2FA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedClasses.includes(cls)) {
                      e.currentTarget.style.background = '#F4F6F9';
                    }
                  }}
                  >
                    {cls}: <strong>{count}</strong>
                  </span>
                ))}
                {selectedClasses.length > 0 && (
                  <button
                    onClick={() => setSelectedClasses([])}
                    style={{
                      fontSize: '12px',
                      padding: '2px 10px',
                      background: '#FCEBEC',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#B3262E',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Очистить
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            >
              {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
            </button>
          </div>
        </div>

        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setSearchQuery}
          searchPlaceholder="🔍 Поиск по ФИО, email, школе..."
          classFilter={true}
          classes={classes}
          selectedClasses={selectedClasses}
          onClassFilterChange={setSelectedClasses}
        >
          <div style={{ fontSize: '14px', color: '#667085', padding: '6px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
            Найдено: <strong>{filtered.length}</strong>
          </div>
        </FilterBar>

        {/* ТАБЛИЦА */}
        {viewMode === 'table' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Класс</th>
                  <th>Школа</th>
                  <th>Клуб</th>
                  <th>Статус</th>
                  <th style={{ textAlign: 'center' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>👀</div>
                      {isClubCoordinator ? 'В вашем клубе пока нет участников' : 'Участников не найдено'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '500', color: '#0B1F3A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {p.avatar_url ? (
                            <img 
                              src={p.avatar_url} 
                              alt="Аватар" 
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                objectFit: 'cover' 
                              }} 
                            />
                          ) : (
                            <div className="avatar avatar-sm">
                              {p.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          {p.full_name}
                        </div>
                      </td>
                      <td style={{ color: '#667085' }}>{p.class_name || '—'}</td>
                      <td style={{ color: '#667085' }}>{p.school || '—'}</td>
                      <td style={{ color: '#667085' }}>{p.club_name || '—'}</td>
                      <td>
                        <span className={p.status === 'active' ? 'status-active' : 'status-inactive'}>
                          {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            style={{
                              padding: '4px 8px',
                              background: '#F4F6F9',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                            onClick={() => navigate(`/participant/${p.id}`)}
                          >
                            👁️
                          </button>
                          {canEdit && (
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#EAF2FA',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#174A7E'
                              }}
                              onClick={() => navigate(`/participant/${p.id}/edit`)}
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              style={{
                                padding: '4px 8px',
                                background: '#FCEBEC',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#B3262E'
                              }}
                              onClick={async () => {
                                if (confirm(`Удалить участника "${p.full_name}"?`)) {
                                  try {
                                    await api.deleteUser(p.id);
                                    setMessage('✅ Участник удалён');
                                    loadData();
                                  } catch (err) {
                                    setMessage('❌ Ошибка: ' + err.message);
                                  }
                                }
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* КАРТОЧКИ */}
        {viewMode === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', padding: '16px', position: 'relative' }}
                onClick={() => navigate(`/participant/${p.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {p.avatar_url ? (
                    <img 
                      src={p.avatar_url} 
                      alt="Аватар" 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  ) : (
                    <div className="avatar">{p.full_name?.charAt(0) || '?'}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>{p.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      {p.class_name || 'Класс не указан'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span className={p.status === 'active' ? 'status-active' : 'status-inactive'}>
                    {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                  </span>
                  {p.school && (
                    <span className="tag tag-blue">🏫 {p.school}</span>
                  )}
                  {p.club_name && (
                    <span className="tag tag-gold">🏫 {p.club_name}</span>
                  )}
                </div>
                {(canEdit || canDelete) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '8px', 
                    right: '8px', 
                    display: 'flex', 
                    gap: '4px' 
                  }} onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <button
                        style={{
                          padding: '4px 8px',
                          background: '#EAF2FA',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onClick={() => navigate(`/participant/${p.id}/edit`)}
                      >
                        ✏️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        style={{
                          padding: '4px 8px',
                          background: '#FCEBEC',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#B3262E'
                        }}
                        onClick={async () => {
                          if (confirm(`Удалить участника "${p.full_name}"?`)) {
                            try {
                              await api.deleteUser(p.id);
                              loadData();
                            } catch (err) {
                              alert('Ошибка: ' + err.message);
                            }
                          }
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}