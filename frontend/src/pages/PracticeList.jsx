// frontend/src/pages/PracticeList.jsx
//
// Курсы: наборы движения и тесты своего КЮДа.
//
// Наборы движения — короткие упражнения, чтобы язык не забывался между
// занятиями. Тесты КЮДа — то, что даёт сотрудник клуба. Для ребёнка
// разница только в подписи, поэтому разведены в два списка, а не в
// цветные ярлыки внутри одного.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

const KIND_LABELS = {
  grammar: 'Грамматика',
  vocabulary: 'Лексика',
  test: 'Тест'
};

const LEVELS = { 1: 'младшие', 2: 'средние', 3: 'старшие' };

export default function PracticeList() {
  const [profile, setProfile] = useState(null);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', kind: 'test', allow_retry: false });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const load = async () => setSets(await api.getPracticeSets());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.getMe();
        if (!alive) return;
        setProfile(me);
        await load();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Точные права считает сервер по должности в клубе. Здесь только
  // решаем, показывать ли форму: отказ всё равно придёт с сервера.
  const mayCreate = ['admin', 'movement_coordinator', 'club_coordinator'].includes(profile?.role);

  const create = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const result = await api.createPracticeSet(form);
      if (result?.error) throw new Error(api.describeApiError(result));
      navigate(`/courses/${result.id}/edit`);
    } catch (err) {
      setMessage(err.message || 'Не удалось создать');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const movement = sets.filter((s) => s.scope === 'movement');
  const club = sets.filter((s) => s.scope === 'club');

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">Курсы</h1>
            <p className="page-subtitle">
              Короткие упражнения по английскому и тесты вашего КЮДа
            </p>
          </div>
        </div>

        {message && <div className="message-error" style={{ marginBottom: '16px' }}>{message}</div>}

        {mayCreate && (
          <div className="card" style={{ marginBottom: '20px' }}>
            {!creating ? (
              <button className="btn-secondary" onClick={() => setCreating(true)}>
                Создать тест для своего КЮДа
              </button>
            ) : (
              <form onSubmit={create}>
                <h3 style={{ marginTop: 0, fontSize: '16px' }}>Новый набор</h3>

                <label className="form-label">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Например: Present Simple — проверка"
                  style={{ width: '100%', marginBottom: '12px' }}
                  required
                />

                <label className="form-label">Пояснение для участников</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Что здесь и зачем"
                  style={{ width: '100%', marginBottom: '12px' }}
                />

                <label className="form-label">Вид</label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  style={{ marginBottom: '12px' }}
                >
                  <option value="test">Тест</option>
                  <option value="grammar">Грамматика</option>
                  <option value="vocabulary">Лексика</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13.5px' }}>
                  <input
                    type="checkbox"
                    checked={form.allow_retry}
                    onChange={(e) => setForm({ ...form, allow_retry: e.target.checked })}
                  />
                  Можно проходить несколько раз
                </label>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-gold" type="submit">Создать и добавить задания</button>
                  <button className="btn-secondary" type="button" onClick={() => setCreating(false)}>
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <Section
          title="Тренировки движения"
          empty="Пока пусто. Здесь появятся упражнения по грамматике и лексике."
          sets={movement}
          navigate={navigate}
          profile={profile}
        />

        <Section
          title="От вашего КЮДа"
          empty="Ваш КЮД пока не публиковал тестов."
          sets={club}
          navigate={navigate}
          profile={profile}
        />
      </div>
    </div>
  );
}

function Section({ title, empty, sets, navigate, profile }) {
  const isStaff = !['participant', 'parent'].includes(profile?.role);

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '17px', marginBottom: '10px' }}>{title}</h2>

      {sets.length === 0 ? (
        <div className="card" style={{ color: 'var(--color-gray-500)', fontSize: '13.5px' }}>
          {empty}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {sets.map((s) => {
            const done = s.runs > 0;
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                padding: '12px 16px', borderBottom: '1px solid var(--color-gray-100)'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                    {s.title}
                    {!s.is_published && (
                      <span style={{
                        marginLeft: '8px', fontSize: '11px', fontWeight: 600,
                        color: 'var(--color-gray-500)', background: 'var(--color-gray-100)',
                        padding: '2px 8px', borderRadius: '999px'
                      }}>
                        черновик
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', marginTop: '3px' }}>
                      {s.description}
                    </div>
                  )}
                  <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '3px' }}>
                    {KIND_LABELS[s.kind] || s.kind}
                    {s.level && ` · ${LEVELS[s.level]}`}
                    {` · заданий ${s.task_count}`}
                    {s.club_name && ` · ${s.club_name}`}
                    {done && ` · лучший результат ${s.best_score} из ${s.task_count}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isStaff && (
                    <button className="btn-secondary btn-sm" onClick={() => navigate(`/courses/${s.id}/edit`)}>
                      Править
                    </button>
                  )}
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => navigate(`/courses/${s.id}/run`)}
                    disabled={s.task_count === 0}
                    title={s.task_count === 0 ? 'В наборе ещё нет заданий' : ''}
                  >
                    {done && s.allow_retry ? 'Пройти ещё раз' : 'Начать'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
