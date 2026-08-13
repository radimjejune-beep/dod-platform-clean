// frontend/src/pages/Participants.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Participants() {
  const [profile, setProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [isClubCoordinator, setIsClubCoordinator] = useState(false);
  const [coordinatorClubId, setCoordinatorClubId] = useState(null);
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
      setAllParticipants(participantsData || []);

      const role = userData.role;
      let filtered = [];

      // ============================================================
      // ЛОГИКА ПО РОЛЯМ
      // ============================================================

      if (role === 'participant' || role === 'parent') {
        // УЧАСТНИК и РОДИТЕЛЬ — не видят список участников
        filtered = [];
      } 
      else if (role === 'club_coordinator') {
        // КООРДИНАТОР КЮДА — видит только свой клуб
        setIsClubCoordinator(true);
        
        // Находим клуб координатора через club_coordinators или club_id в users
        let clubId = userData.club_id;
        
        // Если club_id не заполнен, ищем в club_coordinators
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
          setCoordinatorClubId(clubId);
          filtered = participantsData.filter(p => p.club_id === clubId);
        } else {
          filtered = [];
        }
      } 
      else if (role === 'tutor' || 
               role === 'movement_coordinator' || 
               role === 'admin' || 
               role === 'president' || 
               role === 'vice_president') {
        // ТЬЮТОР, КООРДИНАТОР, АДМИН, ПРЕЗИДЕНТ, ВИЦЕ — видят всех
        filtered = participantsData;
      } 
      else {
        filtered = [];
      }

      setParticipants(filtered);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredParticipants = () => {
    let filtered = participants;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filtered = getFilteredParticipants();

  const role = profile?.role;
  const canManage = role === 'admin' || 
                    role === 'movement_coordinator' || 
                    role === 'club_coordinator' ||
                    role === 'tutor';

  const showClubFilter = role === 'admin' || 
                         role === 'movement_coordinator' || 
                         role === 'tutor' ||
                         role === 'president' ||
                         role === 'vice_president';

  // Координатор видит только свой клуб, поэтому фильтр ему не нужен
  const canView = role === 'club_coordinator' || 
                  role === 'tutor' || 
                  role === 'movement_coordinator' || 
                  role === 'admin' || 
                  role === 'president' || 
                  role === 'vice_president';

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

  // ============================================================
  // ПОЛУЧЕНИЕ НАЗВАНИЯ КЛУБА КООРДИНАТОРА
  // ============================================================
  const getCoordinatorClubName = () => {
    if (isClubCoordinator && coordinatorClubId) {
      const club = clubs.find(c => c.id === coordinatorClubId);
      return club?.name || 'Ваш клуб';
    }
    return '';
  };

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
                ? `Участники клуба "${getCoordinatorClubName()}" (${filtered.length})` 
                : `Все участники движения (${filtered.length})`}
            </p>
          </div>
          {showClubFilter && (
            <button
              className="btn-secondary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            >
              {viewMode === 'table' ? '📇 Карточки' : '📋 Таблица'}
            </button>
          )}
        </div>

        {/* ФИЛЬТРЫ И ПОИСК (только для тех, кто видит всех) */}
        {!isClubCoordinator && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Поиск по ФИО, email, школе..."
              />
            </div>

            {showClubFilter && (
              <div style={{ minWidth: '200px' }}>
                <select
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                >
                  <option value="">Все КЮДы</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ fontSize: '14px', color: '#667085', padding: '6px 16px', background: 'white', borderRadius: '8px', border: '1px solid #E2E7EF' }}>
              Найдено: <strong>{filtered.length}</strong> участников
            </div>
          </div>
        )}

        {/* ДЛЯ КООРДИНАТОРА — показываем название его клуба и инфо */}
        {isClubCoordinator && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#FBF4DC',
            borderRadius: '10px',
            border: '1px solid #E8D9A8'
          }}>
            <span style={{ fontSize: '14px', color: '#8A6A00' }}>
              🏫 Вы видите участников только вашего клуба: <strong>{getCoordinatorClubName()}</strong>
            </span>
            <span style={{ fontSize: '13px', color: '#8A6A00', marginLeft: 'auto' }}>
              👥 {filtered.length} участников
            </span>
          </div>
        )}

        {/* ТАБЛИЧНЫЙ ВИД */}
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
                          <div className="avatar avatar-sm">
                            {p.full_name?.charAt(0) || '?'}
                          </div>
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
                        {canManage && (
                          <button
                            style={{
                              padding: '4px 12px',
                              background: '#EAF2FA',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#174A7E',
                              marginLeft: '4px'
                            }}
                            onClick={() => navigate(`/participant/${p.id}/edit`)}
                          >
                            ✏️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* КАРТОЧНЫЙ ВИД (только для тех, у кого есть фильтр) */}
        {viewMode === 'cards' && showClubFilter && !isClubCoordinator && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', padding: '16px' }}
                onClick={() => navigate(`/participant/${p.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div className="avatar">{p.full_name?.charAt(0) || '?'}</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0B1F3A' }}>{p.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#667085' }}>{p.class_name || 'Класс не указан'}</div>
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