// frontend/src/pages/MyDelegations.jsx
//
// «Мои делегации» — то, что видит руководитель делегации и руководитель КЮДа.
//
// Руководитель делегации — роль на один выезд, а не должность в клубе. В
// марте детей везёт учитель истории, в мае — заместитель руководителя КЮДа.
// Поэтому доступ сюда даёт запись о руководителе в самой заявке, а не
// глобальная роль: человеку, который везёт группу один раз в году, незачем
// открывать заметки о детях и отчёты клуба на весь год.
//
// Главный экран — таблица «кто что сделал» и сводка проезда: раньше
// руководитель выяснял, кто когда прилетает, обзванивая семьи накануне.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import { confirmAction } from '../lib/confirm';

const MODE_LABELS = {
  plane: 'Самолёт', train: 'Поезд', bus: 'Автобус', car: 'Машина', other: 'Другое'
};

const TICKETS_BY = {
  family: 'Билеты покупают семьи',
  club: 'Билеты покупает КЮД',
  movement: 'Билеты покупает движение'
};

function formatRange(from, to) {
  if (!from) return '';
  const f = new Date(from);
  const opts = { day: 'numeric', month: 'long' };
  if (!to || to === from) return f.toLocaleDateString('ru-RU', { ...opts, year: 'numeric' });
  return `${f.toLocaleDateString('ru-RU', opts)} — ${new Date(to).toLocaleDateString('ru-RU', { ...opts, year: 'numeric' })}`;
}

function formatMoment(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function MyDelegations() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [list, setList] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me?.id) { navigate('/login'); return; }
      setProfile(me);
      setList(await api.getMyDelegations());
    } catch (err) {
      console.error('❌ Ошибка загрузки делегаций:', err);
    } finally {
      setLoading(false);
    }
  };

  const open = async (id) => {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id);
    setDetail(null);
    const data = await api.getDelegation(id);
    if (data?.error) {
      setMessage(api.describeApiError(data, 'Не удалось открыть делегацию'));
      setMessageType('error');
      return;
    }
    setDetail(data);
  };

  const reload = async () => setDetail(await api.getDelegation(openId));

  const show = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  if (loading) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <h1 className="page-title">Мои делегации</h1>
        <p className="page-subtitle">
          Группы, которые вы везёте. Видно, кто что успел подготовить и кто когда приезжает.
        </p>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>{message}</div>
        )}

        {list.length === 0 && (
          <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-gray-400)', marginBottom: '10px' }}>
              <Icon name="megaphone" size={28} />
            </div>
            <h3 style={{ marginTop: 0 }}>Делегаций пока нет</h3>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '14px', margin: 0 }}>
              Здесь появятся утверждённые команды вашего КЮДа и выезды, на которых
              вас назначили руководителем делегации.
            </p>
          </div>
        )}

        {list.map((d) => (
          <div key={d.id} className="card" style={{ padding: 0, marginBottom: '16px', overflow: 'hidden' }}>
            <button
              onClick={() => open(d.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '18px 20px',
                background: 'none', border: 'none', cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                {d.event_title}
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--color-gray-600)', marginTop: '4px' }}>
                {d.club_name} · {formatRange(d.event_date, d.end_date)}
                {d.location && ` · ${d.location}`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '6px' }}>
                Детей в составе: {d.students_count}
                {' · '}
                {d.leader_name || d.leader_user_id
                  ? `Руководитель: ${d.leader_name || 'назначен'}`
                  : 'Руководитель делегации не назначен'}
              </div>
            </button>

            {openId === d.id && !detail && (
              <div style={{ padding: '0 20px 20px' }}><div className="spinner" /></div>
            )}

            {openId === d.id && detail && (
              <DelegationDetail
                detail={detail}
                busy={busy}
                setBusy={setBusy}
                reload={reload}
                refreshList={async () => setList(await api.getMyDelegations())}
                show={show}
              />
            )}
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}

function DelegationDetail({ detail, busy, setBusy, reload, refreshList, show }) {
  const { submission, members, items, progress, travel, can_manage: canManage } = detail;
  const students = members.filter((m) => m.role_in_team !== 'escort');
  const participantItems = items.filter((i) => i.responsible === 'participant');
  const leaderItems = items.filter((i) => i.responsible === 'leader');

  const isDone = (itemId, memberId) =>
    progress.some((p) => p.item_id === itemId && p.member_id === memberId && p.done);

  const travelOf = (memberId, direction) =>
    travel.find((t) => t.member_id === memberId && t.direction === direction);

  const toggleLeaderItem = async (item) => {
    // Пункт на всю группу отмечается один раз — вешаем отметку на первого
    // участника состава, чтобы не плодить отдельную таблицу для группы
    const anchor = members[0];
    if (!anchor) return;
    setBusy(true);
    try {
      await api.setTripProgress({
        item_id: item.id,
        member_id: anchor.id,
        done: !isDone(item.id, anchor.id)
      });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '0 20px 22px' }}>
      {/* ===== РУКОВОДИТЕЛЬ ДЕЛЕГАЦИИ ===== */}
      <LeaderBlock
        submission={submission}
        canManage={canManage}
        busy={busy}
        setBusy={setBusy}
        onSaved={async () => { await reload(); await refreshList(); show('Руководитель делегации сохранён'); }}
      />

      {/* ===== ПУНКТЫ НА ГРУППУ ===== */}
      {leaderItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: 'var(--color-primary-dark)' }}>
            Ваши задачи по группе
          </h4>
          {leaderItems.map((item) => {
            const anchor = members[0];
            const done = anchor && isDone(item.id, anchor.id);
            return (
              <label key={item.id} style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '12px 14px', marginBottom: '8px', cursor: canManage ? 'pointer' : 'default',
                background: done ? 'var(--color-gray-50)' : 'white',
                border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-sm)'
              }}>
                <input
                  type="checkbox"
                  checked={!!done}
                  disabled={busy || !canManage}
                  onChange={() => toggleLeaderItem(item)}
                  style={{ marginTop: '3px', width: '17px', height: '17px' }}
                />
                <div>
                  <div style={{
                    fontSize: '14px', fontWeight: 500,
                    textDecoration: done ? 'line-through' : 'none',
                    color: done ? 'var(--color-gray-500)' : 'var(--color-gray-800)'
                  }}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: '12.5px', color: 'var(--color-gray-600)', marginTop: '3px' }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* ===== КТО ЧТО СДЕЛАЛ ===== */}
      <div style={{ marginTop: '22px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: 'var(--color-primary-dark)' }}>
          Готовность группы
        </h4>

        {participantItems.length === 0 ? (
          <div style={{ fontSize: '13.5px', color: 'var(--color-gray-500)' }}>
            Список подготовки пока пуст — добавьте пункты ниже.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '520px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Участник</th>
                  {participantItems.map((i) => (
                    <th key={i.id} style={{ fontSize: '11.5px', whiteSpace: 'normal', minWidth: '90px' }}>
                      {i.title}
                    </th>
                  ))}
                  <th style={{ minWidth: '70px' }}>Готов</th>
                </tr>
              </thead>
              <tbody>
                {students.map((m) => {
                  const total = participantItems.filter((i) => i.is_required).length;
                  const ready = participantItems.filter((i) => i.is_required && isDone(i.id, m.id)).length;
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: '13px' }}>{m.full_name}</td>
                      {participantItems.map((i) => (
                        <td key={i.id} style={{ textAlign: 'center' }}>
                          {isDone(i.id, m.id)
                            ? <span style={{ color: 'var(--color-primary-light)' }}><Icon name="check" size={15} /></span>
                            : <span style={{ color: 'var(--color-gray-300)' }}>—</span>}
                        </td>
                      ))}
                      <td style={{
                        fontSize: '12.5px', fontWeight: 600,
                        color: ready === total ? 'var(--color-primary-light)' : 'var(--color-gold-dark)'
                      }}>
                        {ready} / {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== СВОДКА ПРОЕЗДА ===== */}
      <div style={{ marginTop: '22px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--color-primary-dark)' }}>
          Проезд
        </h4>
        <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginBottom: '10px' }}>
          {TICKETS_BY[submission.tickets_by] || TICKETS_BY.family}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '560px' }}>
            <thead>
              <tr>
                <th>Участник</th>
                <th>Туда</th>
                <th>Прибытие</th>
                <th>Обратно</th>
                <th>Куплены</th>
              </tr>
            </thead>
            <tbody>
              {students.map((m) => {
                const there = travelOf(m.id, 'there');
                const back = travelOf(m.id, 'back');
                return (
                  <tr key={m.id}>
                    <td style={{ fontSize: '13px' }}>{m.full_name}</td>
                    <td style={{ fontSize: '12.5px' }}>
                      {there?.carrier_number
                        ? `${MODE_LABELS[there.mode] || ''} ${there.carrier_number}`
                        : '—'}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {formatMoment(there?.arrive_at)}
                      {there?.point_name && <div style={{ color: 'var(--color-gray-500)' }}>{there.point_name}</div>}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {back?.carrier_number
                        ? `${MODE_LABELS[back.mode] || ''} ${back.carrier_number}`
                        : '—'}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {there?.bought && back?.bought
                        ? 'да'
                        : there?.bought || back?.bought ? 'частично' : 'нет'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== УПРАВЛЕНИЕ ПУНКТАМИ ===== */}
      {canManage && (
        <ItemsEditor
          submission={submission}
          items={items}
          busy={busy}
          setBusy={setBusy}
          reload={reload}
          show={show}
        />
      )}
    </div>
  );
}

function LeaderBlock({ submission, canManage, busy, setBusy, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    leader_name: submission.leader_name || '',
    leader_phone: submission.leader_phone || '',
    leader_note: submission.leader_note || ''
  });

  const current = submission.leader_user_name || submission.leader_name;
  const phone = submission.leader_user_phone || submission.leader_phone;

  const save = async () => {
    setBusy(true);
    try {
      await api.setDelegationLeader(submission.id, {
        leader_user_id: submission.leader_user_id || null,
        ...form
      });
      setEditing(false);
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      marginTop: '4px', padding: '14px 16px',
      background: 'var(--color-gray-50)',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
        Руководитель делегации
      </div>

      {!editing && (
        <div style={{ fontSize: '13.5px', color: 'var(--color-gray-700)', marginTop: '4px' }}>
          {current ? (
            <>
              {current}{phone && `, ${phone}`}
              {submission.leader_note && (
                <div style={{ color: 'var(--color-gray-500)', fontSize: '12.5px', marginTop: '2px' }}>
                  {submission.leader_note}
                </div>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--color-gray-500)' }}>
              Не назначен. Это роль на один выезд — ей может быть сотрудник КЮДа,
              представитель движения или учитель школы.
            </span>
          )}
          {canManage && (
            <div style={{ marginTop: '8px' }}>
              <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
                {current ? 'Изменить' : 'Назначить'}
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <input
              className="form-input"
              placeholder="ФИО руководителя"
              value={form.leader_name}
              onChange={(e) => setForm({ ...form, leader_name: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Телефон"
              value={form.leader_phone}
              onChange={(e) => setForm({ ...form, leader_phone: e.target.value })}
            />
          </div>
          <input
            className="form-input"
            style={{ marginTop: '10px' }}
            placeholder="Кем приходится: учитель школы, сотрудник КЮДа, представитель движения"
            value={form.leader_note}
            onChange={(e) => setForm({ ...form, leader_note: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button className="btn-primary btn-sm" disabled={busy} onClick={save}>Сохранить</button>
            <button className="btn-secondary btn-sm" onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_ITEM = {
  title: '', description: '', responsible: 'participant',
  kind: 'check', is_required: true, due_date: ''
};

function ItemsEditor({ submission, items, busy, setBusy, reload, show }) {
  const [form, setForm] = useState(EMPTY_ITEM);
  const [open, setOpen] = useState(false);

  const add = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const result = await api.addTripChecklistItem(submission.event_id, {
        ...form,
        club_id: submission.club_id,
        due_date: form.due_date || null
      });
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось добавить пункт'), 'error');
        return;
      }
      setForm(EMPTY_ITEM);
      setOpen(false);
      await reload();
      show('Пункт добавлен');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!await confirmAction({
      title: 'Убрать пункт подготовки?',
      text: 'Отметки участников по нему тоже пропадут.',
      confirmLabel: 'Убрать',
      tone: 'danger'
    })) return;
    setBusy(true);
    try {
      await api.removeTripChecklistItem(item.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const own = items.filter((i) => i.club_id === submission.club_id);
  const common = items.filter((i) => !i.club_id);

  return (
    <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--color-gray-200)' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--color-primary-dark)' }}>
        Список подготовки
      </h4>
      <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
        Общие пункты задаёт движение — их видят все делегации этого выезда.
        Свои пункты видит только ваша группа.
      </div>

      {common.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
            От движения
          </div>
          {common.map((i) => (
            <div key={i.id} style={{
              fontSize: '13px', padding: '8px 12px', marginBottom: '5px',
              background: 'var(--color-gold-pale)',
              border: '1px solid var(--color-gold-light)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {i.title}
              <span style={{ color: 'var(--color-gray-500)', fontSize: '12px' }}>
                {' '}· {i.responsible === 'leader' ? 'руководитель' : 'участник'}
              </span>
            </div>
          ))}
        </div>
      )}

      {own.map((i) => (
        <div key={i.id} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13px', padding: '8px 12px', marginBottom: '5px',
          background: 'var(--color-gray-50)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <span style={{ flex: 1 }}>
            {i.title}
            <span style={{ color: 'var(--color-gray-500)', fontSize: '12px' }}>
              {' '}· {i.responsible === 'leader' ? 'руководитель' : 'участник'}
              {!i.is_required && ' · по желанию'}
            </span>
          </span>
          <button
            onClick={() => remove(i)}
            title="Убрать пункт"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-gray-400)', display: 'flex'
            }}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}

      {!open && (
        <button className="btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={() => setOpen(true)}>
          Добавить пункт
        </button>
      )}

      {open && (
        <div style={{
          marginTop: '10px', padding: '14px',
          border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-sm)'
        }}>
          <input
            className="form-input"
            placeholder="Например: медицинская справка"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="form-input"
            style={{ marginTop: '10px' }}
            placeholder="Пояснение: где взять, что именно нужно"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px', marginTop: '10px'
          }}>
            <select
              className="form-input"
              value={form.responsible}
              onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            >
              <option value="participant">Делает участник или родитель</option>
              <option value="leader">Делает руководитель делегации</option>
            </select>
            <input
              className="form-input"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            margin: '12px 0', fontSize: '13.5px', cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={form.is_required}
              onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            Обязательный пункт
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary btn-sm" disabled={busy} onClick={add}>Добавить</button>
            <button className="btn-secondary btn-sm" onClick={() => { setOpen(false); setForm(EMPTY_ITEM); }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
