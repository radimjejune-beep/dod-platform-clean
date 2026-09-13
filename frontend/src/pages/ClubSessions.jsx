// frontend/src/pages/ClubSessions.jsx
//
// Занятия КЮДа и посещаемость.
//
// До этого платформа была нужна несколько раз в год: форум, отчёт, ещё
// форум. Клуб собирается еженедельно, и вся эта работа нигде не
// отражалась — отчёт за месяц писался по памяти, а то, что участник
// перестал ходить, выяснялось в конце года.
//
// Главное решение экрана: при отметке у всех заранее стоит «был».
// Обычно приходит большинство, поэтому отмечать нужно исключения — это
// разница между четырьмя нажатиями и двадцатью. Тот, кто заполняет
// журнал в конце длинного дня, эту разницу чувствует.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { confirmAction, askComment } from '../lib/confirm';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

const MARKS = [
  { code: 'present', label: 'Был',        color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  { code: 'late',    label: 'Опоздал',    color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  { code: 'absent',  label: 'Не был',     color: 'var(--color-error)',   bg: 'var(--color-error-bg)' },
  { code: 'excused', label: 'Уважительная', color: 'var(--color-gray-600)', bg: 'var(--color-gray-100)' }
];

const MARK_LABEL = Object.fromEntries(MARKS.map((m) => [m.code, m.label]));

function monthOf(dateString) {
  return String(dateString || '').slice(0, 7);
}

export default function ClubSessions() {
  const { clubId: clubIdParam } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [clubId, setClubId] = useState(clubIdParam || null);
  const [clubs, setClubs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Создание занятия
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    topic: '',
    location: '',
    duration_minutes: ''
  });
  const [saving, setSaving] = useState(false);

  // Отметка посещаемости
  const [marking, setMarking] = useState(null);      // { session, rows }
  const [marks, setMarks] = useState({});            // participant_id -> status
  const [savingMarks, setSavingMarks] = useState(false);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (clubId) loadSessions(clubId); }, [clubId]);

  const init = async () => {
    try {
      const me = await api.getMe();
      if (!me || !me.id) return;
      setProfile(me);

      const clubsData = await api.getClubs();
      const all = Array.isArray(clubsData) ? clubsData : [];

      // Руководителю КЮДа выпадашка из сорока с лишним клубов не нужна:
      // журнал он ведёт только по своему. Список сужаем до тех клубов,
      // где человек действительно числится.
      const movement = ['admin', 'movement_coordinator', 'president', 'vice_president']
        .includes(me.role);
      const mineClubs = await api.getMyClubs();
      const myIds = new Set((mineClubs?.movement_wide ? [] : (mineClubs?.clubs || []))
        .map((c) => c.club_id || c.id));
      const list = movement || myIds.size === 0
        ? all
        : all.filter((c) => myIds.has(c.id));
      setClubs(list);

      if (!clubId) {
        // Руководителю показываем его клуб сразу; администратору и
        // координатору — первый по списку, потому что именно он и так
        // виден в поле выбора. Пустое значение при непустом списке
        // выглядит как «в этом клубе нет занятий», а это неправда.
        const mine = me.club_id || list[0]?.id || null;
        if (mine) setClubId(mine);
        else setLoading(false);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки занятий:', err);
      setLoading(false);
    }
  };

  const loadSessions = async (id) => {
    setLoading(true);
    try {
      const data = await api.getClubSessions(id);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Ошибка загрузки занятий:', err);
      show('Не удалось загрузить занятия', 'error');
    } finally {
      setLoading(false);
    }
  };

  const show = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    if (type === 'success') setTimeout(() => setMessage(''), 4000);
  };

  const club = clubs.find((c) => c.id === clubId) || null;

  // Сводка за текущий месяц — то, что потом само подставится в отчёт
  const summary = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const inMonth = sessions.filter((s) => monthOf(s.session_date) === month);
    const held = inMonth.filter((s) => s.status === 'held');
    const visits = held.reduce((acc, s) => acc + (s.present_count || 0), 0);
    return {
      month,
      held: held.length,
      cancelled: inMonth.filter((s) => s.status === 'cancelled').length,
      average: held.length === 0 ? null : Math.round((visits / held.length) * 10) / 10
    };
  }, [sessions]);

  const createSession = async (e) => {
    e.preventDefault();
    if (!clubId) return;
    setSaving(true);
    try {
      const result = await api.createClubSession(clubId, {
        session_date: form.session_date,
        topic: form.topic.trim() || null,
        location: form.location.trim() || null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        status: 'planned'
      });
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось создать занятие'), 'error');
      } else {
        setShowForm(false);
        setForm({ session_date: new Date().toISOString().slice(0, 10), topic: '', location: '', duration_minutes: '' });
        await loadSessions(clubId);
        show('Занятие создано — теперь отметьте, кто был');
      }
    } catch (err) {
      console.error('❌ Ошибка создания занятия:', err);
      show('Не удалось создать занятие', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openMarking = async (session) => {
    try {
      const data = await api.getSessionAttendance(session.id);
      const rows = Array.isArray(data?.attendance) ? data.attendance : [];
      setMarking({ session, rows });
      // Заранее ставим всем «был»: отмечать нужно исключения, а не всех
      const initial = {};
      rows.forEach((r) => { initial[r.participant_id] = r.status || 'present'; });
      setMarks(initial);
    } catch (err) {
      console.error('❌ Ошибка загрузки состава:', err);
      show('Не удалось открыть лист посещаемости', 'error');
    }
  };

  const saveMarks = async () => {
    if (!marking) return;
    setSavingMarks(true);
    try {
      const payload = Object.entries(marks).map(([participant_id, status]) => ({ participant_id, status }));
      const result = await api.saveSessionAttendance(marking.session.id, payload);
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось сохранить посещаемость'), 'error');
      } else {
        setMarking(null);
        await loadSessions(clubId);
        show(`Посещаемость сохранена: отмечено ${result.marked}`);
      }
    } catch (err) {
      console.error('❌ Ошибка сохранения посещаемости:', err);
      show('Не удалось сохранить посещаемость', 'error');
    } finally {
      setSavingMarks(false);
    }
  };

  const cancelSession = async (session) => {
    const reason = await askComment({
      title: 'Занятие не состоялось?',
      text: 'Занятие останется в журнале с пометкой и причиной — в статистику проведённых оно не попадёт.',
      confirmLabel: 'Отметить',
      commentLabel: 'Причина',
      commentPlaceholder: 'Карантин, отмена по школе, болезнь ведущего',
      commentRequired: true
    });
    if (!reason) return;
    const result = await api.updateSession(session.id, { status: 'cancelled', cancel_reason: reason });
    if (result?.error) show(api.describeApiError(result, 'Не удалось отменить занятие'), 'error');
    else { await loadSessions(clubId); show('Занятие отмечено как не состоявшееся'); }
  };

  const removeSession = async (session) => {
    if (!await confirmAction({ title: 'Удалить занятие?', tone: 'danger' })) return;
    const result = await api.deleteSession(session.id);
    if (result?.code === 'SESSION_HAS_ATTENDANCE') {
      show(result.error, 'error');
      return;
    }
    if (result?.error) show(api.describeApiError(result, 'Не удалось удалить занятие'), 'error');
    else { await loadSessions(clubId); show('Занятие удалено'); }
  };

  const setAll = (status) => {
    if (!marking) return;
    const next = {};
    marking.rows.forEach((r) => { next[r.participant_id] = status; });
    setMarks(next);
  };

  if (loading && sessions.length === 0 && !clubId) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="page-header">
            <span className="page-header-icon"><Icon name="journal" size={26} /></span>
            <div>
              <h1 className="page-title">Занятия КЮДа</h1>
              <p className="page-subtitle">Выберите клуб, чтобы вести журнал занятий.</p>
            </div>
          </div>
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="club" /></div>
              <h3>Клуб не выбран</h3>
              <p>Откройте нужный КЮД из раздела «КЮДы».</p>
              <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/clubs')}>
                Перейти к КЮДам
              </button>
            </div>
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
          <span className="page-header-icon"><Icon name="journal" size={26} /></span>
          <div>
            <h1 className="page-title">Занятия КЮДа</h1>
            <p className="page-subtitle">
              {club?.name ? `${club.name}. ` : ''}
              Журнал занятий и посещаемости. Из него берутся цифры для отчёта за месяц,
              и по нему видно, кто перестал ходить.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              <Icon name="plus" size={15} />
              {showForm ? 'Закрыть' : 'Новое занятие'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${messageType === 'error' ? 'message-error' : 'message-success'}`}>
            {message}
          </div>
        )}

        {clubs.length > 1 && (
          <div className="toolbar">
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>КЮД:</span>
            <select className="form-control" value={clubId || ''} onChange={(e) => setClubId(e.target.value)}>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* ===== СВОДКА ЗА МЕСЯЦ ===== */}
        <div className="grid-3" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-number">{summary.held}</div>
            <div className="stat-label">занятий в этом месяце</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{summary.average ?? '—'}</div>
            <div className="stat-label">в среднем на занятии</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{summary.cancelled}</div>
            <div className="stat-label">не состоялось</div>
          </div>
        </div>

        {/* ===== НОВОЕ ЗАНЯТИЕ ===== */}
        {showForm && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><h3 className="card-title">Новое занятие</h3></div>
            <form onSubmit={createSession}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Дата<span className="required">*</span></label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.session_date}
                    onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Длительность, минут</label>
                  <input
                    className="form-control"
                    type="number"
                    min="10"
                    max="480"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    placeholder="90"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Тема занятия</label>
                <input
                  className="form-control"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="Например: основы переговоров"
                />
                <span className="form-hint">
                  Тема попадёт в отчёт за месяц — по ней потом видно, чем занимался клуб.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Место</label>
                <input
                  className="form-control"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Кабинет 214"
                />
              </div>
              <div className="btn-group">
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Сохраняем...' : 'Создать занятие'}
                </button>
                <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        )}

        {/* ===== СПИСОК ЗАНЯТИЙ ===== */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Журнал занятий</h3>
            <span className="badge badge-neutral">{sessions.length}</span>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="journal" /></div>
              <h3>Занятий пока нет</h3>
              <p>Создайте первое занятие и отметьте, кто был. Дальше журнал заполнится сам собой.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table table--sticky-actions">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Тема</th>
                    <th className="num">Было</th>
                    <th>Состояние</th>
                    <th>Провёл</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.session_date).toLocaleDateString('ru-RU')}</td>
                      <td>
                        {s.topic || <span style={{ color: 'var(--color-gray-400)' }}>без темы</span>}
                        {s.status === 'cancelled' && s.cancel_reason && (
                          <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                            {s.cancel_reason}
                          </div>
                        )}
                      </td>
                      <td className="num">
                        {s.status === 'held' ? s.present_count : '—'}
                      </td>
                      <td>
                        {s.status === 'held'
                          ? <span className="badge badge-success badge-dot">проведено</span>
                          : s.status === 'cancelled'
                            ? <span className="badge badge-neutral">не состоялось</span>
                            : <span className="badge badge-warning badge-dot">запланировано</span>}
                      </td>
                      <td>{s.conducted_by_name || '—'}</td>
                      <td>
                        <div className="row-actions">
                          {s.status !== 'cancelled' && (
                            <button className="btn-ghost btn-sm" onClick={() => openMarking(s)}>
                              {s.status === 'held' ? 'Изменить отметки' : 'Отметить'}
                            </button>
                          )}
                          {s.status === 'planned' && (
                            <button
                              className="btn-ghost btn-sm btn-icon"
                              title="Занятие не состоялось"
                              aria-label="Занятие не состоялось"
                              onClick={() => cancelSession(s)}
                            >
                              <Icon name="close" />
                            </button>
                          )}
                          {s.marked_count === 0 && (
                            <button
                              className="btn-ghost btn-sm btn-icon row-action-danger"
                              title="Удалить занятие"
                              aria-label="Удалить занятие"
                              onClick={() => removeSession(s)}
                            >
                              <Icon name="trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== ОТМЕТКА ПОСЕЩАЕМОСТИ ===== */}
      {marking && (
        <div className="modal-overlay" onClick={() => setMarking(null)}>
          <div className="modal" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Кто был {new Date(marking.session.session_date).toLocaleDateString('ru-RU')}
              </h3>
              <button className="modal-close" onClick={() => setMarking(null)} aria-label="Закрыть">
                <Icon name="close" />
              </button>
            </div>

            {marking.rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Icon name="users" /></div>
                <h3>В клубе нет участников</h3>
                <p>Сначала добавьте участников в КЮД — отмечать пока некого.</p>
              </div>
            ) : (
              <>
                <div className="toolbar" style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
                    Всем сразу:
                  </span>
                  <div className="btn-segmented">
                    <button type="button" onClick={() => setAll('present')}>были</button>
                    <button type="button" onClick={() => setAll('absent')}>не были</button>
                  </div>
                  <div className="toolbar-spacer" />
                  <span style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
                    Отмечено «был»: {Object.values(marks).filter((m) => m === 'present' || m === 'late').length}
                    {' из '}{marking.rows.length}
                  </span>
                </div>

                <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
                  {marking.rows.map((r) => (
                    <div
                      key={r.participant_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 4px',
                        borderBottom: '1px solid var(--color-gray-100)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{r.full_name}</div>
                        {r.class_name && (
                          <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{r.class_name}</div>
                        )}
                      </div>
                      <div className="btn-group" style={{ gap: '4px' }}>
                        {MARKS.map((m) => {
                          const active = marks[r.participant_id] === m.code;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              className="btn-sm"
                              style={{
                                background: active ? m.bg : 'transparent',
                                color: active ? m.color : 'var(--color-gray-500)',
                                border: `1px solid ${active ? m.color : 'var(--color-gray-200)'}`,
                                fontWeight: active ? 600 : 500
                              }}
                              onClick={() => setMarks({ ...marks, [r.participant_id]: m.code })}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="btn-group" style={{ marginTop: '18px', justifyContent: 'flex-end' }}>
                  <button className="btn-outline" onClick={() => setMarking(null)}>Отмена</button>
                  <button className="btn-primary" onClick={saveMarks} disabled={savingMarks}>
                    {savingMarks ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
