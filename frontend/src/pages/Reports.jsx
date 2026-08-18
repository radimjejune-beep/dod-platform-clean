// frontend/src/pages/Reports.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

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

  const loadData = async () => {
    try {
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

      const [clubsData, reportsData] = await Promise.all([
        api.getClubs(),
        api.getReports()
      ]);

      setClubs(clubsData || []);

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
          filteredReports = reportsData.filter(r => r.club_id === coordinatorClubId);
          console.log(`🏫 Координатор КЮДа: показано ${filteredReports.length} отчётов для клуба`);
        } else {
          filteredReports = [];
          console.log('❌ Клуб координатора не найден');
        }
      } 
      // ============================================================
      // АДМИН, КООРДИНАТОР ДВИЖЕНИЯ - ВСЕ ОТЧЁТЫ
      // ============================================================
      else if (['admin', 'movement_coordinator', 'president', 'vice_president'].includes(role)) {
        filteredReports = reportsData || [];
        console.log(`👑 ${role}: показано ${filteredReports.length} отчётов`);
      } 
      else {
        filteredReports = [];
      }

      setAllReports(filteredReports);
      setReports(filteredReports);

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
  // СОЗДАНИЕ/ОБНОВЛЕНИЕ ОТЧЁТА
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      let clubId = form.club_id;
      
      // Для координатора КЮДа — автоматически подставляем его клуб
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

      console.log('📤 Отправка отчёта:', data);

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
      loadData();
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
      loadData();
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
      loadData();
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
      loadData();
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
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { color: '#8A9AAA', bg: '#F4F6F9', label: '📝 Черновик' },
      'submitted': { color: '#C9A227', bg: '#FBF4DC', label: '⏳ На проверке' },
      'approved': { color: '#16845B', bg: '#E8F5EF', label: '✅ Утверждён' },
      'rejected': { color: '#B3262E', bg: '#FCEBEC', label: '❌ Отклонён' }
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
            <p style={{ color: '#667085' }}>Только координаторы и администраторы</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        {/* ============================================================
           ШАПКА С КНОПКОЙ СОЗДАНИЯ
           ============================================================ */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
              📋 Отчёты
            </h1>
            <p style={{ color: '#667085', margin: '4px 0 0 0' }}>
              {isClubCoordinator 
                ? `Ежемесячные отчёты вашего клуба (${reports.length})` 
                : `Проверка и утверждение отчётов всех КЮДов (${reports.length})`}
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
              style={{ padding: '10px 24px', fontSize: '14px' }}
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
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ minWidth: '200px' }}>
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
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '14px', color: '#667085' }}>
              {selectedClubId ? (
                <span>🔍 Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>📋 Все отчёты</span>
              )}
            </div>
            {selectedClubId && (
              <button
                style={{
                  padding: '4px 12px',
                  background: '#FCEBEC',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#B3262E'
                }}
                onClick={() => setSelectedClubId('')}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        )}

        {showForm && canCreate && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {form.id ? '✏️ Редактировать отчёт' : '📝 Новый отчёт'}
            </h3>
            
            {isClubCoordinator && coordinatorClubId && (
              <div style={{ 
                padding: '10px 16px', 
                background: '#EAF2FA', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '14px',
                color: '#174A7E',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
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
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>
                    🔒 Вы можете создавать отчёты только для своего клуба
                  </div>
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

              <div className="grid-2">
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
              {isClubCoordinator ? `Отчёты ${coordinatorClubName}` : 'Все отчёты'}
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              Всего: {reports.length}
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📄</div>
              <p>{isClubCoordinator ? 'У вашего клуба пока нет отчётов' : 'Отчётов пока нет'}</p>
              {canCreate && (
                <p style={{ fontSize: '13px', color: '#98A2B3' }}>
                  Создайте первый отчёт
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.map((report) => {
                const status = getStatusBadge(report.status);
                const isDraft = report.status === 'draft';
                const isSubmitted = report.status === 'submitted';
                
                return (
                  <div
                    key={report.id}
                    className="list-item"
                    style={{ 
                      borderLeftColor: status.color,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setSelectedReport(report);
                      setShowModal(true);
                    }}
                  >
                    <div className="title">
                      {report.title || `Отчёт за ${report.report_month || 'неизвестный месяц'}`}
                      <span className="tag" style={{ background: status.bg, color: status.color, marginLeft: '8px', fontSize: '10px' }}>
                        {status.label}
                      </span>
                    </div>
                    <div className="subtitle">
                      🏫 {report.club_name || 'Клуб'} 
                      {report.report_month && ` • 📅 ${report.report_month}`}
                      {report.events_count !== undefined && ` • 📊 ${report.events_count} мероприятий`}
                      {report.participants_count !== undefined && ` • 👥 ${report.participants_count} участников`}
                    </div>
                    {report.created_by_name && (
                      <div className="meta">👤 Создал: {report.created_by_name}</div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА ОТЧЁТА */}
      {showModal && selectedReport && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ 
              maxWidth: '600px', 
              width: '100%', 
              padding: '32px', 
              maxHeight: '80vh', 
              overflow: 'auto', 
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', fontSize: '24px', color: '#98A2B3', cursor: 'pointer' }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              {selectedReport.title || `Отчёт за ${selectedReport.report_month || 'неизвестный месяц'}`}
            </h2>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
                🏫 {selectedReport.club_name || 'Клуб'}
              </span>
              {selectedReport.report_month && (
                <span className="tag" style={{ background: '#F4F6F9', color: '#667085' }}>
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
              <div style={{ 
                padding: '16px', 
                background: '#F8FAFC', 
                borderRadius: '8px',
                border: '1px solid #E2E7EF',
                marginBottom: '12px',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                <p style={{ fontSize: '14px', color: '#0B1F3A', lineHeight: '1.6', margin: 0 }}>
                  {selectedReport.content}
                </p>
              </div>
            )}

            <div className="grid-2" style={{ marginBottom: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {selectedReport.events_count || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Мероприятий</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {selectedReport.participants_count || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Участников</div>
              </div>
            </div>

            {selectedReport.created_by_name && (
              <div style={{ fontSize: '13px', color: '#98A2B3', marginBottom: '12px' }}>
                👤 Создал: {selectedReport.created_by_name}
                {selectedReport.created_at && ` • 📅 ${new Date(selectedReport.created_at).toLocaleDateString('ru-RU')}`}
              </div>
            )}

            {selectedReport.reviewer_comment && (
              <div style={{ 
                padding: '12px', 
                background: '#FCEBEC', 
                borderRadius: '8px',
                marginBottom: '12px',
                border: '1px solid #FED7D7'
              }}>
                <strong style={{ color: '#B3262E' }}>💬 Причина отклонения:</strong>
                <p style={{ color: '#B3262E', margin: '4px 0 0 0', fontSize: '14px' }}>
                  {selectedReport.reviewer_comment}
                </p>
              </div>
            )}

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setShowModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <style>{`
        .btn-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #C9A227, #D4B84A, #E8D9A8);
          color: #0A1628;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          box-shadow: 0 2px 16px rgba(201, 162, 39, 0.25);
          min-height: 44px;
          min-width: 80px;
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(201, 162, 39, 0.35);
        }
        
        .btn-success {
          background: #1A7A4C;
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
          color: #0A1628;
          border: 1.5px solid #E4DFD8;
          box-shadow: none;
        }
        .btn-secondary:hover {
          background: #F8F6F2;
          border-color: #C9A227;
          transform: translateY(-2px);
        }
        
        .btn-danger {
          background: #B3262E;
          color: white;
          box-shadow: 0 4px 16px rgba(179,38,46,0.2);
        }
        .btn-danger:hover {
          background: #8A1C22;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(179,38,46,0.3);
        }
        
        .btn-primary {
          background: #0A1628;
          color: white;
          box-shadow: 0 4px 16px rgba(10,22,40,0.15);
        }
        .btn-primary:hover {
          background: #1A3555;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(10,22,40,0.25);
        }
        
        .btn-sm {
          padding: 6px 14px;
          font-size: 12px;
          min-height: 32px;
          min-width: 60px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          color: #0B1F3A;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #D5DCE7;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
          color: #0B1F3A;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: #C9A227;
          box-shadow: 0 0 0 3px rgba(201,162,39,0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
          margin-bottom: 20px;
        }
        
        .list-item {
          padding: 14px 18px;
          border-left: 3px solid #0B1F3A;
          background: #F8FAFC;
          border-radius: 0 8px 8px 0;
          transition: all 0.2s ease;
        }
        .list-item:hover {
          background: #F0EDE8;
          transform: translateX(4px);
        }
        .list-item .title {
          font-weight: 600;
          color: #0B1F3A;
          font-size: 15px;
        }
        .list-item .subtitle {
          font-size: 13px;
          color: #667085;
          margin-top: 2px;
        }
        .list-item .meta {
          font-size: 12px;
          color: #98A2B3;
          margin-top: 4px;
        }
        
        .tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        
        .message-success {
          padding: 12px 16px;
          background: #E8F5EF;
          color: #16845B;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #16845B;
        }
        .message-error {
          padding: 12px 16px;
          background: #FCEBEC;
          color: #B3262E;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #B3262E;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }
        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.6;
        }
        .empty-state p {
          color: #667085;
          font-size: 14px;
        }
        
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }
        .container-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }
          .grid-2 {
            grid-template-columns: 1fr;
          }
          .card {
            padding: 16px;
          }
        }
        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }
          .btn-gold {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}