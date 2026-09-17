// frontend/src/pages/TripOverview.jsx
//
// Выезд целиком: все клубы, которых он касается, одной таблицей.
//
// Раньше подготовка выезда жила на нескольких экранах — команды отдельно,
// документы отдельно, билеты отдельно, руководители делегаций отдельно, —
// и чтобы понять, кого ждём, приходилось обойти их все и сложить в
// голове. Здесь одна строка на клуб и весь путь в ней.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

// Шаги идут по порядку: пока не подана команда, говорить про билеты
// бессмысленно. Клуб стоит на первом незакрытом шаге.
const STAGES = {
  team:      { label: 'Не подал команду', color: 'var(--color-error)',    bg: 'var(--color-error-bg)' },
  revision:  { label: 'Вернули на доработку', color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
  review:    { label: 'Ждёт проверки',   color: 'var(--color-gold)',      bg: 'var(--color-gold-pale)' },
  documents: { label: 'Собирает документы', color: 'var(--color-gold)',   bg: 'var(--color-gold-pale)' },
  leader:    { label: 'Нет руководителя делегации', color: 'var(--color-gold)', bg: 'var(--color-gold-pale)' },
  tickets:   { label: 'Покупает билеты', color: 'var(--color-gold)',      bg: 'var(--color-gold-pale)' },
  ready:     { label: 'Готов',           color: 'var(--color-success)',   bg: 'var(--color-success-bg)' },
};

function humanDate(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10).split('-').reverse().join('.');
}

export default function TripOverview() {
  const { eventId } = useParams();
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const overview = await api.getTripOverview(eventId);
    setData(overview);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const me = await api.getMe();
        if (!alive) return;
        if (!['admin', 'movement_coordinator', 'president', 'vice_president'].includes(me?.role)) {
          navigate('/dashboard');
          return;
        }
        setProfile(me);
        await load();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const toggle = (clubId) => {
    setPicked((prev) => prev.includes(clubId)
      ? prev.filter((id) => id !== clubId)
      : [...prev, clubId]);
  };

  const pickAllWaiting = () => {
    setPicked((data?.clubs || []).filter((c) => c.stage !== 'ready').map((c) => c.club_id));
  };

  const send = async () => {
    setSending(true);
    setMessage('');
    try {
      const result = await api.remindTripClubs(eventId, picked, text);
      if (result?.error) throw new Error(api.describeApiError(result));
      setMessage(`Сообщение ушло: ${result.people} чел. из ${result.clubs} КЮДов.`);
      setPicked([]);
      setText('');
      await load();
    } catch (err) {
      setMessage(err.message || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const event = data?.event || {};
  const summary = data?.summary || {};
  const clubs = data?.clubs || [];

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">{event.title || 'Выезд'}</h1>
            <p className="page-subtitle">
              {humanDate(event.event_date)}
              {event.end_date && ` — ${humanDate(event.end_date)}`}
              {event.location && ` · ${event.location}`}
            </p>
          </div>
        </div>

        {message && <div className="message-success" style={{ marginBottom: '16px' }}>{message}</div>}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <Tile value={summary.clubs} label="КЮДов" />
          <Tile value={summary.students} label="Детей" />
          <Tile value={summary.escorts} label="Сопровождающих" />
          <Tile value={summary.ready} label="Готовы" color="var(--color-success)" />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '18px' }}>
          {clubs.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--color-gray-500)', fontSize: '14px' }}>
              На этот выезд не приглашён ни один КЮД.
            </div>
          ) : clubs.map((c) => {
            const stage = STAGES[c.stage] || STAGES.team;
            const students = Number(c.students || 0);
            return (
              <label
                key={c.club_id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap',
                  padding: '12px 16px', borderBottom: '1px solid var(--color-gray-100)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={picked.includes(c.club_id)}
                  onChange={() => toggle(c.club_id)}
                  style={{ marginTop: '3px' }}
                />

                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                    {c.club_name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                    {students} из {c.quota ?? '—'} по квоте
                    {Number(c.escorts) > 0 && ` · сопровождающих ${c.escorts}`}
                    {c.deadline && ` · срок подачи ${humanDate(c.deadline)}`}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-gray-600)', marginTop: '4px' }}>
                    Документы {c.with_docs}/{students}
                    {' · '}Билеты {c.with_tickets}/{students}
                    {Number(c.checklist_total) > 0 && ` · подготовка ${c.checklist_done}/${c.checklist_total}`}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                    {c.leader_display
                      ? <>Руководитель делегации: {c.leader_display}</>
                      : <span style={{ color: 'var(--color-gray-400)' }}>Руководитель делегации не назначен</span>}
                    {c.head_name
                      ? ` · КЮД: ${c.head_name}`
                      : <span style={{ color: 'var(--color-error)' }}> · у КЮДа нет руководителя</span>}
                  </div>
                </div>

                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '4px 10px',
                  borderRadius: '999px', color: stage.color, background: stage.bg
                }}>
                  {stage.label}
                </span>
              </label>
            );
          })}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '16px' }}>Написать выбранным КЮДам</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-600)', marginTop: 0, marginBottom: '12px' }}>
            Сообщение уйдёт руководителю и заместителю каждого отмеченного КЮДа.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            <button className="btn-secondary btn-sm" type="button" onClick={pickAllWaiting}>
              Отметить всех, кого ждём
            </button>
            {picked.length > 0 && (
              <button className="btn-secondary btn-sm" type="button" onClick={() => setPicked([])}>
                Снять отметки ({picked.length})
              </button>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Например: до пятницы пришлите свидетельства о рождении — без них не оформим проезд"
            style={{ width: '100%', marginBottom: '12px' }}
          />

          <button
            className="btn-gold"
            onClick={send}
            disabled={sending || picked.length === 0 || !text.trim()}
          >
            {sending ? 'Отправляем…' : `Отправить (${picked.length})`}
          </button>

          {picked.length === 0 && (
            <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '10px', marginBottom: 0 }}>
              <Icon name="info" size={13} /> Сначала отметьте КЮДы в списке выше.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ value, label, color }) {
  return (
    <div style={{
      flex: '1 1 120px', minWidth: '110px', padding: '12px 14px',
      background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '22px', fontWeight: 700, color: color || 'var(--color-primary-dark)'
      }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
