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

      const [clubsData] = await Promise.all([
        api.getClubs()
      ]);

      setClubs(clubsData || []);

      const role = userData.role;
      let filteredReports = [];

      if (role === 'participant' || role === 'parent' || role === 'tutor') {
        filteredReports = [];
      } 
      else if (role === 'club_coordinator') {
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          filteredReports = [];
        } else {
          filteredReports = [];
        }
      } 
      else if (role === 'movement_coordinator' || role === 'admin' || role === 'president' || role === 'vice_president') {
        filteredReports = [];
      } 
      else {
        filteredReports = [];
      }

      setAllReports(filteredReports);
      setReports(filteredReports);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const canFilterByClub = profile?.role === 'admin' || profile?.role === 'movement_coordinator' || profile?.role === 'president' || profile?.role === 'vice_president';

  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      setReports(allReports.filter(r => r.club_id === selectedClubId));
    } else {
      setReports(allReports);
    }
  }, [selectedClubId, allReports, canFilterByClub]);

  const canCreate = profile && (profile.role === 'admin' || profile.role === 'movement_coordinator' || profile.role === 'club_coordinator');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      setMessage('✅ Отчёт создан!');
      setMessageType('success');
      setForm({
        id: null,
        club_id: '',
        report_month: '',
        report_text: '',
        events_count: 0,
        participants_count: 0
      });
      setShowForm(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Ошибка: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { color: '#8A9AAA', bg: '#F4F6F9', label: 'Черновик' },
      'submitted': { color: '#C9A227', bg: '#FBF4DC', label: 'На проверке' },
      'approved': { color: '#16845B', bg: '#E8F5EF', label: 'Утверждён' },
      'rejected': { color: '#B3262E', bg: '#FCEBEC', label: 'Отклонён' }
    };
    return badges[status] || badges['draft'];
  };

  const canView = profile && (profile.role === 'admin' || profile.role === 'movement_coordinator' || profile.role === 'club_coordinator' || profile.role === 'president' || profile.role === 'vice_president');

  const isClubCoordinator = profile?.role === 'club_coordinator';

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
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📋</span>
          <div>
            <h1>{isClubCoordinator ? 'Отчёты моего клуба' : 'Отчёты КЮДов'}</h1>
            <p>
              {isClubCoordinator 
                ? 'Ежемесячные отчёты вашего клуба' 
                : 'Проверка и утверждение отчётов всех КЮДов'}
            </p>
          </div>
          {canCreate && (
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setForm({
                  id: null,
                  club_id: clubs[0]?.id || '',
                  report_month: new Date().toISOString().slice(0, 7) + '-01',
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
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Клуб</label>
                <select
                  value={form.club_id}
                  onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                  required
                >
                  <option value="">Выберите клуб</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Отчётный месяц</label>
                <input
                  type="month"
                  value={form.report_month ? form.report_month.slice(0, 7) : ''}
                  onChange={(e) => setForm({ ...form, report_month: e.target.value + '-01' })}
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
                  {loading ? '⏳ Сохранение...' : form.id ? '💾 Обновить' : '✅ Сохранить'}
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
              {isClubCoordinator ? 'Отчёты вашего клуба' : 'Все отчёты'}
            </h3>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              Всего: {reports.length}
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📄</div>
              <p>Отчётов пока нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.map((report) => {
                const status = getStatusBadge(report.status);
                return (
                  <div
                    key={report.id}
                    className="list-item"
                    style={{ borderLeftColor: status.color }}
                    onClick={() => {
                      setSelectedReport(report);
                      setShowModal(true);
                    }}
                  >
                    <div className="title">
                      {report.report_month 
                        ? new Date(report.report_month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                        : 'Отчёт'}
                    </div>
                    <div className="subtitle">
                      🏫 {report.club_name || 'Клуб'} • 📊 Мероприятий: {report.events_count} • 👥 Участников: {report.participants_count}
                    </div>
                    <div className="meta">
                      <span className="tag" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
            style={{ maxWidth: '500px', width: '100%', padding: '32px', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', fontSize: '24px', color: '#98A2B3', cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.color = '#0B1F3A'}
              onMouseLeave={(e) => e.target.style.color = '#98A2B3'}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0B1F3A', marginBottom: '4px' }}>
              {selectedReport.report_month 
                ? new Date(selectedReport.report_month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                : 'Отчёт'}
            </h2>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#667085' }}>🏫 {selectedReport.club_name || 'Клуб'}</span>
              <span className="tag" style={{ background: getStatusBadge(selectedReport.status).bg, color: getStatusBadge(selectedReport.status).color }}>
                {getStatusBadge(selectedReport.status).label}
              </span>
            </div>

            {selectedReport.report_text && (
              <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', color: '#667085', lineHeight: '1.6', margin: 0 }}>
                  {selectedReport.report_text}
                </p>
              </div>
            )}

            <div className="grid-2" style={{ marginTop: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {selectedReport.events_count}
                </div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Мероприятий</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0B1F3A' }}>
                  {selectedReport.participants_count}
                </div>
                <div style={{ fontSize: '12px', color: '#98A2B3' }}>Участников</div>
              </div>
            </div>

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => setShowModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}