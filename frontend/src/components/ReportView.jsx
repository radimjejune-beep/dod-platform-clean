// frontend/src/components/ReportView.jsx
//
// Отчёт КЮДа за месяц — как его читают.
//
// Прежде отчёт выглядел как абзац свободного текста и две цифры: сравнить
// сорок таких отчётов между собой было невозможно. Теперь цифры считает
// платформа по журналу занятий, а руководитель пишет три раздела — и всё
// это раскладывается на странице так, чтобы координатор понял состояние
// клуба, не вчитываясь.

import { monthLabel, countOf } from '../lib/format';

const STATUS = {
  draft: { label: 'Черновик', color: '#667085', bg: '#F4F6F9' },
  submitted: { label: 'На проверке', color: '#8A6A00', bg: '#FBF4DC' },
  approved: { label: 'Утверждён', color: '#174A7E', bg: '#E8EFF7' },
  rejected: { label: 'Возвращён на доработку', color: '#B42318', bg: '#FEF3F2' }
};

function Tile({ value, label, hint }) {
  return (
    <div style={{
      flex: '1 1 140px', minWidth: '120px',
      padding: '14px 16px',
      background: 'var(--color-gray-50)',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '26px', fontWeight: 700, lineHeight: 1.1,
        color: 'var(--color-primary-dark)'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: '11.5px', color: 'var(--color-gold-dark)', marginTop: '2px' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Section({ title, text }) {
  if (!text || !String(text).trim()) return null;
  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{
        margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600,
        color: 'var(--color-primary-dark)'
      }}>
        {title}
      </h4>
      {/* pre-wrap: руководители пишут абзацами и списками, и переносы
          строк — часть смысла, а не случайность */}
      <div style={{
        fontSize: '14px', lineHeight: 1.65, color: 'var(--color-gray-700)',
        whiteSpace: 'pre-wrap'
      }}>
        {text}
      </div>
    </div>
  );
}

function Chips({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item, i) => (
          <span key={i} style={{
            padding: '4px 10px', fontSize: '12.5px',
            background: 'var(--color-gold-pale)',
            color: 'var(--color-gray-700)',
            border: '1px solid var(--color-gold-light)',
            borderRadius: '20px'
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

export default function ReportView({ report }) {
  if (!report) return null;

  const status = STATUS[report.status] || STATUS.draft;
  const hasText = [report.highlights, report.difficulties, report.plans]
    .some((t) => t && String(t).trim());

  return (
    <div>
      {/* ===== ШАПКА ===== */}
      <div style={{
        padding: '20px 22px',
        background: 'var(--color-primary-dark)',
        borderRadius: 'var(--radius-sm)',
        color: 'white'
      }}>
        <div style={{
          fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
          color: 'var(--color-gold)', fontWeight: 600
        }}>
          Отчёт КЮДа за месяц
        </div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '24px', fontWeight: 700, margin: '6px 0 2px',
          color: 'white'
        }}>
          {monthLabel(report.report_month)}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.72)' }}>
          {report.club_name || 'КЮД'}
        </div>
        <span style={{
          display: 'inline-block', marginTop: '12px',
          padding: '4px 12px', borderRadius: '20px',
          fontSize: '12px', fontWeight: 600,
          background: status.bg, color: status.color
        }}>
          {status.label}
        </span>
      </div>

      {/* ===== ЦИФРЫ ===== */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
        <Tile
          value={report.sessions_held ?? 0}
          label="Занятий проведено"
          hint={report.sessions_cancelled > 0
            ? `не состоялось: ${report.sessions_cancelled}`
            : null}
        />
        <Tile
          value={report.average_attendance ?? '—'}
          label="В среднем приходило"
        />
        <Tile value={report.events_count ?? 0} label="Мероприятий" />
        <Tile
          value={report.participants_count ?? 0}
          label="Участников в клубе"
          hint={report.new_participants > 0
            ? `новых за месяц: ${report.new_participants}`
            : null}
        />
        <Tile value={report.achievements_count ?? 0} label="Достижений выдано" />
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--color-gray-400)', marginTop: '8px' }}>
        Цифры посчитаны платформой по журналу занятий на момент сдачи отчёта.
      </div>

      <Chips title="Темы занятий" items={report.session_topics} />
      <Chips title="Мероприятия месяца" items={report.event_titles} />

      {/* ===== ТЕКСТ ===== */}
      <Section title="Главное за месяц" text={report.highlights} />
      <Section title="Трудности и просьбы к движению" text={report.difficulties} />
      <Section title="Планы на следующий месяц" text={report.plans} />

      {/* Отчёты, сданные до появления разделов, хранят текст одним абзацем */}
      {!hasText && (report.report_text || report.content) && (
        <Section title="Текст отчёта" text={report.report_text || report.content} />
      )}

      {!hasText && !report.report_text && !report.content && (
        <div style={{
          marginTop: '20px', fontSize: '13.5px',
          color: 'var(--color-gray-500)', fontStyle: 'italic'
        }}>
          Текстовая часть не заполнена — в отчёте только цифры.
        </div>
      )}

      {/* ===== ВОЗВРАТ НА ДОРАБОТКУ ===== */}
      {report.reviewer_comment && (
        <div style={{
          marginTop: '20px', padding: '14px 16px',
          background: 'var(--color-gold-pale)',
          border: '1px solid var(--color-gold-light)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
            Комментарий координатора
          </div>
          <div style={{
            fontSize: '13.5px', color: 'var(--color-gray-700)',
            marginTop: '4px', whiteSpace: 'pre-wrap'
          }}>
            {report.reviewer_comment}
          </div>
        </div>
      )}

      {/* ===== КТО И КОГДА ===== */}
      <div style={{
        marginTop: '20px', paddingTop: '14px',
        borderTop: '1px solid var(--color-gray-200)',
        fontSize: '12.5px', color: 'var(--color-gray-500)', lineHeight: 1.8
      }}>
        {report.created_by_name && (
          <div>Подготовил: {report.created_by_name}</div>
        )}
        {report.submitted_by_name && (
          <div>
            Сдал: {report.submitted_by_name}
            {report.submitted_at && ` — ${formatDate(report.submitted_at)}`}
          </div>
        )}
        {report.approved_by_name && (
          <div>
            Утвердил: {report.approved_by_name}
            {report.approved_at && ` — ${formatDate(report.approved_at)}`}
          </div>
        )}
        {report.session_topics?.length > 0 && (
          <div>
            В журнале за месяц: {countOf(report.session_topics.length, 'тема', 'темы', 'тем')}
          </div>
        )}
      </div>
    </div>
  );
}
