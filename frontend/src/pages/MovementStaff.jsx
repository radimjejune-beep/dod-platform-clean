// frontend/src/pages/MovementStaff.jsx
//
// «Кадры движения» — тьюторы, сотрудники КЮДов и аппарат в одном списке.
//
// Раньше на вопрос «кого поставить тьютором на ноябрьский форум» отвечали
// по памяти: платформа знала назначения, но нигде не показывала человека
// целиком — где работает, сколько выездов уже ведёт, свободен ли.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const ROLE_LABELS = {
  admin: 'Администратор',
  movement_coordinator: 'Координатор движения',
  president: 'Президент',
  vice_president: 'Вице-президент',
  club_coordinator: 'Руководитель КЮДа',
  tutor: 'Тьютор'
};

const POSITION_LABELS = {
  head: 'руководитель',
  deputy: 'заместитель',
  methodist: 'методист',
  curator: 'куратор',
  assistant: 'помощник'
};

const GROUPS = [
  { key: 'apparatus', label: 'Аппарат движения', roles: ['admin', 'movement_coordinator', 'president', 'vice_president'] },
  { key: 'clubs', label: 'Сотрудники КЮДов', roles: ['club_coordinator'] },
  { key: 'tutors', label: 'Тьюторы', roles: ['tutor'] }
];

export default function MovementStaff() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me?.id) { navigate('/login'); return; }
      setProfile(me);
      setStaff(await api.getMovementStaff());
    } catch (err) {
      console.error('❌ Ошибка загрузки кадров:', err);
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff
      .filter((p) => {
        if (group === 'all') return true;
        const g = GROUPS.find((x) => x.key === group);
        return g ? g.roles.includes(p.role) : true;
      })
      .filter((p) => {
        if (!q) return true;
        return [p.full_name, p.email, p.city, ...(p.clubs || []).map((c) => c.club)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [staff, query, group]);

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
        <h1 className="page-title">Кадры движения</h1>
        <p className="page-subtitle">
          Кто где работает и какая у человека загрузка на ближайшие месяцы.
        </p>

        <div className="toolbar" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <input
            className="form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Фамилия, почта, город или КЮД"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="form-input" style={{ maxWidth: '220px' }}
            value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">Все — {staff.length}</option>
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label} — {staff.filter((p) => g.roles.includes(p.role)).length}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 && (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-gray-400)', marginBottom: '8px' }}>
              <Icon name="users" size={26} />
            </div>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '14px', margin: 0 }}>
              Никого не нашли по этому запросу.
            </p>
          </div>
        )}

        {visible.map((person) => {
          const busy = (person.events_ahead || 0) + (person.delegations_ahead || 0);
          return (
            <div key={person.id} className="card" style={{ padding: '14px 18px', marginBottom: '8px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                gap: '12px', flexWrap: 'wrap', alignItems: 'baseline'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                    {person.full_name}
                    {person.status !== 'active' && (
                      <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontWeight: 400 }}>
                        {' '}· не активен
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '12.5px', color: 'var(--color-gray-500)',
                    marginTop: '2px', overflowWrap: 'anywhere'
                  }}>
                    {ROLE_LABELS[person.role] || person.role}
                    {person.city && ` · ${person.city}`}
                    {person.phone && ` · ${person.phone}`}
                  </div>
                </div>

                <span style={{
                  fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap',
                  color: busy > 0 ? 'var(--color-gold-dark)' : 'var(--color-gray-400)'
                }}>
                  {busy > 0 ? `впереди: ${busy}` : 'свободен'}
                </span>
              </div>

              {(person.clubs || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {person.clubs.map((c, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', fontSize: '12px',
                      background: 'var(--color-gold-pale)',
                      border: '1px solid var(--color-gold-light)',
                      borderRadius: '20px', color: 'var(--color-gray-700)'
                    }}>
                      {c.club} — {POSITION_LABELS[c.position] || c.position}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '8px' }}>
                Мероприятий за год: {person.events_year || 0}
                {person.delegations_ahead > 0 && ` · везёт делегаций: ${person.delegations_ahead}`}
              </div>
            </div>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}
