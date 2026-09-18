// frontend/src/pages/PracticeEdit.jsx
//
// Редактор набора: сотрудник КЮДа собирает тест для своих участников.
//
// Здесь правильные ответы видны — это единственный экран, куда сервер их
// отдаёт, и только тому, кто может править набор.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';
import { confirmAction } from '../lib/confirm';

const KINDS = [
  ['choice', 'Выбрать один вариант'],
  ['multi', 'Выбрать несколько'],
  ['gap', 'Вписать слово'],
  ['order', 'Расставить по порядку'],
  ['match', 'Соотнести пары'],
];

const emptyTask = { kind: 'choice', prompt: '', options: '', correct: '', accept: '', left: '', right: '', pairs: '', explanation: '', hint: '' };

// Из строк формы собираем то, что ждёт сервер
function buildTask(f) {
  const options = f.options.split('\n').map((s) => s.trim()).filter(Boolean);

  if (f.kind === 'choice') {
    return { kind: 'choice', payload: { options }, answer: { value: f.correct.trim() } };
  }
  if (f.kind === 'multi') {
    const values = f.correct.split('\n').map((s) => s.trim()).filter(Boolean);
    return { kind: 'multi', payload: { options }, answer: { values } };
  }
  if (f.kind === 'gap') {
    const accept = f.accept.split(',').map((s) => s.trim()).filter(Boolean);
    return { kind: 'gap', payload: {}, answer: { accept } };
  }
  if (f.kind === 'order') {
    const order = f.correct.split('\n').map((s) => s.trim()).filter(Boolean);
    return { kind: 'order', payload: { options: order }, answer: { order } };
  }
  const pairs = {};
  const left = [];
  const right = [];
  for (const line of f.pairs.split('\n')) {
    const [l, r] = line.split('=').map((s) => (s || '').trim());
    if (l && r) { pairs[l] = r; left.push(l); right.push(r); }
  }
  return { kind: 'match', payload: { left, right: [...right].sort() }, answer: { pairs } };
}

export default function PracticeEdit() {
  const { setId } = useParams();
  const [profile, setProfile] = useState(null);
  const [set, setSet] = useState(null);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    const data = await api.getPracticeSetForEdit(setId);
    setSet(data);
    if (data) setResults(await api.getPracticeResults(setId));
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  const addTask = async (e) => {
    e.preventDefault();
    setMessage('');
    const built = buildTask(form);
    const result = await api.addPracticeTask(setId, {
      ...built,
      prompt: form.prompt,
      hint: form.hint || null,
      explanation: form.explanation || null,
      sort_order: (set?.tasks?.length || 0) + 1
    });
    if (result?.error) { setMessage(api.describeApiError(result)); return; }
    setForm({ ...emptyTask, kind: form.kind });
    await load();
  };

  const removeTask = async (task) => {
    const ok = await confirmAction({
      title: 'Удалить задание?',
      text: task.prompt,
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) return;
    await api.deletePracticeTask(task.id);
    await load();
  };

  const togglePublish = async () => {
    const result = await api.updatePracticeSet(setId, { is_published: !set.is_published });
    if (result?.error) { setMessage(api.describeApiError(result)); return; }
    await load();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="card">Набор недоступен.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">{set.title}</h1>
            <p className="page-subtitle">
              {set.is_published ? 'Опубликован — участники его видят' : 'Черновик — участникам не виден'}
              {` · заданий ${set.tasks.length}`}
            </p>
          </div>
        </div>

        {message && <div className="message-error" style={{ marginBottom: '16px' }}>{message}</div>}

        <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={set.is_published ? 'btn-secondary' : 'btn-gold'}
            onClick={togglePublish}
            disabled={set.tasks.length === 0}
            title={set.tasks.length === 0 ? 'Сначала добавьте хотя бы одно задание' : ''}
          >
            {set.is_published ? 'Снять с публикации' : 'Опубликовать'}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/courses')}>К списку</button>
        </div>

        <h2 style={{ fontSize: '17px', marginBottom: '10px' }}>Задания</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
          {set.tasks.length === 0 ? (
            <div style={{ padding: '20px', fontSize: '13.5px', color: 'var(--color-gray-500)' }}>
              Заданий пока нет. Пока их нет, опубликовать набор нельзя.
            </div>
          ) : set.tasks.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              padding: '12px 16px', borderBottom: '1px solid var(--color-gray-100)'
            }}>
              <span style={{ color: 'var(--color-gray-400)', fontSize: '13px', minWidth: '20px' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: 'var(--color-primary-dark)' }}>{t.prompt}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '3px' }}>
                  {(KINDS.find((k) => k[0] === t.kind) || [])[1]}
                  {' · ответ: '}
                  {t.kind === 'choice' ? t.answer?.value
                    : t.kind === 'multi' ? (t.answer?.values || []).join(', ')
                    : t.kind === 'gap' ? (t.answer?.accept || []).join(' / ')
                    : t.kind === 'order' ? (t.answer?.order || []).join(' → ')
                    : Object.entries(t.answer?.pairs || {}).map(([k, v]) => `${k}—${v}`).join('; ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeTask(t)}
                title="Удалить"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>Новое задание</h3>
          <form onSubmit={addTask}>
            <label className="form-label">Вид</label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
              style={{ marginBottom: '12px' }}>
              {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>

            <label className="form-label">Вопрос</label>
            <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              rows={2} required style={{ width: '100%', marginBottom: '12px' }}
              placeholder={form.kind === 'gap' ? 'She ___ to school every day.' : 'Что спрашиваем'} />

            {(form.kind === 'choice' || form.kind === 'multi') && (
              <>
                <label className="form-label">Варианты — каждый с новой строки</label>
                <textarea value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
                  rows={4} required style={{ width: '100%', marginBottom: '12px' }} />
                <label className="form-label">
                  {form.kind === 'choice' ? 'Правильный вариант' : 'Правильные варианты — каждый с новой строки'}
                </label>
                <textarea value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })}
                  rows={form.kind === 'choice' ? 1 : 3} required style={{ width: '100%', marginBottom: '12px' }} />
              </>
            )}

            {form.kind === 'gap' && (
              <>
                <label className="form-label">Допустимые ответы — через запятую</label>
                <input value={form.accept} onChange={(e) => setForm({ ...form, accept: e.target.value })}
                  required style={{ width: '100%', marginBottom: '12px' }} placeholder="goes, go" />
                <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '-6px', marginBottom: '12px' }}>
                  Регистр, лишние пробелы и точка в конце ошибкой не считаются.
                </p>
              </>
            )}

            {form.kind === 'order' && (
              <>
                <label className="form-label">Слова в правильном порядке — каждое с новой строки</label>
                <textarea value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })}
                  rows={4} required style={{ width: '100%', marginBottom: '12px' }} />
                <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '-6px', marginBottom: '12px' }}>
                  Участнику они покажутся вперемешку.
                </p>
              </>
            )}

            {form.kind === 'match' && (
              <>
                <label className="form-label">Пары — по одной в строке, через знак равенства</label>
                <textarea value={form.pairs} onChange={(e) => setForm({ ...form, pairs: e.target.value })}
                  rows={4} required style={{ width: '100%', marginBottom: '12px' }}
                  placeholder={'embassy = посольство\ntreaty = договор'} />
              </>
            )}

            <label className="form-label">Подсказка до ответа (не обязательно)</label>
            <input value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })}
              style={{ width: '100%', marginBottom: '12px' }} />

            <label className="form-label">Разбор после ответа (не обязательно)</label>
            <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              rows={2} style={{ width: '100%', marginBottom: '14px' }}
              placeholder="Почему так, а не иначе" />

            <button className="btn-gold" type="submit">Добавить задание</button>
          </form>
        </div>

        {results.length > 0 && (
          <>
            <h2 style={{ fontSize: '17px', marginBottom: '10px' }}>Кто прошёл</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {results.map((r) => (
                <div key={r.user_id} style={{
                  display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
                  padding: '10px 16px', borderBottom: '1px solid var(--color-gray-100)', fontSize: '14px'
                }}>
                  <span>{r.full_name}</span>
                  <span style={{ color: 'var(--color-gray-600)' }}>
                    {r.best_score} из {r.total}
                    {r.runs > 1 && ` · попыток ${r.runs}`}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
