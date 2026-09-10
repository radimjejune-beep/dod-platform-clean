// frontend/src/pages/Reports.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function Reports() {
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  
  // ===== ПАГИНАЦИЯ =====
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [form, setForm] = useState({
    id: null,
    club_id: '',
    report_month: '',
    report_text: '',
    events_count: 0,
    participants_count: 0
  });
  const navigate = useNavigate();

  // ============================================================
  // ОПРЕДЕЛЯЕМ РОЛИ
  // ============================================================
  const isClubCoordinator = profile?.role === 'club_coordinator';
  const isAdmin = profile?.role === 'admin';
  const isMovementCoordinator = profile?.role === 'movement_coordinator';
  
  const canCreate = profile && (isAdmin || isMovementCoordinator || isClubCoordinator);
  const canFilterByClub = isAdmin || isMovementCoordinator;

  // Получаем ID клуба координатора
  const getCoordinatorClubId = () => {
    if (!isClubCoordinator) return null;
    let clubId = profile?.club_id;
    if (!clubId) {
      const found = clubs.find(c => 
        c.coordinator_id === profile?.id || 
        c.leader_id === profile?.id
      );
      if (found) clubId = found.id;
    }
    return clubId;
  };

  const coordinatorClubId = getCoordinatorClubId();

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const role = userData.role;
      
      const allowedRoles = ['admin', 'movement_coordinator', 'club_coordinator', 'president', 'vice_president'];
      if (!allowedRoles.includes(role)) {
        navigate('/dashboard');
        return;
      }

      // ============================================================
      // ✅ ЗАГРУЗКА С ПАГИНАЦИЕЙ
      // ============================================================
      const [clubsData, reportsData] = await Promise.all([
        api.getClubs(),
        api.getReports({ page, limit: pagination.limit })
      ]);

      setClubs(clubsData || []);

      const data = reportsData.data || [];
      const meta = reportsData.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
      let filteredReports = [];

      // ============================================================
      // КООРДИНАТОР КЮДА - ТОЛЬКО СВОЙ КЛУБ
      // ============================================================
      if (role === 'club_coordinator') {
        let coordinatorClubId = userData.club_id;
        
        if (!coordinatorClubId) {
          try {
            const coordResponse = await fetch(
              `https://dod-backend.relaxdev.ru/api/club-coordinators?profile_id=${userData.id}`,
              { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
            );
            const coordData = await coordResponse.json();
            if (coordData && coordData.length > 0) {
              coordinatorClubId = coordData[0].club_id;
            }
          } catch (e) {
            console.log('Ошибка получения координатора:', e);
          }
        }

        if (coordinatorClubId) {
          filteredReports = data.filter(r => r.club_id === coordinatorClubId);
        } else {
          filteredReports = [];
        }
      } 
      // ============================================================
      // АДМИН, КООРДИНАТОР ДВИЖЕНИЯ - ВСЕ ОТЧЁТЫ
      // ============================================================
      else if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role)) {
        filteredReports = data;
      } 
      else {
        filteredReports = [];
      }

      setAllReports(filteredReports);
      setReports(filteredReports);
      setPagination({
        ...meta,
        total: filteredReports.length
      });

      // Для координатора КЮДа предзаполняем клуб в форме
      if (role === 'club_coordinator') {
        const coordClubId = userData.club_id || filteredReports[0]?.club_id;
        if (coordClubId) {
          setForm(prev => ({ ...prev, club_id: coordClubId }));
        }
      }

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setMessage('❌ Ошибка загрузки отчётов');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Фильтр по клубу (только для админа и координатора движения)
  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      setReports(allReports.filter(r => r.club_id === selectedClubId));
    } else {
      setReports(allReports);
    }
  }, [selectedClubId, allReports, canFilterByClub]);

  // ============================================================
  // ПАГИНАЦИЯ
  // ============================================================
  const Pagination = ({ pagination, onPageChange }) => {
    const { page, totalPages, total } = pagination;

    if (totalPages <= 1) return null;

    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ◀
        </button>
        
        {pages.map((p) => (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ▶
        </button>
        
        <span className="pagination-info">
          Всего: {total} записей
        </span>
      </div>
    );
  };

  // ============================================================
  // СОЗДАНИЕ/ОБНОВЛЕНИЕ ОТЧЁТА
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      let clubId = form.club_id;
      
      if (isClubCoordinator) {
        if (coordinatorClubId) {
          clubId = coordinatorClubId;
        } else {
          setMessage('❌ Вы не привязаны ни к одному КЮДу');
          setMessageType('error');
          setLoading(false);
          return;
        }
      }

      if (!clubId) {
        setMessage('❌ Выберите клуб');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (!form.report_month) {
        setMessage('❌ Выберите месяц отчёта');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Нет авторизации');
      }

      const data = {
        club_id: clubId,
        report_month: form.report_month,
        report_text: form.report_text || '',
        events_count: parseInt(form.events_count) || 0,
        participants_count: parseInt(form.participants_count) || 0
      };

      let response;
      let result;

      if (form.id) {
        response = await fetch(`https://dod-backend.relaxdev.ru/api/reports/${form.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
      } else {
        response = await fetch('https://dod-backend.relaxdev.ru/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        result = await response.json();
      }

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка сохранения отчёта');
      }

      setMessage(form.id ? '✅ Отчёт обновлён!' : '✅ Отчёт создан!');
      setMessageType('success');
      setForm({
        id: null,
        club_id: isClubCoordinator ? (coordinatorClubId || '') : '',
        report_month: '',
        report_text: '',
        events_count: 0,
        participants_count: 0
      });
      setShowForm(false);
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      club_id: isClubCoordinator ? (coordinatorClubId || '') : '',
      report_month: '',
      report_text: '',
      events_count: 0,
      participants_count: 0
    });
    setShowForm(false);
  };

  const handleEdit = (report) => {
    setForm({
      id: report.id,
      club_id: report.club_id || '',
      report_month: report.report_month || '',
      report_text: report.report_text || report.content || '',
      events_count: report.events_count || 0,
      participants_count: report.participants_count || 0
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить отчёт?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка удаления');
      }

      setMessage('✅ Отчёт удалён');
      setMessageType('success');
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleSubmitReport = async (id) => {
    if (!confirm('Отправить отчёт на проверку?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/reports/${id}/submit`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка отправки');
      }

      setMessage('✅ Отчёт отправлен на проверку!');
      setMessageType('success');
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleApproveReport = async (id) => {
    if (!confirm('Утвердить отчёт?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/reports/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка утверждения');
      }

      setMessage('✅ Отчёт утверждён!');
      setMessageType('success');
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const handleRejectReport = async (id) => {
    const comment = prompt('Укажите причину отклонения:');
    if (comment === null) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://dod-backend.relaxdev.ru/api/reports/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка отклонения');
      }

      setMessage('❌ Отчёт отклонён');
      setMessageType('error');
      loadData(pagination.page);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { color: '#8A9AAA', bg: 'var(--color-gray-100)', label: '📝 Черновик' },
      'submitted': { color: 'var(--color-gold)', bg: 'var(--color-gold-pale)', label: '⏳ На проверке' },
      'approved': { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: '✅ Утверждён' },
      'rejected': { color: 'var(--color-error)', bg: 'var(--color-error-bg)', label: '❌ Отклонён' }
    };
    return badges[status] || badges['draft'];
  };

  const canView = profile && (isAdmin || isMovementCoordinator || isClubCoordinator || 
    profile.role === 'president' || profile.role === 'vice_president');

  const coordinatorClubName = isClubCoordinator 
    ? clubs.find(c => c.id === coordinatorClubId)?.name || 'вашего клуба'
    : '';

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
            background: var(--color-gray-100);
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid var(--color-gray-200);
            border-top-color: var(--color-gold);
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
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Доступ запрещён</p>
            <p style={{ color: 'var(--color-gray-500)' }}>Только координаторы и администраторы</p>
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
            <h1>📋 Отчёты</h1>
            <p>
              {isClubCoordinator 
                ? `Ежемесячные отчёты вашего клуба (${reports.length})` 
                : `Проверка и утверждение отчётов всех КЮДов (${pagination.total || reports.length})`}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-gold"
              onClick={() => {
                setForm({
                  id: null,
                  club_id: isClubCoordinator ? (coordinatorClubId || '') : '',
                  report_month: new Date().toISOString().slice(0, 7),
                  report_text: '',
                  events_count: 0,
                  participants_count: 0
                });
                setShowForm(!showForm);
              }}
            >
              {showForm ? '✖ Закрыть' : '➕ Создать отчёт'}
            </button>
          )}
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {canFilterByClub && clubs.length > 0 && (
          <div className="filter-club">
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
            >
              <option value="">Все КЮДы</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
            <span className="filter-info">
              {selectedClubId ? (
                <span>🔍 Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>📋 Все отчёты</span>
              )}
            </span>
            {selectedClubId && (
              <button
                className="filter-clear"
                onClick={() => setSelectedClubId('')}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        )}

        {showForm && canCreate && (
          <div className="card form-card">
            <h3>{form.id ? '✏️ Редактировать отчёт' : '📝 Новый отчёт'}</h3>
            
            {isClubCoordinator && coordinatorClubId && (
              <div className="form-club-info">
                🏫 <strong>Отчёт для вашего клуба:</strong> {clubs.find(c => c.id === coordinatorClubId)?.name || 'КЮД'}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Клуб *</label>
                <select
                  value={form.club_id}
                  onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  required
                  disabled={isClubCoordinator}
                >
                  <option value="">Выберите клуб</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                {isClubCoordinator && (
                  <div className="form-hint">🔒 Вы можете создавать отчёты только для своего клуба</div>
                )}
              </div>

              <div className="form-group">
                <label>Отчётный месяц *</label>
                <input
                  type="month"
                  value={form.report_month}
                  onChange={(e) => setForm({ ...form, report_month: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Текст отчёта</label>
                <textarea
                  rows="6"
                  value={form.report_text}
                  onChange={(e) => setForm({ ...form, report_text: e.target.value })}
                  placeholder="Опишите проведённые мероприятия, достижения, планы..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Количество мероприятий</label>
                  <input
                    type="number"
                    value={form.events_count}
                    onChange={(e) => setForm({ ...form, events_count: e.target.value })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Участников всего</label>
                  <input
                    type="number"
                    value={form.participants_count}
                    onChange={(e) => setForm({ ...form, participants_count: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-success" disabled={loading}>
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Создать'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  ❌ Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
           СПИСОК ОТЧЁТОВ
           ============================================================ */}
        <div className="card">
          <div className="card-header-simple">
            <h3>{isClubCoordinator ? `Отчёты ${coordinatorClubName}` : 'Все отчёты'}</h3>
            <span className="card-count">Всего: {reports.length}</span>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <p>{isClubCoordinator ? 'У вашего клуба пока нет отчётов' : 'Отчётов пока нет'}</p>
              {canCreate && (
                <p className="empty-hint">Создайте первый отчёт</p>
              )}
            </div>
          ) : (
            <div className="reports-list">
              {reports.map((report) => {
                const status = getStatusBadge(report.status);
                const isDraft = report.status === 'draft';
                const isSubmitted = report.status === 'submitted';
                
                return (
                  <div
                    key={report.id}
                    className="report-item"
                    style={{ borderLeftColor: status.color }}
                    onClick={() => {
                      setSelectedReport(report);
                      setShowModal(true);
                    }}
                  >
                    <div className="report-title">
                      {report.title || `Отчёт за ${report.report_month || 'неизвестный месяц'}`}
                      <span className="tag" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    <div className="report-subtitle">
                      🏫 {report.club_name || 'Клуб'} 
                      {report.report_month && ` • 📅 ${report.report_month}`}
                      {report.events_count !== undefined && ` • 📊 ${report.events_count} мероприятий`}
                      {report.participants_count !== undefined && ` • 👥 ${report.participants_count} участников`}
                    </div>
                    {report.created_by_name && (
                      <div className="report-meta">👤 Создал: {report.created_by_name}</div>
                    )}
                    <div className="report-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(report);
                          setShowModal(true);
                        }}
                      >
                        👁️ Открыть
                      </button>
                      
                      {canCreate && isDraft && (
                        <>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(report);
                            }}
                          >
                            ✏️ Редактировать
                          </button>
                          <button
                            className="btn-gold btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitReport(report.id);
                            }}
                          >
                            📤 Отправить
                          </button>
                        </>
                      )}
                      
                      {isSubmitted && (isAdmin || isMovementCoordinator || 
                        profile?.role === 'president' || profile?.role === 'vice_president') && (
                        <>
                          <button
                            className="btn-success btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveReport(report.id);
                            }}
                          >
                            ✅ Утвердить
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectReport(report.id);
                            }}
                          >
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                      
                      {(isAdmin || isMovementCoordinator) && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id);
                          }}
                        >
                          🗑️ Удалить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* ============================================================
             ПАГИНАЦИЯ
             ============================================================ */}
          <Pagination pagination={pagination} onPageChange={loadData} />
        </div>
      </div>

      {/* ============================================================
         МОДАЛЬНОЕ ОКНО ПРОСМОТРА ОТЧЁТА
         ============================================================ */}
      {showModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 {selectedReport.title || `Отчёт за ${selectedReport.report_month || 'неизвестный месяц'}`}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-tags">
              <span className="tag" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-500)' }}>
                🏫 {selectedReport.club_name || 'Клуб'}
              </span>
              {selectedReport.report_month && (
                <span className="tag" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-500)' }}>
                  📅 {selectedReport.report_month}
                </span>
              )}
              <span className="tag" style={{ 
                background: getStatusBadge(selectedReport.status).bg, 
                color: getStatusBadge(selectedReport.status).color 
              }}>
                {getStatusBadge(selectedReport.status).label}
              </span>
            </div>

            {selectedReport.content && (
              <div className="modal-content">
                <p>{selectedReport.content}</p>
              </div>
            )}

            <div className="modal-stats">
              <div className="modal-stat">
                <span className="stat-number">{selectedReport.events_count || 0}</span>
                <span className="stat-label">Мероприятий</span>
              </div>
              <div className="modal-stat">
                <span className="stat-number">{selectedReport.participants_count || 0}</span>
                <span className="stat-label">Участников</span>
              </div>
            </div>

            {selectedReport.created_by_name && (
              <div className="modal-meta">
                👤 Создал: {selectedReport.created_by_name}
                {selectedReport.created_at && ` • 📅 ${new Date(selectedReport.created_at).toLocaleDateString('ru-RU')}`}
              </div>
            )}

            {selectedReport.reviewer_comment && (
              <div className="modal-comment">
                <strong>💬 Причина отклонения:</strong>
                <p>{selectedReport.reviewer_comment}</p>
              </div>
            )}

            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setShowModal(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      <Footer />

      <style>{`
        /* ============================================================
           ОСНОВНЫЕ СТИЛИ
           ============================================================ */
        .page-background {
          min-height: 100vh;
          background: var(--color-gray-100);
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
          color: var(--color-primary);
          margin: 0;
        }

        .page-header-left p {
          color: var(--color-gray-500);
          margin: 4px 0 0 0;
        }

        /* ============================================================
           КНОПКИ
           ============================================================ */
        .btn-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, var(--color-gold), #D4B84A, var(--color-gold-light));
          color: var(--color-primary-dark);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 16px rgba(201,162,39,0.25);
          min-height: 44px;
          min-width: 80px;
          font-family: 'Inter', sans-serif;
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201,162,39,0.35);
        }

        .btn-success {
          background: var(--color-success);
          color: white;
          box-shadow: 0 4px 16px rgba(26,122,76,0.2);
        }
        .btn-success:hover {
          background: #13663E;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(26,122,76,0.3);
        }

        .btn-secondary {
          background: transparent;
          color: var(--color-primary-dark);
          border: 1.5px solid var(--color-gray-200);
        }
        .btn-secondary:hover {
          background: var(--color-gray-50);
          border-color: var(--color-gold);
          transform: translateY(-2px);
        }

        .btn-danger {
          background: var(--color-error);
          color: white;
          box-shadow: 0 4px 16px rgba(179,38,46,0.2);
        }
        .btn-danger:hover {
          background: #8A1C22;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(179,38,46,0.3);
        }

        .btn-primary {
          background: #6B46C1;
          color: white;
          box-shadow: 0 4px 16px rgba(107,70,193,0.2);
        }
        .btn-primary:hover {
          background: #5A3AAD;
          transform: translateY(-2px);
        }

        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
        }

        /* ============================================================
           ПАГИНАЦИЯ
           ============================================================ */
        .pagination {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--color-gray-200);
          flex-wrap: wrap;
        }

        .pagination-btn {
          padding: 6px 14px;
          border: 1px solid var(--color-gray-200);
          border-radius: 6px;
          background: white;
          color: var(--color-primary-dark);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          min-width: 36px;
          text-align: center;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: var(--color-gold);
          background: var(--color-gold-pale);
        }

        .pagination-btn.active {
          border-color: var(--color-gold);
          background: var(--color-gold);
          color: white;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 13px;
          color: var(--color-gray-400);
          margin-left: 8px;
        }

        @media (max-width: 768px) {
          .pagination-btn {
            padding: 4px 10px;
            font-size: 12px;
            min-width: 30px;
          }
          .pagination-info {
            font-size: 12px;
          }
        }

        /* ============================================================
           КАРТОЧКИ
           ============================================================ */
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid var(--color-gray-200);
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 20px;
        }

        .card-header-simple {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-header-simple h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-primary);
          margin: 0;
        }

        .card-count {
          font-size: 13px;
          color: var(--color-gray-500);
        }

        /* ============================================================
           ФОРМА
           ============================================================ */
        .form-card {
          margin-bottom: 24px;
        }

        .form-card h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          color: var(--color-primary);
          margin-bottom: 4px;
          font-size: 13px;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
          color: var(--color-primary);
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: var(--color-gold);
          box-shadow: 0 0 0 3px rgba(201,162,39,0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-hint {
          font-size: 11px;
          color: var(--color-gray-400);
          margin-top: 4px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .form-club-info {
          padding: 10px 16px;
          background: var(--color-info-bg);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          color: var(--color-primary-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ============================================================
           ФИЛЬТР КЛУБА
           ============================================================ */
        .filter-club {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-club select {
          min-width: 200px;
          padding: 10px 14px;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          background: white;
        }

        .filter-info {
          font-size: 14px;
          color: var(--color-gray-500);
        }

        .filter-clear {
          padding: 4px 12px;
          background: var(--color-error-bg);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: var(--color-error);
        }
        .filter-clear:hover {
          background: #FED7D7;
        }

        /* ============================================================
           СПИСОК ОТЧЁТОВ
           ============================================================ */
        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .report-item {
          padding: 14px 18px;
          border-left: 3px solid var(--color-primary);
          background: var(--color-gray-50);
          border-radius: 0 8px 8px 0;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .report-item:hover {
          background: var(--color-gray-100);
          transform: translateX(4px);
        }

        .report-title {
          font-weight: 600;
          color: var(--color-primary);
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .report-subtitle {
          font-size: 13px;
          color: var(--color-gray-500);
          margin-top: 2px;
        }

        .report-meta {
          font-size: 12px;
          color: var(--color-gray-400);
          margin-top: 4px;
        }

        .report-actions {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* ============================================================
           СООБЩЕНИЯ
           ============================================================ */
        .message-success {
          padding: 12px 16px;
          background: var(--color-success-bg);
          color: var(--color-success);
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid var(--color-success);
        }

        .message-error {
          padding: 12px 16px;
          background: var(--color-error-bg);
          color: var(--color-error);
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid var(--color-error);
        }

        /* ============================================================
           ТЕГИ
           ============================================================ */
        .tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }

        /* ============================================================
           EMPTY STATE
           ============================================================ */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }
        .empty-state p {
          color: var(--color-gray-500);
          font-size: 14px;
        }
        .empty-hint {
          font-size: 13px;
          color: var(--color-gray-400);
        }

        /* ============================================================
           МОДАЛЬНОЕ ОКНО
           ============================================================ */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(10, 22, 40, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(10,22,40,0.2);
          border: 1px solid var(--color-gray-200);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .modal-header h3 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--color-primary-dark);
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--color-gray-400);
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 4px 8px;
        }
        .modal-close:hover { color: var(--color-primary-dark); }

        .modal-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .modal-content {
          padding: 16px;
          background: var(--color-gray-50);
          border-radius: 8px;
          border: 1px solid var(--color-gray-200);
          margin-bottom: 16px;
          max-height: 200px;
          overflow: auto;
          white-space: pre-wrap;
        }

        .modal-content p {
          font-size: 14px;
          color: var(--color-primary);
          line-height: 1.6;
          margin: 0;
        }

        .modal-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .modal-stat {
          background: var(--color-gray-50);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }

        .modal-stat .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-primary);
          display: block;
        }

        .modal-stat .stat-label {
          font-size: 12px;
          color: var(--color-gray-400);
        }

        .modal-meta {
          font-size: 13px;
          color: var(--color-gray-400);
          margin-bottom: 12px;
        }

        .modal-comment {
          padding: 12px;
          background: var(--color-error-bg);
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #FED7D7;
        }

        .modal-comment strong {
          color: var(--color-error);
        }

        .modal-comment p {
          color: var(--color-error);
          margin: 4px 0 0 0;
          font-size: 14px;
        }

        /* ============================================================
           СПИННЕР
           ============================================================ */
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-gray-200);
          border-top-color: var(--color-gold);
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
          .page-header .btn-gold {
            width: 100%;
            justify-content: center;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 16px;
          }

          .filter-club {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-club select {
            min-width: unset;
          }

          .modal {
            padding: 20px;
          }

          .report-item {
            padding: 12px 14px;
          }
          .report-title {
            font-size: 14px;
          }

          .modal-stats {
            grid-template-columns: 1fr 1fr;
          }

          .pagination-btn {
            padding: 4px 10px;
            font-size: 12px;
            min-width: 30px;
          }
          .pagination-info {
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .page-header-left h1 {
            font-size: 20px;
          }

          .btn-gold {
            padding: 8px 16px;
            font-size: 13px;
            min-height: 36px;
          }

          .btn-sm {
            padding: 4px 10px;
            font-size: 11px;
            min-height: 28px;
            min-width: 40px;
          }

          .report-actions {
            flex-direction: column;
          }
          .report-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .modal {
            padding: 16px;
          }
          .modal-header h3 {
            font-size: 18px;
          }
          .modal-stats {
            grid-template-columns: 1fr;
          }

          .filter-info {
            font-size: 13px;
          }

          .form-actions {
            flex-direction: column;
          }
          .form-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .pagination {
            gap: 4px;
          }
          .pagination-btn {
            padding: 3px 8px;
            font-size: 11px;
            min-width: 26px;
          }
        }
      `}</style>
    </div>
  );
}