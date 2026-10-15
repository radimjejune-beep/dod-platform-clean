// frontend/src/pages/EventDetail.jsx
//
// Одно мероприятие целиком: описание, Телемост, запись, а для организаторов —
// список записавшихся, явка и итоги. Раньше всё это было размазано по
// карточке в списке и по окнам, а у завершённого мероприятия не было
// ни итогов, ни явки.

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import TelemostInfo from '../components/TelemostInfo';
import { toDateInput, isPastEvent } from '../lib/events';

const API_URL = 'https://dod-backend.relaxdev.ru/api';

const TYPE_LABELS = {
  internal: 'Внутреннее',
  outgoing: 'Выездное',
  global_forum: 'Форум'
};

const BLOCKED_TEXT = {
  deadline: 'Приём заявок закончился',
  full: 'Все места заняты',
  finished: 'Мероприятие завершено',
  not_approved: 'Мероприятие ещё не одобрено'
};

const REG_TEXT = {
  pending: 'Ваша заявка на рассмотрении',
  confirmed: 'Вы записаны',
  rejected: 'Ваша заявка отклонена'
};

function formatDay(value) {
  const input = toDateInput(value);
  if (!input) return '';
  const [y, m, d] = input.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function call(path, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });
  let data = null;
  try { data = await response.json(); } catch { /* пустой ответ */ }
  return { ok: response.ok, status: response.status, data };
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('ok'); // ok | notfound | error
  const [notice, setNotice] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);

  // Отметки явки, которые ещё не отправлены: { registration_id: true|false|null }
  const [pendingMarks, setPendingMarks] = useState({});
  const [summary, setSummary] = useState('');

  const load = useCallback(async () => {
    const result = await call(`/events/${encodeURIComponent(id)}`);
    if (result.status === 404) { setState('notfound'); setPayload(null); }
    else if (!result.ok) { setState('error'); setPayload(null); }
    else {
      setState('ok');
      setPayload(result.data);
      setSummary(result.data?.event?.results_summary || '');
      setPendingMarks({});
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await api.getMe();
        if (cancelled) return;
        if (!me || !me.id) { navigate('/login'); return; }
        setProfile(me);
        await load();
      } catch {
        if (!cancelled) setState('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, load, navigate]);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const register = async () => {
    setBusy(true);
    const r = await call('/event-registrations', { method: 'POST', body: JSON.stringify({ event_id: id }) });
    setBusy(false);
    if (!r.ok) return showNotice('error', r.data?.error || 'Не удалось отправить заявку');
    showNotice('success', 'Заявка отправлена');
    await load();
  };

  const unregister = async (registrationId) => {
    setBusy(true);
    const r = await call(`/event-registrations/${registrationId}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) return showNotice('error', r.data?.error || 'Не удалось отменить запись');
    showNotice('success', 'Запись отменена');
    await load();
  };

  const saveAttendance = async () => {
    const marks = Object.entries(pendingMarks).map(([registration_id, attended]) => ({ registration_id, attended }));
    if (marks.length === 0) return;
    setBusy(true);
    const r = await call(`/events/${id}/attendance`, { method: 'PATCH', body: JSON.stringify({ marks }) });
    setBusy(false);
    if (!r.ok) return showNotice('error', r.data?.error || 'Не удалось сохранить явку');
    showNotice('success', 'Явка сохранена');
    await load();
  };

  const complete = async () => {
    setBusy(true);
    const r = await call(`/events/${id}/complete`, { method: 'POST', body: JSON.stringify({ results_summary: summary }) });
    setBusy(false);
    if (!r.ok) return showNotice('error', r.data?.error || 'Не удалось завершить мероприятие');
    showNotice('success', payload.event.is_completed ? 'Итоги сохранены' : 'Мероприятие завершено, участникам отправлены итоги');
    await load();
  };

  const reopen = async () => {
    setBusy(true);
    const r = await call(`/events/${id}/reopen`, { method: 'POST' });
    setBusy(false);
    if (!r.ok) return showNotice('error', r.data?.error || 'Не удалось вернуть мероприятие');
    showNotice('success', 'Мероприятие снова открыто');
    await load();
  };

  const event = payload?.event;
  const registrations = payload?.registrations || null;
  const mine = payload?.my_registration || null;

  // Что сейчас отмечено у человека: несохранённая отметка важнее сохранённой
  const markOf = (r) => (Object.prototype.hasOwnProperty.call(pendingMarks, r.id) ? pendingMarks[r.id] : r.attended);
  const setMark = (r, value) => {
    setPendingMarks((prev) => {
      const next = { ...prev };
      // Возврат к сохранённому значению — не изменение
      if ((r.attended ?? null) === value) delete next[r.id];
      else next[r.id] = value;
      return next;
    });
  };
  const markAll = (value) => {
    if (!registrations) return;
    const next = {};
    registrations.filter((r) => r.status === 'confirmed').forEach((r) => {
      if ((r.attended ?? null) !== value) next[r.id] = value;
    });
    setPendingMarks(next);
  };

  const confirmed = (registrations || []).filter((r) => r.status === 'confirmed');
  const pendingCount = (registrations || []).filter((r) => r.status === 'pending').length;
  const changed = Object.keys(pendingMarks).length;
  const past = event ? isPastEvent(event) : false;

  const timeText = event
    ? [event.start_time, event.end_time].filter(Boolean).join('–')
    : '';
  const dateText = event
    ? (event.end_date && toDateInput(event.end_date) !== toDateInput(event.event_date)
        ? `${formatDay(event.event_date)} — ${formatDay(event.end_date)}`
        : formatDay(event.event_date))
    : '';

  return (
    <div className="page-background" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navigation profile={profile} />

      <main style={{ flex: 1, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '32px 24px 56px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/events'))}
          style={{ marginBottom: '24px' }}
        >
          <Icon name="back" /> К мероприятиям
        </button>

        {notice && (
          <div
            role="status"
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: notice.type === 'error' ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
              color: notice.type === 'error' ? 'var(--color-error)' : 'var(--color-success)'
            }}
          >
            {notice.text}
          </div>
        )}

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>}

        {!loading && state !== 'ok' && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <h2 style={{ marginBottom: '8px' }}>
              {state === 'notfound' ? 'Мероприятие не найдено' : 'Не удалось загрузить мероприятие'}
            </h2>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: '20px' }}>
              {state === 'notfound'
                ? 'Возможно, оно удалено или недоступно вам.'
                : 'Проверьте соединение и попробуйте ещё раз.'}
            </p>
            <button type="button" className="btn-primary" onClick={() => navigate('/events')}>К списку мероприятий</button>
          </div>
        )}

        {!loading && state === 'ok' && event && (
          <>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                <span className="tag">{TYPE_LABELS[event.type] || 'Мероприятие'}</span>
                {event.is_global && <span className="tag">Глобальное</span>}
                {event.is_completed && <span className="tag tag-closed">Завершено</span>}
                {!event.is_completed && past && <span className="tag tag-closed">Прошло</span>}
                {event.moderation_status === 'pending' && <span className="tag tag-pending">Ждёт одобрения</span>}
                {event.moderation_status === 'rejected' && <span className="tag tag-rejected">Отклонено</span>}
              </div>

              <h1 style={{ marginBottom: '12px' }}>{event.title}</h1>

              <div style={{ display: 'grid', gap: '8px', color: 'var(--color-gray-700)', marginBottom: '16px' }}>
                <div><Icon name="calendar" size={16} /> {dateText}{timeText ? `, ${timeText}` : ''}</div>
                {event.location && <div><Icon name="location" size={16} /> {event.location}</div>}
                {event.club_name && <div><Icon name="club" size={16} /> {event.club_name}</div>}
                {event.registration_deadline && (
                  <div><Icon name="clock" size={16} /> Приём заявок до {formatDay(event.registration_deadline)}</div>
                )}
                <div>
                  <Icon name="users" size={16} /> Записалось: {event.registrations_count}
                  {event.max_participants > 0 ? ` из ${event.max_participants}` : ''}
                </div>
              </div>

              {event.description && (
                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>{event.description}</p>
              )}

              {event.form_url && /^https?:\/\//.test(event.form_url) && (
                <p style={{ marginBottom: '8px' }}>
                  <a href={event.form_url} target="_blank" rel="noopener noreferrer">Ссылка на мероприятие</a>
                </p>
              )}

              <TelemostInfo event={event} />
            </div>

            {/* Запись */}
            {(mine || payload.can_register || BLOCKED_TEXT[payload.register_blocked]) && profile?.role === 'participant' && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}>Запись</h3>
                {mine && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <span>{REG_TEXT[mine.status] || mine.status}</span>
                    {mine.status === 'pending' && !past && (
                      <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => unregister(mine.id)}>
                        Отменить заявку
                      </button>
                    )}
                    {mine.status === 'confirmed' && event.is_completed && (
                      <span>
                        {mine.attended === true ? 'Отмечено: вы были' : mine.attended === false ? 'Отмечено: вас не было' : ''}
                      </span>
                    )}
                  </div>
                )}
                {!mine && payload.can_register && (
                  <button type="button" className="btn-success" disabled={busy} onClick={register}>
                    {busy ? 'Отправляем...' : 'Записаться'}
                  </button>
                )}
                {!mine && !payload.can_register && BLOCKED_TEXT[payload.register_blocked] && (
                  <span>{BLOCKED_TEXT[payload.register_blocked]}</span>
                )}
              </div>
            )}

            {/* Итоги — видят все, кто видит мероприятие */}
            {event.is_completed && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}>Итоги</h3>
                <p style={{ marginBottom: '8px' }}>
                  Пришло: <strong>{event.attended_count}</strong> из {event.registrations_count} записавшихся
                </p>
                {event.results_summary
                  ? <p style={{ whiteSpace: 'pre-wrap' }}>{event.results_summary}</p>
                  : <p style={{ color: 'var(--color-gray-500)' }}>Описание итогов не добавлено.</p>}
              </div>
            )}

            {/* Организаторам: явка и завершение */}
            {payload.can_manage && registrations && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '4px' }}>Участники</h3>
                <p style={{ color: 'var(--color-gray-500)', marginBottom: '16px' }}>
                  Подтверждено: {confirmed.length}
                  {pendingCount > 0 ? `, ждут решения: ${pendingCount}` : ''}
                  {pendingCount > 0 && ' (заявки рассматриваются в разделе «Мероприятия»)'}
                </p>

                {!event.started && (
                  <p style={{ marginBottom: '12px' }}>Явку можно будет отметить с дня мероприятия.</p>
                )}

                {event.started && confirmed.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => markAll(true)}>Отметить всех присутствующими</button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => markAll(false)}>Отметить всех отсутствующими</button>
                  </div>
                )}

                {registrations.length === 0 ? (
                  <p style={{ color: 'var(--color-gray-500)' }}>Пока никто не записался.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="event-people">
                      <thead>
                        <tr>
                          <th>Участник</th>
                          <th>Клуб</th>
                          <th>Заявка</th>
                          {event.started && <th>Явка</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((r) => {
                          const mark = markOf(r);
                          return (
                            <tr key={r.id}>
                              <td>
                                {r.full_name || 'Без имени'}
                                {r.class_name ? <span className="muted"> · {r.class_name} кл.</span> : null}
                              </td>
                              <td>{r.club_name || '—'}</td>
                              <td>{{ confirmed: 'Подтверждена', pending: 'Ждёт решения', rejected: 'Отклонена' }[r.status] || r.status}</td>
                              {event.started && (
                                <td>
                                  {r.status === 'confirmed' ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        type="button"
                                        className={mark === true ? 'btn-success btn-sm' : 'btn-secondary btn-sm'}
                                        aria-pressed={mark === true}
                                        onClick={() => setMark(r, mark === true ? null : true)}
                                      >
                                        Был
                                      </button>
                                      <button
                                        type="button"
                                        className={mark === false ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                                        aria-pressed={mark === false}
                                        onClick={() => setMark(r, mark === false ? null : false)}
                                      >
                                        Не был
                                      </button>
                                    </div>
                                  ) : '—'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {event.started && confirmed.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-primary" disabled={busy || changed === 0} onClick={saveAttendance}>
                      {changed > 0 ? `Сохранить явку (${changed})` : 'Сохранить явку'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {payload.can_manage && event.moderation_status === 'approved' && (
              <div className="card">
                <h3 style={{ marginBottom: '12px' }}>{event.is_completed ? 'Итоги мероприятия' : 'Завершение'}</h3>
                {!event.started ? (
                  <p style={{ color: 'var(--color-gray-500)' }}>Завершить мероприятие можно с его первого дня.</p>
                ) : (
                  <>
                    <label htmlFor="results" style={{ display: 'block', marginBottom: '6px' }}>
                      Что получилось, чем закончилось (увидят участники)
                    </label>
                    <textarea
                      id="results"
                      rows={5}
                      maxLength={5000}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      style={{ width: '100%', marginBottom: '12px' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button type="button" className="btn-primary" disabled={busy} onClick={complete}>
                        {event.is_completed ? 'Сохранить итоги' : 'Завершить мероприятие'}
                      </button>
                      {event.is_completed && (
                        <button type="button" className="btn-secondary" disabled={busy} onClick={reopen}>
                          Вернуть в предстоящие
                        </button>
                      )}
                    </div>
                    {!event.is_completed && (
                      <p style={{ marginTop: '10px', color: 'var(--color-gray-500)', fontSize: '13px' }}>
                        Перед завершением отметьте явку. Участникам придёт уведомление с итогами.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <style>{`
        .event-people { width: 100%; border-collapse: collapse; font-size: 14px; }
        .event-people th, .event-people td {
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid var(--color-gray-200);
          vertical-align: middle;
        }
        .event-people th { color: var(--color-gray-500); font-weight: 600; }
        .event-people .muted { color: var(--color-gray-500); }
        .tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: var(--color-gray-100);
          color: var(--color-primary);
        }
        .tag-closed { color: var(--color-gray-500); }
        .tag-pending { background: var(--color-gold-pale); color: var(--color-gold-dark); }
        .tag-rejected { background: var(--color-error-bg); color: var(--color-error); }
      `}</style>
    </div>
  );
}
