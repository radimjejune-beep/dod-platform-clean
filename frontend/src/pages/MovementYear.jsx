// frontend/src/pages/MovementYear.jsx
//
// «Год движения» — свод за учебный или календарный год.
//
// Месячные отчёты КЮДов платформа собирает, а годовой итог движения
// собирался руками по сорока клубам к каждому разговору с партнёрами и
// грантодателями. Всё, что нужно, уже лежит в базе — не хватало экрана.
//
// Периода два намеренно: внутри движения считают по учебному году, потому
// что клубы живут по школьному календарю, а наружу отчитываются по
// календарному.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { countOf } from '../lib/format';

export default function MovementYear() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('academic');
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (profile) reload(); }, [mode, year]);

  const init = async () => {
    try {
      const me = await api.getMe();
      if (!me?.id) { navigate('/login'); return; }
      setProfile(me);
      setData(await api.getMovementYearly(mode, year));
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    setLoading(true);
    try {
      setData(await api.getMovementYearly(mode, year));
    } finally {
      setLoading(false);
    }
  };

  const years = [];
  for (let y = new Date().getFullYear() + 1; y >= 2020; y--) years.push(y);

  const periodLabel = data
    ? (mode === 'academic'
        ? `учебный год ${data.period.year}/${data.period.year + 1}`
        : `${data.period.year} год`)
    : '';

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <h1 className="page-title">Год движения</h1>
        <p className="page-subtitle">
          Итоги по всем КЮДам. Считается из журналов занятий, отчётов, выездов
          и достижений — отдельно ничего собирать не нужно.
        </p>

        <div className="toolbar" style={{ marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <select className="form-input" style={{ maxWidth: '230px' }}
            value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="academic">Учебный год (сентябрь — август)</option>
            <option value="calendar">Календарный год</option>
          </select>
          <select className="form-input" style={{ maxWidth: '130px' }}
            value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loading && <div className="spinner" />}

        {!loading && data && (
          <>
            {/* ===== ГЛАВНЫЕ ЦИФРЫ ===== */}
            <div className="card" style={{ padding: '22px', marginBottom: '18px' }}>
              <div style={{
                fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
                color: 'var(--color-gold-dark)', fontWeight: 600
              }}>
                Движение за {periodLabel}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px', marginTop: '16px'
              }}>
                <Big value={data.clubs.total} label="КЮДов в движении"
                  hint={data.clubs.opened > 0 ? `открыто за период: ${data.clubs.opened}` : null} />
                <Big value={data.participants.total} label="участников" />
                <Big value={data.participants.active} label="занимались"
                  hint="были хотя бы на одном занятии" />
                <Big value={data.sessions.held} label="занятий проведено"
                  hint={`в ${countOf(data.sessions.clubs_with_sessions, 'клубе', 'клубах', 'клубах')}`} />
                <Big value={data.participants.visits} label="посещений" />
                <Big value={data.events_count} label="мероприятий" />
                <Big value={data.trips.children || 0} label="детей съездило"
                  hint={`делегаций: ${data.trips.delegations}`} />
                <Big value={data.achievements_count} label="достижений" />
              </div>
            </div>

            {/* ===== ДИСЦИПЛИНА ===== */}
            <div className="card" style={{ padding: '18px 20px', marginBottom: '18px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--color-primary-dark)' }}>
                Отчётность
              </h3>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-700)', lineHeight: 1.7 }}>
                Сдано отчётов: <strong>{data.reports.submitted}</strong>,
                из них утверждено <strong>{data.reports.approved}</strong>.
                {data.clubs.total > 0 && (
                  <>
                    {' '}При {countOf(data.clubs.total, 'клубе', 'клубах', 'клубах')} и
                    {' '}{mode === 'academic' ? 12 : 12} месяцах это
                    {' '}<strong>
                      {Math.round((data.reports.submitted / (data.clubs.total * 12)) * 100)}%
                    </strong>{' '}от возможного.
                  </>
                )}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '6px' }}>
                Выезжали {countOf(data.trips.clubs_travelled, 'клуб', 'клуба', 'клубов')} из {data.clubs.total}.
              </div>
            </div>

            {/* ===== ГЕОГРАФИЯ ===== */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--color-primary-dark)' }}>
                География
              </h3>
              <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                Разрез, в котором движение отчитывается перед министерствами и партнёрами.
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: '420px' }}>
                  <thead>
                    <tr>
                      <th>Страна</th>
                      <th>Регион</th>
                      <th>КЮДов</th>
                      <th>Участников</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.geography.map((g, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '13px' }}>{g.country || '—'}</td>
                        <td style={{ fontSize: '13px' }}>
                          {g.region || <span style={{ color: 'var(--color-gray-400)' }}>не указан</span>}
                        </td>
                        <td style={{ fontSize: '13px' }}>{g.clubs}</td>
                        <td style={{ fontSize: '13px' }}>{g.participants}</td>
                      </tr>
                    ))}
                    {data.participants_without_club > 0 && (
                      /* Иначе сумма по географии не сходится с общим числом
                         участников, и координатор ищет ошибку там, где её нет */
                      <tr>
                        <td style={{ fontSize: '13px', color: 'var(--color-gold-dark)' }}>—</td>
                        <td style={{ fontSize: '13px', color: 'var(--color-gold-dark)' }}>
                          Без клуба
                        </td>
                        <td style={{ fontSize: '13px' }}>—</td>
                        <td style={{ fontSize: '13px', color: 'var(--color-gold-dark)' }}>
                          {data.participants_without_club}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {data.participants_without_club > 0 && (
                <div style={{ fontSize: '12.5px', color: 'var(--color-gold-dark)', marginTop: '10px' }}>
                  {data.participants_without_club} участн. не привязаны ни к одному действующему
                  КЮДу — в разрезе по регионам их нет. Клуб задаётся в карточке участника.
                </div>
              )}

              {data.geography.some((g) => !g.region) && (
                <div style={{ fontSize: '12.5px', color: 'var(--color-gold-dark)', marginTop: '10px' }}>
                  У части КЮДов не заполнен регион — до тех пор разрез по субъектам неполный.
                  Регион задаётся в карточке клуба.
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Big({ value, label, hint }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--color-gray-50)',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '28px', fontWeight: 700, lineHeight: 1.1,
        color: 'var(--color-primary-dark)'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--color-gray-600)', marginTop: '4px' }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: '11.5px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
