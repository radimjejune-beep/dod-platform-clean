// frontend/src/pages/ClubsHealth.jsx
//
// «Состояние КЮДов» — экран, отвечающий на вопрос, с которого начинается
// любой разговор о движении: какие клубы действительно работают.
//
// В базе у клуба был только статус «активен» или «в архиве». Он не говорил
// ничего: клуб мог год не проводить занятий и числиться активным. Здесь
// четыре признака жизни — руководитель и дети, занятия, отчёты, выезды —
// и общий вывод по ним. Ни один признак сам по себе не исчерпывающий,
// поэтому показываем все, а не только итог.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const HEALTH = {
  working:   { label: 'Работает',          color: '#174A7E', bg: '#E8EFF7', order: 1 },
  attention: { label: 'Требует внимания',  color: '#8A6A00', bg: '#FBF4DC', order: 2 },
  dormant:   { label: 'Молчит',            color: '#B42318', bg: '#FEF3F2', order: 3 },
  no_kids:   { label: 'Нет участников',    color: '#B42318', bg: '#FEF3F2', order: 4 },
  no_head:   { label: 'Нет руководителя',  color: '#B42318', bg: '#FEF3F2', order: 5 }
};

function monthLabelShort(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  const names = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${names[Number(m) - 1] || m} ${y}`;
}

function daysWord(n) {
  if (n === null || n === undefined) return 'никогда';
  if (n === 0) return 'сегодня';
  if (n === 1) return 'вчера';
  return `${n} дн. назад`;
}

export default function ClubsHealth() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [country, setCountry] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me?.id) { navigate('/login'); return; }
      setProfile(me);
      setData(await api.getClubsHealth());
    } catch (err) {
      console.error('❌ Ошибка загрузки состояния КЮДов:', err);
    } finally {
      setLoading(false);
    }
  };

  const countries = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.clubs.map((c) => c.country).filter(Boolean))).sort();
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    return data.clubs
      .filter((c) => filter === 'all' || c.health === filter)
      .filter((c) => country === 'all' || c.country === country)
      .sort((a, b) => (HEALTH[b.health]?.order || 0) - (HEALTH[a.health]?.order || 0));
  }, [data, filter, country]);

  if (loading) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page"><div className="spinner" /></div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <h1 className="page-title">Состояние КЮДов</h1>
        <p className="page-subtitle">
          Какие клубы движения действительно работают. Отчёты проверяются за {data?.month_checked},
          занятия — за последние шесть недель.
        </p>

        {/* ===== СВОДКА ===== */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          <SummaryTile
            label="Всего КЮДов" value={data?.total || 0}
            active={filter === 'all'} onClick={() => setFilter('all')}
          />
          {Object.entries(HEALTH).map(([key, meta]) => (
            <SummaryTile
              key={key}
              label={meta.label}
              value={summary[key] || 0}
              color={meta.color}
              bg={meta.bg}
              active={filter === key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
            />
          ))}
        </div>

        {countries.length > 1 && (
          <div className="toolbar" style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Страна:</span>
            <select className="form-input" style={{ maxWidth: '220px' }}
              value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">Все страны</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {visible.length === 0 && (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-gray-400)', marginBottom: '8px' }}>
              <Icon name="club" size={26} />
            </div>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '14px', margin: 0 }}>
              По этому отбору клубов нет.
            </p>
          </div>
        )}

        {visible.map((club) => {
          const meta = HEALTH[club.health] || HEALTH.attention;
          return (
            <div key={club.id} className="card" style={{ padding: '16px 18px', marginBottom: '10px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                gap: '12px', flexWrap: 'wrap', alignItems: 'baseline'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                    {club.name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                    {[club.country, club.region, club.city].filter(Boolean).join(' · ') || 'География не указана'}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: 600,
                  background: meta.bg, color: meta.color, whiteSpace: 'nowrap'
                }}>
                  {meta.label}
                </span>
              </div>

              <div style={{
                fontSize: '13px', color: 'var(--color-gray-700)',
                marginTop: '8px', fontWeight: 500
              }}>
                {club.reason}
              </div>

              {/* Четыре признака жизни — фактами, а не одним выводом */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '8px', marginTop: '12px'
              }}>
                <Fact
                  label="Руководитель"
                  value={club.head_name || 'нет'}
                  bad={!club.head_name}
                />
                <Fact
                  label="Участников"
                  value={club.participants_count}
                  bad={club.participants_count === 0}
                />
                <Fact
                  label="Последнее занятие"
                  value={daysWord(club.days_since_session)}
                  bad={club.days_since_session === null || club.days_since_session > 45}
                />
                <Fact
                  label="Последний отчёт"
                  value={monthLabelShort(club.last_report_month)}
                  bad={!club.report_current}
                />
                <Fact
                  label="Занятий за 90 дней"
                  value={club.sessions_90}
                  bad={club.sessions_90 === 0}
                />
                <Fact
                  label="Последний выезд"
                  value={daysWord(club.days_since_trip)}
                  bad={club.days_since_trip === null}
                />
              </div>
            </div>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}

function SummaryTile({ label, value, color, bg, active, onClick }) {
  return (
    <button
      type="button"
      className="row-button"
      onClick={onClick}
      style={{
        flex: '1 1 130px', width: 'auto', minWidth: '120px', padding: '12px 14px',
        background: bg || 'var(--color-gray-50)',
        border: `1px solid ${active ? (color || 'var(--color-primary-dark)') : 'var(--color-gray-200)'}`,
        borderWidth: active ? '2px' : '1px',
        borderRadius: 'var(--radius-sm)'
      }}
    >
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '24px', fontWeight: 700,
        color: color || 'var(--color-primary-dark)'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: '2px' }}>
        {label}
      </div>
    </button>
  );
}

function Fact({ label, value, bad }) {
  return (
    <div style={{
      padding: '8px 10px',
      background: 'var(--color-gray-50)',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>{label}</div>
      <div style={{
        fontSize: '13px', fontWeight: 500, marginTop: '2px',
        color: bad ? 'var(--color-gold-dark)' : 'var(--color-gray-800)',
        overflowWrap: 'anywhere'
      }}>
        {value}
      </div>
    </div>
  );
}
