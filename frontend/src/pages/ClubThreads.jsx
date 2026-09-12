// frontend/src/pages/ClubThreads.jsx
//
// Переписка между КЮДами. Спросить у соседнего клуба, как они проводили
// занятие, попросить материалы, сговориться о совместном выезде.
//
// Отдельно от «Обращений»: те устроены как «снизу вверх», в администрацию,
// и смешивать с ними разговор равных — значит завалить администрации почту.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function ClubThreads() {
  const [profile, setProfile] = useState(null);
  const [threads, setThreads] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [myClubIds, setMyClubIds] = useState([]);
  const [openThread, setOpenThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({ to_club_id: '', to_user_id: '', subject: '', message: '' });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me?.id) { navigate('/login'); return; }
      setProfile(me);

      const [list, allClubs, mine] = await Promise.all([
        api.getClubThreads(),
        api.getClubs(),
        api.getMyClubs ? api.getMyClubs() : Promise.resolve([])
      ]);
      setThreads(list);
      setClubs(allClubs);
      setMyClubIds((mine || []).map((c) => c.id || c.club_id).filter(Boolean));
    } catch (err) {
      console.error('❌ Ошибка загрузки переписки:', err);
    } finally {
      setLoading(false);
    }
  };

  const pickClub = async (clubId) => {
    setForm((f) => ({ ...f, to_club_id: clubId, to_user_id: '' }));
    setRecipients([]);
    if (!clubId) return;
    setRecipients(await api.getClubRecipients(clubId));
  };

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await api.createClubThread({
        to_club_id: form.to_club_id,
        to_user_id: form.to_user_id || null,
        subject: form.subject,
        message: form.message
      });
      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось отправить'));
        setMessageType('error');
        return;
      }
      setForm({ to_club_id: '', to_user_id: '', subject: '', message: '' });
      setRecipients([]);
      setShowForm(false);
      setMessage('Отправлено');
      setMessageType('success');
      setThreads(await api.getClubThreads());
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setBusy(false);
    }
  };

  const open = async (id) => {
    setOpenThread(await api.getClubThread(id));
    setReply('');
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const result = await api.replyToClubThread(openThread.id, reply);
      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось ответить'));
        setMessageType('error');
        return;
      }
      setReply('');
      setOpenThread(await api.getClubThread(openThread.id));
      setThreads(await api.getClubThreads());
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    const next = openThread.status === 'closed' ? 'open' : 'closed';
    await api.setClubThreadStatus(openThread.id, next);
    setOpenThread(await api.getClubThread(openThread.id));
    setThreads(await api.getClubThreads());
  };

  const otherClubs = clubs.filter((c) => !myClubIds.includes(c.id) && c.status !== 'archived');

  if (loading) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page" style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <span className="page-header-icon"><Icon name="chat" size={26} /></span>
          <div>
            <h1 className="page-title">Переписка КЮДов</h1>
            <p className="page-subtitle">
              Вопросы соседним клубам: как провели занятие, поделиться материалами,
              договориться о совместном выезде. Видят только сотрудники двух КЮДов.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Icon name="plus" size={15} />
              {showForm ? 'Закрыть' : 'Написать КЮДу'}
            </button>
          </div>
        </div>

        {message && (
          <div className={messageType === 'success' ? 'message message-success' : 'message message-error'}>
            {message}
          </div>
        )}

        {showForm && (
          <div className="card">
            <h3>Новое обращение</h3>
            <form onSubmit={send}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Кому — КЮД <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={form.to_club_id}
                    onChange={(e) => pickClub(e.target.value)}
                    required
                  >
                    <option value="">Выберите КЮД</option>
                    {otherClubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Кому — сотрудник</label>
                  <select
                    className="form-control"
                    value={form.to_user_id}
                    onChange={(e) => setForm({ ...form, to_user_id: e.target.value })}
                    disabled={!form.to_club_id}
                  >
                    <option value="">Всему КЮДу</option>
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name} — {r.position_label}
                      </option>
                    ))}
                  </select>
                  <small>
                    Адресат получит отдельное уведомление. Переписку всё равно видят
                    сотрудники обоих КЮДов — чтобы было кому ответить, если человек в отпуске.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Тема <span className="required">*</span></label>
                <input
                  className="form-control"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Например: материалы занятия по переговорам"
                  required
                />
              </div>

              <div className="form-group">
                <label>Сообщение <span className="required">*</span></label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'Отправляем…' : 'Отправить'}
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h3>Переписка <span className="badge badge-neutral">{threads.length}</span></h3>

          {threads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="chat" /></div>
              <h3>Переписки пока нет</h3>
              <p>
                Напишите соседнему КЮДу — вопрос останется в платформе, а не в личном
                мессенджере, и его увидят те, кто придёт работать после вас.
              </p>
            </div>
          ) : (
            <div className="list">
              {threads.map((t) => (
                <button
                  key={t.id}
                  className="list-row"
                  onClick={() => open(t.id)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <div className="title">
                    {t.subject}
                    {t.status === 'closed' && (
                      <span className="badge badge-neutral" style={{ marginLeft: '8px' }}>закрыт</span>
                    )}
                  </div>
                  <div className="subtitle">
                    {[
                      t.started_by_us ? `Мы → ${t.partner_club_name}` : `${t.partner_club_name} → нам`,
                      t.to_user_name ? `лично: ${t.to_user_name}` : null,
                      `сообщений: ${t.messages_count}`,
                      new Date(t.last_message_at).toLocaleDateString('ru-RU')
                    ].filter(Boolean).join(' · ')}
                  </div>
                  {t.last_message && <div className="meta">{t.last_message.slice(0, 140)}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {openThread && (
        <div className="modal-overlay" onClick={() => setOpenThread(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{openThread.subject}</h3>
              <button className="modal-close" onClick={() => setOpenThread(null)}>
                <Icon name="close" />
              </button>
            </div>

            <p style={{ color: 'var(--color-gray-500)', fontSize: '13px', marginBottom: '12px' }}>
              {openThread.from_club_name} → {openThread.to_club_name}
              {openThread.to_user_name ? ` · лично: ${openThread.to_user_name}` : ''}
            </p>

            <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '16px' }}>
              {(openThread.messages || []).map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 12px',
                    marginBottom: '8px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-gray-50)',
                    borderLeft: '3px solid var(--color-gold)'
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '4px' }}>
                    {[m.author_name || 'Сотрудник', m.author_club_name, new Date(m.created_at).toLocaleString('ru-RU')]
                      .filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Ответ</label>
              <textarea
                className="form-control"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={sendReply} disabled={busy || !reply.trim()}>
                Ответить
              </button>
              <button className="btn-outline" onClick={toggleStatus}>
                {openThread.status === 'closed' ? 'Вернуть в работу' : 'Вопрос закрыт'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
