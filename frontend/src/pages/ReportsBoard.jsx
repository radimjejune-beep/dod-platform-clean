// frontend/src/pages/ReportsBoard.jsx
//
// Сдача отчётов: все КЮДы за один месяц на одном экране.
//
// До этого координатор движения держал в голове, кто сдал, а кто нет, и
// писал молчащим сам. Здесь видно и то, и другое, и кнопка, которая
// пишет за него.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

const STATES = {
  approved:  { label: 'Утверждён',  color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  submitted: { label: 'На проверке', color: 'var(--color-gold)',   bg: 'var(--color-gold-pale)' },
  returned:  { label: 'Возвращён',  color: 'var(--color-error)',   bg: 'var(--color-error-bg)' },
  draft:     { label: 'Черновик',   color: 'var(--color-gray-600)', bg: 'var(--color-gray-100)' },
  none:      { label: 'Нет отчёта', color: 'var(--color-error)',   bg: 'var(--color-error-bg)' },
};

// Последние 12 месяцев: раньше отчётов всё равно нет
function monthOptions() {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

function monthLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return MONTH_NAMES[m - 1] ? `${MONTH_NAMES[m - 1]} ${y}` : ym;
}

function humanDate(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10).split('-').reverse().join('.');
}

export default function ReportsBoard() {
  const [profile, setProfile] = useState(null);
  const [board, setBoard] = useState(null);
  const [month, setMonth] = useState(monthOptions()[0]);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [message, setMessage] = useState('');
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const navigate = useNavigate();

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
        const data = await api.getReportsBoard(month);
        if (alive) setBoard(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [month, navigate]);

  const remind = async () => {
    setReminding(true);
    setMessage('');
    try {
      const result = await api.remindAboutReports(month);
      if (result?.error) throw new Error(api.describeApiError(result));
      setMessage(
        result.people === 0
          ? 'Напоминать некому: отчёты сдали все.'
          : `Напоминание ушло: ${result.people} чел. из ${result.clubs} КЮДов.`
      );
      setBoard(await api.getReportsBoard(month));
    } catch (err) {
      setMessage(err.message || 'Не удалось отправить напоминание');
    } finally {
      setReminding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const summary = board?.summary || {};
  const clubs = (board?.clubs || []).filter(
    (c) => !onlyWaiting || ['none', 'draft', 'returned'].includes(c.state)
  );

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">Сдача отчётов</h1>
            <p className="page-subtitle">
              {board?.due_date
                ? <>Отчёт за {monthLabel(month)} ждали до {humanDate(board.due_date)}
                    {board.overdue ? ' — срок прошёл' : ''}</>
                : <>Отчёты КЮДов за {monthLabel(month)}</>}
            </p>
          </div>
        </div>

        {message && <div className="message-success" style={{ marginBottom: '16px' }}>{message}</div>}

        <div className="card" style={{
          display: 'flex', gap: '12px', alignItems: 'center',
          flexWrap: 'wrap', marginBottom: '18px'
        }}>
          <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ minWidth: '170px' }}>
            {monthOptions().map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>

          <button
            className="btn-gold"
            onClick={remind}
            disabled={reminding || !summary.waiting}
            title={summary.waiting ? '' : 'Отчёты сдали все'}
          >
            {reminding ? 'Отправляем…' : `Напомнить тем, кто не сдал (${summary.waiting || 0})`}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} />
            Показать только тех, кого ждём
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <Tile value={summary.approved} label="Утверждено" color="var(--color-success)" />
          <Tile value={summary.submitted} label="На проверке" color="var(--color-gold)" />
          <Tile value={summary.draft} label="Черновик" color="var(--color-gray-600)" />
          <Tile value={summary.returned} label="Возвращено" color="var(--color-error)" />
          <Tile value={summary.none} label="Нет отчёта" color="var(--color-error)" />
        </div>

        {summary.no_head > 0 && (
          <div className="message-error" style={{ marginBottom: '18px' }}>
            {summary.no_head} КЮДов без руководителя в платформе — напоминание туда отправить некому.
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {clubs.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--color-gray-500)', fontSize: '14px' }}>
              {onlyWaiting ? 'Все сдали. Ждать некого.' : 'КЮДов нет.'}
            </div>
          ) : clubs.map((c) => {
            const state = STATES[c.state] || STATES.none;
            return (
              <div key={c.club_id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                padding: '12px 16px', borderBottom: '1px solid var(--color-gray-100)'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                    {c.club_name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                    {c.head_name
                      ? <>Руководитель: {c.head_name}</>
                      : <span style={{ color: 'var(--color-error)' }}>Руководителя нет</span>}
                    {c.submitted_at && ` · сдан ${humanDate(c.submitted_at)}`}
                  </div>
                  {c.state === 'returned' && c.reviewer_comment && (
                    <div style={{ fontSize: '12.5px', color: 'var(--color-gray-600)', marginTop: '4px' }}>
                      Возвращён: {c.reviewer_comment}
                    </div>
                  )}
                </div>

                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '4px 10px',
                  borderRadius: '999px', whiteSpace: 'nowrap',
                  color: state.color, background: state.bg
                }}>
                  {state.label}
                </span>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '14px' }}>
          <Icon name="info" size={13} /> Срок сдачи — {board?.due_day || 5}-е число следующего месяца.
        </p>
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
        fontSize: '22px', fontWeight: 700, color
      }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
