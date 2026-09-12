// frontend/src/components/TripReadiness.jsx
//
// Чего не хватает, чтобы участника можно было включить в команду на
// выездной форум. Прежде это выяснялось в день подачи заявки: она просто
// отказывалась принимать человека, а чего именно не хватает — приходилось
// выяснять перебором. Список считает сервер, экраны только показывают.

import Icon from './Icon';

export default function TripReadiness({ participant, compact = false }) {
  if (!participant || participant.trip_ready === undefined) return null;

  const missing = participant.trip_missing || [];

  if (compact) {
    return participant.trip_ready ? (
      <span className="badge badge-success badge-dot" title="Можно включать в команду на форум">
        готов к выезду
      </span>
    ) : (
      <span
        className="badge badge-warning"
        title={`Не хватает: ${missing.join(', ')}`}
      >
        не хватает: {missing.length}
      </span>
    );
  }

  if (participant.trip_ready) {
    return (
      <div className="message message-success" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Icon name="success" size={18} />
        <div>
          <strong>Готов к выезду</strong>
          <div style={{ fontSize: '13px' }}>
            Согласия оформлены, представитель привязан, данные для заявки заполнены.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message message-warning">
      <strong>Для выезда на форум не хватает</strong>
      <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
        {missing.map((item) => (
          <li key={item} style={{ fontSize: '14px' }}>{item}</li>
        ))}
      </ul>
      <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--color-gray-600)' }}>
        Согласия оформляет законный представитель в своём кабинете, остальное
        заполняется в карточке участника.
      </div>
    </div>
  );
}
