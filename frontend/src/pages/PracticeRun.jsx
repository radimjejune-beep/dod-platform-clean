// frontend/src/pages/PracticeRun.jsx
//
// Прохождение набора: одно задание на экране.
//
// Ответ проверяет сервер, поэтому правильного ответа в браузере нет до
// того, как ребёнок ответил. После ответа показываем разбор: «неверно»
// без объяснения ничему не учит.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function PracticeRun() {
  const { setId } = useParams();
  const [profile, setProfile] = useState(null);
  const [run, setRun] = useState(null);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState(null);
  const [checked, setChecked] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.getMe();
        if (!alive) return;
        setProfile(me);
        const started = await api.startPracticeRun(setId);
        if (!alive) return;
        if (started?.error) setError(api.describeApiError(started));
        else setRun(started);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [setId]);

  const task = run?.tasks?.[index];
  const isLast = run && index === run.tasks.length - 1;

  const submit = async () => {
    if (given === null || given === undefined || given === '') return;
    const answer = await api.answerPracticeTask(run.run_id, task.id, given);
    if (answer?.error) { setError(api.describeApiError(answer)); return; }
    setChecked(answer);
  };

  const next = async () => {
    if (isLast) {
      const finished = await api.finishPracticeRun(run.run_id);
      setResult(finished);
      return;
    }
    setIndex(index + 1);
    setGiven(null);
    setChecked(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page" style={{ maxWidth: '680px' }}>

        {error && (
          <div className="card">
            <div className="message-error" style={{ marginBottom: '14px' }}>{error}</div>
            <button className="btn-secondary" onClick={() => navigate('/courses')}>К списку</button>
          </div>
        )}

        {!error && result && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '40px', fontWeight: 700,
              color: result.score === result.total ? 'var(--color-success)' : 'var(--color-primary-dark)'
            }}>
              {result.score} из {result.total}
            </div>
            <p style={{ color: 'var(--color-gray-600)', marginTop: '8px' }}>
              {result.score === result.total
                ? 'Всё верно.'
                : result.score >= result.total * 0.7
                  ? 'Хорошо. Ошибки стоит разобрать и пройти ещё раз.'
                  : 'Эту тему стоит повторить и вернуться.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
              {run?.set?.allow_retry && (
                <button className="btn-gold" onClick={() => window.location.reload()}>Пройти ещё раз</button>
              )}
              <button className="btn-secondary" onClick={() => navigate('/courses')}>К списку</button>
            </div>
          </div>
        )}

        {!error && !result && task && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '14px', fontSize: '13px', color: 'var(--color-gray-500)'
            }}>
              <span>{run.set.title}</span>
              <span>{index + 1} из {run.tasks.length}</span>
            </div>

            <div style={{
              height: '4px', background: 'var(--color-gray-200)',
              borderRadius: '999px', overflow: 'hidden', marginBottom: '20px'
            }}>
              <div style={{
                height: '100%', width: `${((index) / run.tasks.length) * 100}%`,
                background: 'var(--color-gold)', transition: 'width 0.2s ease'
              }} />
            </div>

            <div className="card">
              <p style={{ fontSize: '16px', fontWeight: 500, marginTop: 0, marginBottom: '16px' }}>
                {task.prompt}
              </p>

              <TaskInput task={task} given={given} setGiven={setGiven} disabled={!!checked} />

              {task.hint && !checked && (
                <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '12px' }}>
                  <Icon name="info" size={13} /> {task.hint}
                </p>
              )}

              {checked && (
                <div style={{
                  marginTop: '16px', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                  background: checked.correct ? 'var(--color-success-bg)' : 'var(--color-error-bg)'
                }}>
                  <div style={{
                    fontWeight: 600, fontSize: '14px',
                    color: checked.correct ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {checked.correct ? 'Верно' : 'Неверно'}
                  </div>
                  {!checked.correct && checked.answer && (
                    <div style={{ fontSize: '13.5px', color: 'var(--color-gray-700)', marginTop: '5px' }}>
                      Правильно: <strong>{describeAnswer(task.kind, checked.answer)}</strong>
                    </div>
                  )}
                  {checked.explanation && (
                    <div style={{ fontSize: '13.5px', color: 'var(--color-gray-700)', marginTop: '5px' }}>
                      {checked.explanation}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '18px' }}>
                {!checked ? (
                  <button className="btn-gold" onClick={submit} disabled={given === null || given === ''}>
                    Ответить
                  </button>
                ) : (
                  <button className="btn-gold" onClick={next}>
                    {isLast ? 'Завершить' : 'Дальше'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Правильный ответ приходит только в тренажёре и только после ответа
function describeAnswer(kind, answer) {
  if (kind === 'choice') return String(answer.value);
  if (kind === 'multi') return (answer.values || []).join(', ');
  if (kind === 'gap') return (answer.accept || [])[0] || '';
  if (kind === 'order') return (answer.order || []).join(' → ');
  if (kind === 'match') {
    return Object.entries(answer.pairs || {}).map(([k, v]) => `${k} — ${v}`).join('; ');
  }
  return '';
}

function TaskInput({ task, given, setGiven, disabled }) {
  const options = task.payload?.options || [];

  if (task.kind === 'choice') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((opt) => (
          <label key={opt} className="row-button" style={{
            border: `1.5px solid ${given === opt ? 'var(--color-gold)' : 'var(--color-gray-200)'}`,
            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <input type="radio" name="choice" checked={given === opt} disabled={disabled}
              onChange={() => setGiven(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (task.kind === 'multi') {
    const picked = Array.isArray(given) ? given : [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((opt) => (
          <label key={opt} className="row-button" style={{
            border: `1.5px solid ${picked.includes(opt) ? 'var(--color-gold)' : 'var(--color-gray-200)'}`,
            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <input
              type="checkbox"
              checked={picked.includes(opt)}
              disabled={disabled}
              onChange={() => setGiven(picked.includes(opt)
                ? picked.filter((v) => v !== opt)
                : [...picked, opt])}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (task.kind === 'gap') {
    return (
      <input
        value={given || ''}
        disabled={disabled}
        onChange={(e) => setGiven(e.target.value)}
        placeholder="Впишите слово"
        style={{ width: '100%', maxWidth: '280px' }}
      />
    );
  }

  if (task.kind === 'order') {
    // Порядок собирается нажатием: перетаскивание на телефоне работает
    // плохо, а собирают это чаще всего с телефона
    const picked = Array.isArray(given) ? given : [];
    const rest = options.filter((o) => !picked.includes(o));
    return (
      <div>
        <div style={{
          minHeight: '44px', padding: '8px 10px', marginBottom: '10px',
          border: '1.5px dashed var(--color-gray-200)', borderRadius: 'var(--radius-sm)',
          display: 'flex', flexWrap: 'wrap', gap: '6px'
        }}>
          {picked.length === 0
            ? <span style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>Нажимайте слова по порядку</span>
            : picked.map((p, i) => (
                <button key={`${p}-${i}`} type="button" className="btn-secondary btn-sm" disabled={disabled}
                  onClick={() => setGiven(picked.filter((_, idx) => idx !== i))}>
                  {p}
                </button>
              ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {rest.map((o) => (
            <button key={o} type="button" className="btn-secondary btn-sm" disabled={disabled}
              onClick={() => setGiven([...picked, o])}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (task.kind === 'match') {
    const left = task.payload?.left || [];
    const right = task.payload?.right || [];
    const current = given && typeof given === 'object' ? given : {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {left.map((l) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 130px', fontSize: '14px' }}>{l}</span>
            <select
              value={current[l] || ''}
              disabled={disabled}
              onChange={(e) => setGiven({ ...current, [l]: e.target.value })}
              style={{ flex: '1 1 150px' }}
            >
              <option value="">—</option>
              {right.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
