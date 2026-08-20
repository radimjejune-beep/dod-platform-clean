// frontend/src/pages/Participants.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import FilterBar from '../components/FilterBar';
import Footer from '../components/Footer';

export default function Participants() {
  const [profile, setProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [isClubCoordinator, setIsClubCoordinator] = useState(false);
  const [message, setMessage] = useState('');
  
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
          console.log(`👥 Координатор КЮДа: показано ${filtered.length} участников своего клуба`);
        } else {
          filtered = [];
          console.log('❌ Координатор КЮДа: клуб не найден');
        }
        
      } else if (['admin', 'movement_coordinator', 'tutor', 'president', 'vice_president'].includes(role)) {
        filtered = participantsData;
        console.log(`👥 ${role}: показано ${filtered.length} участников`);
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

  const getUniqueClasses = () => {
    const classes = allParticipants
      .map(p => p.class_name)
      .filter(Boolean);
    return [...new Set(classes)].sort();
  };

  const classes = getUniqueClasses();

  const getClassStats = () => {
    const stats = {};
    classes.forEach(cls => {
      stats[cls] = allParticipants.filter(p => p.class_name === cls).length;
    });
    return stats;
  };

  const classStats = getClassStats();

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
      <div className="page-loading">
        <div className="spinner" />
        <style>{`
          .page-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #F0EDE8;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E4DFD8;
            border-top-color: #C9A227;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="empty-icon">⛔</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>Доступ запрещён</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        
        {/* ============================================================
           ЗАГОЛОВОК
           ============================================================ */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>👥 Участники</h1>
            <p>
              {isClubCoordinator 
                ? `Участники вашего клуба (${filtered.length})` 
                : `Все участники движения (${filtered.length})`}
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className={`btn-view ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Таблица
            </button>
            <button
              className={`btn-view ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              🃏 Карточки
            </button>
          </div>
        </div>

        {message && (
          <div className="message-success">
            {message}
          </div>
        )}

        <FilterBar
          filters={filterConfig}
          onFilterChange={setFilters}
          onSearchChange={setSearchQuery}
          searchPlaceholder="🔍 Поиск по ФИО, email, школе..."
        >
          <div className="filter-count">
            Найдено: <strong>{filtered.length}</strong>
          </div>
        </FilterBar>

        {/* ============================================================
           ТАБЛИЦА
           ============================================================ */}
        {viewMode === 'table' && (
          <div className="table-wrapper">
            <table className="table">
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
                    <td colSpan="6" className="empty-table">
                      <div className="empty-icon">👀</div>
                      <p>{isClubCoordinator ? 'В вашем клубе пока нет участников' : 'Участников не найдено'}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="participant-cell">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="Аватар" className="participant-avatar-img" />
                          ) : (
                            <div className="participant-avatar">
                              {p.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="participant-name">{p.full_name}</span>
                        </div>
                      </td>
                      <td>{p.class_name || '—'}</td>
                      <td>{p.school || '—'}</td>
                      <td>{p.club_name || '—'}</td>
                      <td>
                        <span className={`status-badge ${p.status === 'active' ? 'active' : 'inactive'}`}>
                          {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon view"
                            onClick={() => navigate(`/participant/${p.id}`)}
                            title="Просмотр"
                          >
                            👁️
                          </button>
                          {canEdit && (
                            <button
                              className="btn-icon edit"
                              onClick={() => navigate(`/participant/${p.id}/edit`)}
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn-icon delete"
                              onClick={() => handleDelete(p.id, p.full_name)}
                              title="Удалить"
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

        {/* ============================================================
           КАРТОЧКИ
           ============================================================ */}
        {viewMode === 'cards' && (
          <div className="cards-grid">
            {filtered.length === 0 ? (
              <div className="empty-state full-width">
                <div className="empty-icon">👀</div>
                <p>{isClubCoordinator ? 'В вашем клубе пока нет участников' : 'Участников не найдено'}</p>
              </div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  className="participant-card"
                  onClick={() => navigate(`/participant/${p.id}`)}
                >
                  <div className="card-header">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="Аватар" className="card-avatar-img" />
                    ) : (
                      <div className="card-avatar">
                        {p.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="card-name">{p.full_name}</div>
                  </div>
                  <div className="card-body">
                    <div className="card-info">
                      <span className="card-label">Класс</span>
                      <span className="card-value">{p.class_name || '—'}</span>
                    </div>
                    <div className="card-info">
                      <span className="card-label">Школа</span>
                      <span className="card-value">{p.school || '—'}</span>
                    </div>
                    <div className="card-info">
                      <span className="card-label">Клуб</span>
                      <span className="card-value">{p.club_name || '—'}</span>
                    </div>
                  </div>
                  <div className="card-footer">
                    <span className={`status-badge ${p.status === 'active' ? 'active' : 'inactive'}`}>
                      {p.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                    </span>
                    {(canEdit || canDelete) && (
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            className="btn-icon edit"
                            onClick={() => navigate(`/participant/${p.id}/edit`)}
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn-icon delete"
                            onClick={() => handleDelete(p.id, p.full_name)}
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Footer />

      <style>{`
        /* ============================================================
           ОСНОВНЫЕ СТИЛИ
           ============================================================ */
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        /* ============================================================
           ЗАГОЛОВОК
           ============================================================ */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: #0B1F3A;
          margin: 0;
        }

        .page-header-left p {
          color: #667085;
          margin: 4px 0 0 0;
        }

        .page-header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-view {
          padding: 8px 16px;
          border: 1.5px solid #E4DFD8;
          border-radius: 8px;
          background: transparent;
          color: #6B6561;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        .btn-view:hover {
          background: #F8F6F2;
          border-color: #C9A227;
        }

        .btn-view.active {
          background: #0A1628;
          color: white;
          border-color: #0A1628;
        }

        /* ============================================================
           СООБЩЕНИЯ
           ============================================================ */
        .message-success {
          padding: 12px 16px;
          background: #E8F5EF;
          color: #16845B;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #16845B;
        }

        /* ============================================================
           ФИЛЬТР
           ============================================================ */
        .filter-count {
          font-size: 14px;
          color: #667085;
          padding: 6px 16px;
          background: #F8FAFC;
          border-radius: 20px;
          border: 1px solid #E2E7EF;
          white-space: nowrap;
        }

        /* ============================================================
           ТАБЛИЦА
           ============================================================ */
        .table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 700px;
        }

        .table thead {
          background: #F8F6F2;
          border-bottom: 1px solid #E4DFD8;
        }

        .table thead th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #8A8480;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .table tbody td {
          padding: 12px 16px;
          border-bottom: 1px solid #F0EDE8;
          color: #4D4744;
        }

        .table tbody tr:hover td {
          background: #F8F6F2;
        }

        .table tbody tr:last-child td {
          border-bottom: none;
        }

        .empty-table {
          text-align: center;
          padding: 40px 20px !important;
          color: #667085;
        }

        .empty-table .empty-icon {
          font-size: 48px;
          margin-bottom: 8px;
          opacity: 0.6;
        }

        /* ============================================================
           УЧАСТНИК В ТАБЛИЦЕ
           ============================================================ */
        .participant-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .participant-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .participant-avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E2E7EF;
          flex-shrink: 0;
        }

        .participant-name {
          font-weight: 500;
          color: #0B1F3A;
        }

        /* ============================================================
           СТАТУС
           ============================================================ */
        .status-badge {
          display: inline-block;
          padding: 2px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #E8F5EF;
          color: #16845B;
        }

        .status-badge.inactive {
          background: #FCEBEC;
          color: #B3262E;
        }

        /* ============================================================
           ДЕЙСТВИЯ
           ============================================================ */
        .action-buttons {
          display: flex;
          gap: 4px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-icon {
          padding: 4px 10px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
          background: transparent;
        }

        .btn-icon.view:hover {
          background: #EAF2FA;
        }

        .btn-icon.edit:hover {
          background: #FBF4DC;
        }

        .btn-icon.delete:hover {
          background: #FCEBEC;
        }

        /* ============================================================
           КАРТОЧКИ
           ============================================================ */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .participant-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .participant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(11, 31, 58, 0.12);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }

        .card-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0B1F3A, #174A7E);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .card-avatar-img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E2E7EF;
          flex-shrink: 0;
        }

        .card-name {
          font-size: 16px;
          font-weight: 600;
          color: #0B1F3A;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .card-info {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 2px 0;
        }

        .card-label {
          color: #98A2B3;
        }

        .card-value {
          color: #0B1F3A;
          font-weight: 500;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #F0EDE8;
        }

        .card-actions {
          display: flex;
          gap: 4px;
        }

        /* ============================================================
           EMPTY STATE
           ============================================================ */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-state .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }

        .empty-state p {
          color: #667085;
          font-size: 14px;
        }

        /* ============================================================
           СПИННЕР
           ============================================================ */
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #E4DFD8;
          border-top-color: #C9A227;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ============================================================
           АДАПТИВНОСТЬ
           ============================================================ */
        @media (max-width: 1024px) {
          .container-page {
            padding: 20px 24px 32px;
          }
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .page-header-actions {
            justify-content: center;
          }

          .btn-view {
            flex: 1;
            text-align: center;
          }

          .cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }

          .table {
            min-width: 500px;
            font-size: 13px;
          }

          .table thead th,
          .table tbody td {
            padding: 10px 12px;
          }

          .participant-card {
            padding: 16px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .page-header-left h1 {
            font-size: 20px;
          }

          .cards-grid {
            grid-template-columns: 1fr;
          }

          .table {
            min-width: 400px;
            font-size: 12px;
          }

          .table thead th,
          .table tbody td {
            padding: 8px 10px;
          }

          .participant-cell {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .action-buttons {
            flex-direction: column;
            gap: 2px;
          }

          .btn-icon {
            padding: 4px 8px;
            font-size: 12px;
          }

          .participant-card {
            padding: 14px;
          }

          .card-avatar,
          .card-avatar-img {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .card-name {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}