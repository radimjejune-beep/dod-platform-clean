// frontend/src/pages/MyTrips.jsx
//
// «Мой выезд» — то, что видит участник и его родитель после того, как
// команду утвердили.
//
// Раньше платформа доводила ребёнка до утверждённого состава и на этом
// замолкала: что взять, какие справки, когда сбор, какие билеты покупать —
// всё это жило в родительском чате. Здесь тот же список, но с датами,
// отметками и на виду у руководителя делегации.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const TICKETS_BY = {
  family: 'Билеты покупает семья',
  club: 'Билеты на всю группу покупает КЮД',
  movement: 'Билеты покупает движение'
};

const MODES = [
  { value: '', label: '— чем едет —' },
  { value: 'plane', label: 'Самолёт' },
  { value: 'train', label: 'Поезд' },
  { value: 'bus', label: 'Автобус' },
  { value: 'car', label: 'Машина' },
  { value: 'other', label: 'Другое' }
];

function formatRange(from, to) {
  if (!from) return '';
  const f = new Date(from);
  const opts = { day: 'numeric', month: 'long' };
  if (!to || to === from) {
    return f.toLocaleDateString('ru-RU', { ...opts, year: 'numeric' });
  }
  return `${f.toLocaleDateString('ru-RU', opts)} — ${new Date(to).toLocaleDateString('ru-RU', { ...opts, year: 'numeric' })}`;
}

function daysLeft(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  return diff;
}

export default function MyTrips() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me?.id) { navigate('/login'); return; }
      setProfile(me);
      setTrips(await api.getMyTrips());
    } catch (err) {
      console.error('❌ Ошибка загрузки выездов:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (item, memberId) => {
    setBusy(true);
    try {
      await api.setTripProgress({ item_id: item.id, member_id: memberId, done: !item.done });
      setTrips(await api.getMyTrips());
    } finally {
      setBusy(false);
    }
  };

  const saveTravel = async (memberId, direction, form) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api.saveTripTravel({ member_id: memberId, direction, ...form });
      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось сохранить'));
        return;
      }
      setTrips(await api.getMyTrips());
      setMessage('Данные проезда сохранены');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setBusy(false);
    }
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
        <h1 className="page-title">Мои выезды</h1>
        <p className="page-subtitle">
          Форумы и поездки, на которые состав уже утверждён. Здесь всё, что нужно
          сделать до отъезда — отмечайте по мере готовности, это видит руководитель делегации.
        </p>

        {message && <div className="message-success">{message}</div>}

        {trips.length === 0 && (
          <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-gray-400)', marginBottom: '10px' }}>
              <Icon name="megaphone" size={28} />
            </div>
            <h3 style={{ marginTop: 0 }}>Выездов пока нет</h3>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '14px', margin: 0 }}>
              Список появится, когда КЮД подаст команду, а движение её утвердит.
              До этого готовиться не к чему.
            </p>
          </div>
        )}

        {trips.map((trip) => (
          <TripCard
            key={trip.member_id}
            trip={trip}
            busy={busy}
            onToggle={toggle}
            onSaveTravel={saveTravel}
          />
        ))}
      </div>
      <Footer />
    </div>
  );
}

function TripCard({ trip, busy, onToggle, onSaveTravel }) {
  const left = daysLeft(trip.event_date);
  const done = trip.items.filter((i) => i.done).length;
  const required = trip.items.filter((i) => i.is_required);
  const requiredLeft = required.filter((i) => !i.done).length;

  const leaderName = trip.leader_user_name || trip.leader_name;
  const leaderPhone = trip.leader_user_phone || trip.leader_phone;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
      {/* ===== ШАПКА ВЫЕЗДА ===== */}
      <div style={{ padding: '20px 22px', background: 'var(--color-primary-dark)', color: 'white' }}>
        <div style={{
          fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
          color: 'var(--color-gold)', fontWeight: 600
        }}>
          {trip.club_name || 'Делегация'}
        </div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '23px', fontWeight: 700, margin: '6px 0 4px', color: 'white'
        }}>
          {trip.event_title}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.72)' }}>
          {formatRange(trip.event_date, trip.end_date)}
          {trip.location && ` · ${trip.location}`}
        </div>
        {left !== null && left >= 0 && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-gold-light)' }}>
            {left === 0 ? 'Выезд сегодня' : `До выезда ${left} дн.`}
            {requiredLeft > 0 && ` · не сделано обязательных: ${requiredLeft}`}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* ===== СБОР И РУКОВОДИТЕЛЬ ===== */}
        {(trip.gathering_info || leaderName) && (
          <div style={{
            padding: '14px 16px', marginBottom: '18px',
            background: 'var(--color-gold-pale)',
            border: '1px solid var(--color-gold-light)',
            borderRadius: 'var(--radius-sm)', fontSize: '13.5px',
            color: 'var(--color-gray-700)', lineHeight: 1.6
          }}>
            {trip.gathering_info && (
              <div style={{ whiteSpace: 'pre-wrap' }}>{trip.gathering_info}</div>
            )}
            {leaderName && (
              <div style={{ marginTop: trip.gathering_info ? '8px' : 0 }}>
                <strong>Руководитель делегации:</strong> {leaderName}
                {leaderPhone && `, ${leaderPhone}`}
              </div>
            )}
          </div>
        )}

        {/* ===== СПИСОК ПОДГОТОВКИ ===== */}
        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--color-primary-dark)' }}>
          Что нужно сделать
        </h4>
        <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
          Сделано {done} из {trip.items.length}
        </div>

        {trip.items.length === 0 && (
          <div style={{ fontSize: '13.5px', color: 'var(--color-gray-500)', marginBottom: '16px' }}>
            Список подготовки пока не составлен. Он появится ближе к выезду.
          </div>
        )}

        {trip.items.map((item) => {
          const overdue = item.due_date && !item.done && new Date(item.due_date) < new Date();
          return (
            <label
              key={item.id}
              style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '12px 14px', marginBottom: '8px', cursor: 'pointer',
                background: item.done ? 'var(--color-gray-50)' : 'white',
                border: `1px solid ${overdue ? 'var(--color-gold)' : 'var(--color-gray-200)'}`,
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <input
                type="checkbox"
                checked={!!item.done}
                disabled={busy}
                onChange={() => onToggle(item, trip.member_id)}
                style={{ marginTop: '3px', width: '17px', height: '17px', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px', fontWeight: 500,
                  color: item.done ? 'var(--color-gray-500)' : 'var(--color-gray-800)',
                  textDecoration: item.done ? 'line-through' : 'none'
                }}>
                  {item.title}
                  {!item.is_required && (
                    <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontWeight: 400 }}>
                      {' '}· по желанию
                    </span>
                  )}
                </div>
                {item.description && (
                  <div style={{
                    fontSize: '12.5px', color: 'var(--color-gray-600)',
                    marginTop: '3px', lineHeight: 1.5
                  }}>
                    {item.description}
                  </div>
                )}
                {item.due_date && (
                  <div style={{
                    fontSize: '12px', marginTop: '4px',
                    color: overdue ? 'var(--color-gold-dark)' : 'var(--color-gray-500)'
                  }}>
                    {overdue ? 'Срок прошёл: ' : 'До '}
                    {new Date(item.due_date).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            </label>
          );
        })}

        {/* ===== ПРОЕЗД ===== */}
        <div style={{ marginTop: '22px' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--color-primary-dark)' }}>
            Проезд
          </h4>
          <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
            {TICKETS_BY[trip.tickets_by] || TICKETS_BY.family}.
            {trip.tickets_by === 'family'
              ? ' Укажите рейс и время — руководитель делегации будет знать, когда вас встречать.'
              : ' Данные заполнит организатор, вам ничего покупать не нужно.'}
          </div>

          {['there', 'back'].map((direction) => (
            <TravelForm
              key={direction}
              direction={direction}
              value={trip.travel.find((t) => t.direction === direction)}
              editable={trip.tickets_by === 'family'}
              busy={busy}
              onSave={(form) => onSaveTravel(trip.member_id, direction, form)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TravelForm({ direction, value, editable, busy, onSave }) {
  const [form, setForm] = useState({
    mode: value?.mode || '',
    carrier_number: value?.carrier_number || '',
    arrive_at: value?.arrive_at ? value.arrive_at.slice(0, 16) : '',
    point_name: value?.point_name || '',
    bought: value?.bought || false,
    comment: value?.comment || ''
  });

  const title = direction === 'there' ? 'Туда' : 'Обратно';

  if (!editable) {
    return (
      <div style={{
        padding: '12px 14px', marginBottom: '8px',
        background: 'var(--color-gray-50)',
        border: '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-sm)', fontSize: '13.5px'
      }}>
        <strong>{title}:</strong>{' '}
        {value?.carrier_number
          ? `${MODES.find((m) => m.value === value.mode)?.label || ''} ${value.carrier_number}`
          : 'данные пока не внесены'}
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px', marginBottom: '10px',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{
        fontSize: '13px', fontWeight: 600, marginBottom: '10px',
        color: 'var(--color-primary-dark)'
      }}>
        {title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        <select
          className="form-input"
          value={form.mode}
          onChange={(e) => setForm({ ...form, mode: e.target.value })}
        >
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <input
          className="form-input"
          placeholder="Рейс или номер поезда"
          value={form.carrier_number}
          onChange={(e) => setForm({ ...form, carrier_number: e.target.value })}
        />

        <input
          className="form-input"
          type="datetime-local"
          value={form.arrive_at}
          onChange={(e) => setForm({ ...form, arrive_at: e.target.value })}
        />

        <input
          className="form-input"
          placeholder="Аэропорт или вокзал"
          value={form.point_name}
          onChange={(e) => setForm({ ...form, point_name: e.target.value })}
        />
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        margin: '12px 0', fontSize: '13.5px', cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={form.bought}
          onChange={(e) => setForm({ ...form, bought: e.target.checked })}
          style={{ width: '16px', height: '16px' }}
        />
        Билет куплен
      </label>

      <button
        className="btn-secondary btn-sm"
        disabled={busy}
        onClick={() => onSave({
          ...form,
          arrive_at: form.arrive_at || null,
          mode: form.mode || null
        })}
      >
        Сохранить
      </button>
    </div>
  );
}
