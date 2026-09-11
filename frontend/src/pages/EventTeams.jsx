// frontend/src/pages/EventTeams.jsx
//
// Сводка по командам на мероприятие для координатора движения.
// Заменяет ручное сведение ответов из Google-формы: видно, кто подал,
// кто нет, сколько человек, и всё выгружается одной кнопкой.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

const STATUS = {
  not_started: { label: 'Не начата', color: 'var(--color-gray-500)', bg: 'var(--color-gray-100)' },
  draft: { label: 'Черновик', color: 'var(--color-gold-dark)', bg: 'var(--color-gold-pale)' },
  submitted: { label: 'Ждёт утверждения', color: 'var(--color-primary-light)', bg: 'var(--color-info-bg)' },
  approved: { label: 'Утверждена', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  revision_requested: { label: 'На доработке', color: 'var(--color-error)', bg: 'var(--color-error-bg)' }
};

export default function EventTeams() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ club_ids: [], deadline: '', quota: '', allow_escorts: false, message: '' });

  const [returning, setReturning] = useState(null);
  const [returnComment, setReturnComment] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (eventId) loadSummary(eventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const init = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(userData.role)) {
        navigate('/dashboard');
        return;
      }
      setProfile(userData);

      const [eventsData, clubsData] = await Promise.all([api.getEvents(), api.getClubs()]);
      const evList = Array.isArray(eventsData) ? eventsData : eventsData?.data || [];
      const clList = Array.isArray(clubsData) ? clubsData : clubsData?.data || [];

      setEvents(evList);
      setClubs(clList);
      if (evList.length > 0) setEventId(evList[0].id);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setMessage('❌ Не удалось загрузить данные');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (id) => {
    try {
      const data = await api.getEventTeams(id);
      setSummary(data);
    } catch (err) {
      console.error('❌ Ошибка сводки:', err);
    }
  };

  const show = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const sendInvitations = async (e) => {
    e.preventDefault();
    if (invite.club_ids.length === 0) {
      show('❌ Отметьте хотя бы один КЮД', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await api.inviteClubsToEvent(eventId, {
        club_ids: invite.club_ids,
        deadline: invite.deadline || null,
        quota: invite.quota ? Number(invite.quota) : null,
        allow_escorts: invite.allow_escorts,
        message: invite.message || null
      });
      if (result?.error) throw new Error(api.describeApiError(result));
      show(`✅ ${result.message}`);
      setShowInvite(false);
      setInvite({ club_ids: [], deadline: '', quota: '', allow_escorts: false, message: '' });
      loadSummary(eventId);
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const approve = async (row) => {
    if (!confirm(`Утвердить команду «${row.club_name}»?`)) return;
    setBusy(true);
    try {
      const result = await api.reviewTeam(row.submission_id, 'approve');
      if (result?.error) throw new Error(api.describeApiError(result));
      show('✅ Команда утверждена');
      loadSummary(eventId);
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendBack = async (e) => {
    e.preventDefault();
    if (!returnComment.trim()) {
      show('❌ Нужен комментарий: иначе руководитель не поймёт, что исправлять', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await api.reviewTeam(returning.submission_id, 'return', returnComment.trim());
      if (result?.error) throw new Error(api.describeApiError(result));
      show('✅ Команда возвращена на доработку');
      setReturning(null);
      setReturnComment('');
      loadSummary(eventId);
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportList = async (withDocuments) => {
    setBusy(true);
    try {
      await api.exportEventTeams(eventId, withDocuments);
      show('✅ Файл выгружен');
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  const notInvited = clubs.filter((c) => !summary?.clubs?.some((s) => s.club_id === c.id));

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>{message}</div>
        )}

        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '12px' }}>Команды на форумы и выезды</h2>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Мероприятие</label>
            <select className="form-input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.length === 0 && <option value="">Мероприятий пока нет</option>}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                  {ev.event_date ? ` — ${new Date(ev.event_date).toLocaleDateString('ru-RU')}` : ''}
                </option>
              ))}
            </select>
          </div>

          {eventId && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button className="btn-primary" onClick={() => setShowInvite(!showInvite)}>
                {showInvite ? '✖ Закрыть' : '📣 Пригласить КЮДы'}
              </button>
              <button className="btn-secondary" onClick={() => exportList(false)} disabled={busy}>
                📊 Выгрузить список
              </button>
              <button className="btn-secondary" onClick={() => exportList(true)} disabled={busy}
                title="Выгрузка вместе с данными документов — только для оформления мероприятия">
                📋 Выгрузить с документами
              </button>
            </div>
          )}
        </div>

        {/* ===== ПРИГЛАШЕНИЕ КЛУБОВ ===== */}
        {showInvite && (
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>Пригласить КЮДы</h3>

            <form onSubmit={sendInvitations}>
              <div className="form-group">
                <label className="form-label">Какие КЮДы приглашаем</label>
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                  {clubs.map((c) => (
                    <label key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={invite.club_ids.includes(c.id)}
                        onChange={(e) => setInvite({
                          ...invite,
                          club_ids: e.target.checked
                            ? [...invite.club_ids, c.id]
                            : invite.club_ids.filter((x) => x !== c.id)
                        })}
                      />
                      <span>{c.name}</span>
                      {notInvited.every((n) => n.id !== c.id) && (
                        <span className="tag" style={{ marginLeft: 'auto' }}>уже приглашён</span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="form-hint" style={{ marginTop: '6px' }}>
                  <button type="button" className="btn-secondary btn-sm"
                    onClick={() => setInvite({ ...invite, club_ids: clubs.map((c) => c.id) })}>
                    Отметить все
                  </button>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Собрать до</label>
                  <input type="date" className="form-input" value={invite.deadline}
                    onChange={(e) => setInvite({ ...invite, deadline: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Квота, человек от клуба</label>
                  <input type="number" min="1" className="form-input" value={invite.quota}
                    placeholder="без ограничения"
                    onChange={(e) => setInvite({ ...invite, quota: e.target.value })} />
                  <div className="form-hint">Сопровождающие в квоту не входят</div>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={invite.allow_escorts}
                    onChange={(e) => setInvite({ ...invite, allow_escorts: e.target.checked })} />
                  Разрешить включать сопровождающих взрослых
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Напутствие руководителям</label>
                <textarea className="form-input" rows="3" value={invite.message}
                  placeholder="Что важно учесть при формировании команды"
                  onChange={(e) => setInvite({ ...invite, message: e.target.value })} />
              </div>

              <button type="submit" className="btn-success" disabled={busy}>
                📣 Отправить приглашения
              </button>
            </form>
          </div>
        )}

        {/* ===== СВОДКА ===== */}
        {summary && summary.clubs?.length > 0 && (
          <>
            <div className="quick-actions-grid" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <div className="stat-number">{summary.submitted} / {summary.total_clubs}</div>
                <div className="stat-label">КЮДов подали команду</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{summary.waiting}</div>
                <div className="stat-label">Ждут утверждения</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{summary.approved}</div>
                <div className="stat-label">Утверждено</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{summary.total_participants}</div>
                <div className="stat-label">Человек всего</div>
              </div>
            </div>

            <div className="card table-wrapper" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>КЮД</th>
                    <th>Статус</th>
                    <th>Школьников</th>
                    <th>Сопровождающих</th>
                    <th>Подал</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.clubs.map((row) => {
                    const st = STATUS[row.status] || STATUS.not_started;
                    return (
                      <tr key={row.club_id}>
                        <td>
                          <strong>{row.club_name}</strong>
                          {row.quota && <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>квота: {row.quota}</div>}
                        </td>
                        <td>
                          <span className="tag" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          {row.review_comment && row.status === 'revision_requested' && (
                            <div style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '4px' }}>
                              {row.review_comment}
                            </div>
                          )}
                        </td>
                        <td>{row.students_count}</td>
                        <td>{row.escorts_count}</td>
                        <td style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
                          {row.submitted_by_name || '—'}
                          {row.submitted_at && (
                            <div>{new Date(row.submitted_at).toLocaleDateString('ru-RU')}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {row.submission_id && (
                              <button className="btn-secondary btn-sm" onClick={() => navigate(`/team/${row.submission_id}`)}>
                                👁 Состав
                              </button>
                            )}
                            {row.status === 'submitted' && (
                              <>
                                <button className="btn-success btn-sm" onClick={() => approve(row)} disabled={busy}>
                                  ✅ Утвердить
                                </button>
                                <button className="btn-secondary btn-sm" onClick={() => setReturning(row)} disabled={busy}>
                                  ↩️ Вернуть
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {summary && summary.clubs?.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📣</div>
            <div>На это мероприятие ещё никого не приглашали</div>
            <div style={{ fontSize: '14px', color: 'var(--color-gray-500)', marginTop: '8px' }}>
              Нажмите «Пригласить КЮДы», чтобы начать сбор команд
            </div>
          </div>
        )}

        {/* ===== ВОЗВРАТ НА ДОРАБОТКУ ===== */}
        {returning && (
          <div className="modal-overlay" onClick={() => setReturning(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Вернуть команду «{returning.club_name}»</h3>
                <button className="modal-close" onClick={() => setReturning(null)}>✖</button>
              </div>

              <form onSubmit={sendBack}>
                <div className="form-group">
                  <label className="form-label">Что нужно исправить *</label>
                  <textarea className="form-input" rows="4" value={returnComment} required
                    placeholder="Например: не хватает двух человек до квоты, у Иванова не заполнен документ"
                    onChange={(e) => setReturnComment(e.target.value)} />
                  <div className="form-hint">
                    Комментарий увидит руководитель КЮДа — по нему он поймёт, что поправить
                  </div>
                </div>

                <div className="btn-group">
                  <button type="submit" className="btn-primary" disabled={busy}>↩️ Вернуть на доработку</button>
                  <button type="button" className="btn-secondary" onClick={() => setReturning(null)}>Отмена</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
