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
  const [message, setMessage] = useState('');
  
  // ===== ФИЛЬТРЫ =====
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  
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

      const [participantsData, clubsData] = await Promise.all([
        api.getParticipants(),
        api.getClubs()
      ]);

      setClubs(clubsData || []);

      const role = userData.role;
      let filtered = [];

      if (role === 'club_coordinator') {
        setIsClubCoordinator(true);
        
        // 1. Пробуем получить club_id из профиля
        let clubId = userData.club_id;
        
        // 2. Если нет — ищем в club_coordinators
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
        
        // 3. Фильтруем ТОЛЬКО участников своего клуба
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

    if (searchQuery && searchQuery.trim() !== '') {
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.club_id) {
      filtered = filtered.filter(p => p.club_id === filters.club_id);
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

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

  const handleDelete = async (id, fullName) => {
    if (!confirm(`Удалить участника "${fullName}"?`)) return;
    try {
      await api.deleteUser(id);
      setMessage('✅ Участник удалён');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
    }
  };

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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {message && (
          <div className="message-success" style={{ marginBottom: '16px' }}>
            {message}
          </div>
        )}

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
                gap: '6px', 
                marginTop: '8px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1F3A', marginRight: '4px' }}>
                  📊 Классы:
                </span>
                {Object.entries(classStats).map(([cls, count]) => (
                  <span 
                    key={cls} 
                    style={{
                      fontSize: '13px',
                      padding: '2px 12px',
                      background: selectedClasses.includes(cls) ? '#FBF4DC' : '#F4F6F9',
                      borderRadius: '20px',
                      color: selectedClasses.includes(cls) ? '#8A6A00' : '#667085',
                      cursor: 'pointer',
                      border: selectedClasses.includes(cls) ? '1.5px solid #C9A227' : '1px solid #E2E7EF',
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
                    {cls} <strong style={{ color: selectedClasses.includes(cls) ? '#8A6A00' : '#0B1F3A' }}>{count}</strong>
                  </span>
                ))}
                {selectedClasses.length > 0 && (
                  <button
                    onClick={() => setSelectedClasses([])}
                    style={{
                      fontSize: '12px',
                      padding: '2px 12px',
                      background: '#FCEBEC',
                      border: 'none',
                      borderRadius: '20px',
                      color: '#B3262E',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FED7D7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FCEBEC'}
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
              style={{ padding: '8px 16px', borderRadius: '12px' }}
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            >
              {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
            </button>
          </div>
        </div>

        {/* КРАСИВЫЙ ФИЛЬТР */}
        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setSearchQuery}
          searchPlaceholder="🔍 Поиск по ФИО, email, школе..."
        >
          <div style={{ 
            fontSize: '14px', 
            color: '#667085', 
            padding: '6px 16px', 
            background: '#F8FAFC', 
            borderRadius: '20px',
            border: '1px solid #E2E7EF',
            whiteSpace: 'nowrap'
          }}>
            Найдено: <strong style={{ color: '#0B1F3A' }}>{filtered.length}</strong>
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
                                objectFit: 'cover',
                                border: '2px solid #E2E7EF'
                              }} 
                            />
                          ) : (
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
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
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                          color: p.status === 'active' ? '#16845B' : '#B3262E'
                        }}>
                          {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            style={{
                              padding: '4px 10px',
                              background: '#F4F6F9',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#EAF2FA'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#F4F6F9'}
                            onClick={() => navigate(`/participant/${p.id}`)}
                          >
                            👁️
                          </button>
                          {canEdit && (
                            <button
                              style={{
                                padding: '4px 10px',
                                background: '#EAF2FA',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#174A7E',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#D5E4F0'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#EAF2FA'}
                              onClick={() => navigate(`/participant/${p.id}/edit`)}
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              style={{
                                padding: '4px 10px',
                                background: '#FCEBEC',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#B3262E',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#FED7D7'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#FCEBEC'}
                              onClick={() => handleDelete(p.id, p.full_name)}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{ 
                  cursor: 'pointer', 
                  padding: '20px',
                  borderRadius: '16px',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onClick={() => navigate(`/participant/${p.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(11, 31, 58, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  {p.avatar_url ? (
                    <img 
                      src={p.avatar_url} 
                      alt="Аватар" 
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid #E2E7EF'
                      }} 
                    />
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0B1F3A, #174A7E)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold'
                    }}>
                      {p.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A', fontSize: '16px' }}>{p.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>
                      {p.class_name || 'Класс не указан'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: p.status === 'active' ? '#E8F5EF' : '#FCEBEC',
                    color: p.status === 'active' ? '#16845B' : '#B3262E'
                  }}>
                    {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                  </span>
                  {p.school && (
                    <span style={{
                      padding: '2px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: '#EAF2FA',
                      color: '#174A7E'
                    }}>
                      🏫 {p.school}
                    </span>
                  )}
                  {p.club_name && (
                    <span style={{
                      padding: '2px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: '#FBF4DC',
                      color: '#8A6A00'
                    }}>
                      🏛️ {p.club_name}
                    </span>
                  )}
                </div>
                {(canEdit || canDelete) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px', 
                    display: 'flex', 
                    gap: '4px' 
                  }} onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <button
                        style={{
                          padding: '4px 10px',
                          background: '#EAF2FA',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#D5E4F0'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#EAF2FA'}
                        onClick={() => navigate(`/participant/${p.id}/edit`)}
                      >
                        ✏️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        style={{
                          padding: '4px 10px',
                          background: '#FCEBEC',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#B3262E',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FED7D7'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#FCEBEC'}
                        onClick={() => handleDelete(p.id, p.full_name)}
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