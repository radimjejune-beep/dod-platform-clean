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

    console.log('🔍 Фильтрация участников:', {
      allParticipants: allParticipants.length,
      searchQuery,
      filters
    });

    // ПОИСК
    if (searchQuery && searchQuery.trim() !== '') {
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('🔍 После поиска:', filtered.length);
    }

    // ФИЛЬТР ПО КЛУБУ
    if (filters.club_id) {
      filtered = filtered.filter(p => p.club_id === filters.club_id);
      console.log('🏫 После фильтра по клубу:', filtered.length);
    }

    // ФИЛЬТР ПО СТАТУСУ
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
      console.log('📊 После фильтра по статусу:', filtered.length);
    }

    return filtered;
  };

  const filtered = getFilteredParticipants();

  const role = profile?.role;
  const canView = ['club_coordinator', 'tutor', 'movement_coordinator', 'admin', 'president', 'vice_president'].includes(role);

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
          </div>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
          >
            {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
          </button>
        </div>

        {/* ФИЛЬТРЫ */}
        <FilterBar
          filters={filterConfig}
          onFilterChange={(newFilters) => {
            console.log('📊 Фильтры изменены:', newFilters);
            setFilters(newFilters);
          }}
          onSearchChange={(query) => {
            console.log('🔍 Поиск изменён:', query);
            setSearchQuery(query);
          }}
          searchPlaceholder="🔍 Поиск по ФИО, email, школе..."
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
                        <button
                          style={{
                            padding: '4px 12px',
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
                style={{ cursor: 'pointer', padding: '16px' }}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}