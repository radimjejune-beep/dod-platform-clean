// frontend/src/components/AttendanceStrip.jsx
//
// Посещаемость участника коротко: доля посещённых занятий и последние
// занятия полоской. Нужно, чтобы руководитель видел не факт «ходит или
// нет», а тенденцию — три пропуска подряд заметны сразу, а в списке из
// сорока строк журнала нет.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import Icon from './Icon';

const COLORS = {
  present: 'var(--color-success)',
  late: 'var(--color-warning)',
  absent: 'var(--color-error)',
  excused: 'var(--color-gray-400)'
};

const LABELS = {
  present: 'был',
  late: 'опоздал',
  absent: 'не был',
  excused: 'уважительная причина'
};

export default function AttendanceStrip({ participantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [participantId]);

  const load = async () => {
    try {
      setData(await api.getParticipantAttendance(participantId));
    } catch (err) {
      console.error('❌ Ошибка загрузки посещаемости:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const summary = data?.summary || { held: 0, visited: 0, percentage: null };
  // Занятий не было вовсе — показывать нечего, и пустой блок только мешает
  if (!summary.held) return null;

  const recent = (data.sessions || []).slice(0, 12).reverse();

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3 className="card-title">Посещаемость занятий</h3>
        <span className={`badge ${summary.percentage >= 70 ? 'badge-success' : summary.percentage >= 40 ? 'badge-warning' : 'badge-error'} badge-dot`}>
          {summary.visited} из {summary.held}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {recent.map((s) => (
          <span
            key={s.session_id}
            title={`${new Date(s.session_date).toLocaleDateString('ru-RU')} — ${LABELS[s.status] || 'нет отметки'}${s.topic ? ': ' + s.topic : ''}`}
            style={{
              width: '22px',
              height: '8px',
              borderRadius: '2px',
              background: COLORS[s.status] || 'var(--color-gray-200)'
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
        {summary.percentage >= 70 && 'Ходит постоянно — вопросов нет.'}
        {summary.percentage < 70 && summary.percentage >= 40 && 'Пропускает примерно каждое второе занятие — стоит поговорить.'}
        {summary.percentage < 40 && (
          <span style={{ color: 'var(--color-error)' }}>
            <Icon name="warning" size={14} /> Бывает редко. Возможно, участник уже ушёл из клуба.
          </span>
        )}
      </div>
    </div>
  );
}
