// frontend/src/pages/ParentConsents.jsx
//
// Согласия на обработку данных ребёнка — экран для законного представителя.
//
// Это единственное место в платформе, где согласие можно дать. За
// несовершеннолетнего его вправе оформить только родитель или опекун
// (ст. 9 152-ФЗ), поэтому у самого участника такой кнопки нет — он
// видит только состояние.
//
// Почему так устроен экран:
// — текст согласия показывается целиком до подтверждения, а не ссылкой
//   куда-то ещё: иначе согласие не считается информированным;
// — галочка и кнопка разделены, и галочка не стоит заранее — заранее
//   проставленная галочка не является выражением воли;
// — отзыв доступен всегда и без объяснения причин, это право по закону;
// — каждое согласие оформляется отдельно: объединять цели в одну
//   галочку с 01.09.2025 нельзя.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function ParentConsents() {
  const [profile, setProfile] = useState(null);
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [consents, setConsents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Документ, открытый на чтение, и отметка «прочитал и подтверждаю»
  const [openDoc, setOpenDoc] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // Отзыв согласия: код документа и причина (необязательная)
  const [revoking, setRevoking] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const navigate = useNavigate();

  useEffect(() => { init(); }, []);
  useEffect(() => { if (childId) loadConsents(childId); }, [childId]);

  const init = async () => {
    try {
      const me = await api.getMe();
      if (!me || !me.id) { navigate('/login'); return; }
      setProfile(me);

      const [kids, docs] = await Promise.all([
        api.getParentChildren(),
        api.getConsentDocuments()
      ]);
      const list = Array.isArray(kids) ? kids : [];
      setChildren(list);
      setDocuments(Array.isArray(docs) ? docs : []);
      if (list.length > 0) setChildId(list[0].id);
    } catch (err) {
      console.error('❌ Ошибка загрузки согласий:', err);
      show('Не удалось загрузить данные', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadConsents = async (id) => {
    try {
      const data = await api.getUserConsents(id);
      setConsents(Array.isArray(data?.current) ? data.current : []);
      setHistory(Array.isArray(data?.history) ? data.history : []);
    } catch (err) {
      console.error('❌ Ошибка загрузки состояния согласий:', err);
      setConsents([]);
      setHistory([]);
    }
  };

  const show = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const stateOf = (code) => {
    const row = consents.find((c) => c.consent_type === code);
    if (!row) return { given: false, revoked: false, row: null };
    return { given: !row.revoked_at, revoked: Boolean(row.revoked_at), row };
  };

  const child = children.find((c) => c.id === childId) || null;

  // ============================================================
  // ПОДТВЕРЖДЕНИЕ
  // ============================================================
  const handleGive = async () => {
    if (!openDoc || !confirmed || !childId) return;
    setBusyCode(openDoc.code);
    try {
      const result = await api.giveConsent(childId, openDoc.code);
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось зафиксировать согласие'), 'error');
      } else {
        show(`Согласие «${openDoc.title}» зафиксировано`);
        setOpenDoc(null);
        setConfirmed(false);
        await loadConsents(childId);
      }
    } catch (err) {
      console.error('❌ Ошибка подтверждения согласия:', err);
      show('Не удалось зафиксировать согласие', 'error');
    } finally {
      setBusyCode(null);
    }
  };

  // ============================================================
  // ОТЗЫВ
  // ============================================================
  const handleRevoke = async () => {
    if (!revoking || !childId) return;
    setBusyCode(revoking.code);
    try {
      const result = await api.revokeConsent(childId, revoking.code, revokeReason.trim() || undefined);
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось отозвать согласие'), 'error');
      } else {
        show(`Согласие «${revoking.title}» отозвано`);
        setRevoking(null);
        setRevokeReason('');
        await loadConsents(childId);
      }
    } catch (err) {
      console.error('❌ Ошибка отзыва согласия:', err);
      show('Не удалось отозвать согласие', 'error');
    } finally {
      setBusyCode(null);
    }
  };

  if (loading) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page" style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const required = documents.filter((d) => d.is_required);
  const givenRequired = required.filter((d) => stateOf(d.code).given).length;
  const allDone = required.length > 0 && givenRequired === required.length;

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">Согласия на обработку данных</h1>
            <p className="page-subtitle">
              Согласие за несовершеннолетнего участника вправе дать только его законный
              представитель. Подтверждение здесь равнозначно подписи: дата, редакция текста
              и ваши данные сохраняются в журнале.
            </p>
          </div>
        </div>

        {message && (
          <div className={`message ${messageType === 'error' ? 'message-error' : 'message-success'}`}>
            {message}
          </div>
        )}

        {children.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="family" /></div>
              <h3>К вашему кабинету не привязан ни один ребёнок</h3>
              <p>Привязать ребёнка можно в дашборде родителя — после этого здесь появятся согласия.</p>
              <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/parent-dashboard')}>
                Перейти в дашборд
              </button>
            </div>
          </div>
        )}

        {children.length > 1 && (
          <div className="toolbar">
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Ребёнок:</span>
            <div className="btn-segmented">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={c.id === childId ? 'active' : ''}
                  onClick={() => { setChildId(c.id); setMessage(''); }}
                >
                  {c.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {child && (
          <>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', color: allDone ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  <Icon name={allDone ? 'success' : 'warning'} size={26} />
                </span>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {child.full_name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                    {allDone
                      ? 'Все обязательные согласия оформлены — ребёнок может участвовать в мероприятиях'
                      : `Оформлено ${givenRequired} из ${required.length} обязательных согласий`}
                    {child.club_name ? ` · ${child.club_name}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {documents.length === 0 && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="document" /></div>
                  <h3>Тексты согласий ещё не опубликованы</h3>
                  <p>Обратитесь к координатору движения — без опубликованного текста согласие оформить нельзя.</p>
                </div>
              </div>
            )}

            {documents.map((doc) => {
              const { given, revoked, row } = stateOf(doc.code);
              const draft = String(doc.version || '').includes('черновик');

              return (
                <div className="card" key={doc.code} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      marginTop: '2px',
                      color: given ? 'var(--color-success)'
                        : revoked ? 'var(--color-error)'
                        : doc.is_required ? 'var(--color-warning)' : 'var(--color-gray-400)'
                    }}>
                      <Icon name={given ? 'success' : revoked ? 'lock' : doc.is_required ? 'warning' : 'info'} size={22} />
                    </span>

                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>{doc.title}</strong>
                        {!doc.is_required && <span className="badge badge-neutral">по желанию</span>}
                        {given && <span className="badge badge-success badge-dot">дано</span>}
                        {revoked && <span className="badge badge-error badge-dot">отозвано</span>}
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '6px', lineHeight: 1.6 }}>
                        {doc.purpose && <div>Цель: {doc.purpose}</div>}
                        {given && row && (
                          <div>
                            Дано {new Date(row.given_at).toLocaleDateString('ru-RU')}
                            {row.given_by_full_name ? ` — ${row.given_by_full_name}` : ''}
                            {row.given_by_relation === 'parent' ? ' (законный представитель)' : ''}
                            {row.document_version ? `, редакция ${row.document_version}` : ''}
                          </div>
                        )}
                        {revoked && row && (
                          <div>Отозвано {new Date(row.revoked_at).toLocaleDateString('ru-RU')}</div>
                        )}
                        {!given && !revoked && (
                          <div>{doc.is_required ? 'Требуется для участия в мероприятиях' : 'Можно не оформлять'}</div>
                        )}
                      </div>

                      {draft && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px 12px',
                          background: 'var(--color-warning-bg)',
                          border: '1px solid rgba(184, 146, 31, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          color: 'var(--color-gray-700)',
                          lineHeight: 1.5
                        }}>
                          Редакция «{doc.version}»: текст ещё не утверждён юристом движения.
                          До утверждения согласие лучше не оформлять.
                        </div>
                      )}
                    </div>

                    <div className="btn-group" style={{ marginLeft: 'auto' }}>
                      <button
                        className="btn-outline btn-sm"
                        onClick={() => { setOpenDoc(doc); setConfirmed(false); }}
                      >
                        <Icon name="document" size={14} />
                        {given ? 'Читать текст' : 'Прочитать и подтвердить'}
                      </button>
                      {given && (
                        <button
                          className="btn-danger-soft btn-sm"
                          disabled={busyCode === doc.code}
                          onClick={() => { setRevoking(doc); setRevokeReason(''); }}
                        >
                          Отозвать
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {history.length > 0 && (
              <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                  <h3 className="card-title">Журнал</h3>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Согласие</th>
                        <th>Действие</th>
                        <th>Кто</th>
                        <th>Редакция</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={i}>
                          <td>{new Date(h.changed_at).toLocaleString('ru-RU')}</td>
                          <td>{documents.find((d) => d.code === h.consent_type)?.title || h.consent_type}</td>
                          <td>
                            <span className={`badge ${h.status ? 'badge-success' : 'badge-error'} badge-dot`}>
                              {h.status ? 'дано' : 'отозвано'}
                            </span>
                          </td>
                          <td>{h.changed_by_name || '—'}</td>
                          <td>{h.document_version || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== ЧТЕНИЕ ТЕКСТА И ПОДТВЕРЖДЕНИЕ ===== */}
      {openDoc && (
        <div className="modal-overlay" onClick={() => setOpenDoc(null)}>
          <div className="modal" style={{ maxWidth: '760px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{openDoc.title}</h3>
              <button className="modal-close" onClick={() => setOpenDoc(null)} aria-label="Закрыть">
                <Icon name="close" />
              </button>
            </div>

            <div style={{
              maxHeight: '46vh',
              overflowY: 'auto',
              padding: '16px',
              background: 'var(--color-gray-50)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              lineHeight: 1.7,
              color: 'var(--color-gray-700)',
              whiteSpace: 'pre-wrap'
            }}>
              {openDoc.body || 'Текст согласия не заполнен.'}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '12px', lineHeight: 1.6 }}>
              Оператор: {openDoc.operator_name || '—'}
              {openDoc.operator_inn ? `, ИНН ${openDoc.operator_inn}` : ''}
              {openDoc.operator_address ? `. Адрес: ${openDoc.operator_address}` : ''}
              {openDoc.retention ? `. Срок хранения: ${openDoc.retention}` : ''}
              {` Редакция ${openDoc.version}.`}
            </div>

            {!stateOf(openDoc.code).given && (
              <label style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                marginTop: '18px',
                padding: '14px',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--color-gray-700)'
              }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0 }}
                />
                <span>
                  Я, <strong>{profile?.full_name || 'законный представитель'}</strong>, являюсь законным
                  представителем участника <strong>{child?.full_name}</strong>, текст прочитал(а),
                  с условиями согласен(на) и подтверждаю согласие.
                </span>
              </label>
            )}

            <div className="btn-group" style={{ marginTop: '18px', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setOpenDoc(null)}>Закрыть</button>
              {!stateOf(openDoc.code).given && (
                <button
                  className="btn-primary"
                  disabled={!confirmed || busyCode === openDoc.code}
                  onClick={handleGive}
                >
                  {busyCode === openDoc.code ? 'Сохраняем...' : 'Подтвердить согласие'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== ОТЗЫВ ===== */}
      {revoking && (
        <div className="modal-overlay" onClick={() => setRevoking(null)}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Отозвать согласие</h3>
              <button className="modal-close" onClick={() => setRevoking(null)} aria-label="Закрыть">
                <Icon name="close" />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
              Вы отзываете согласие «{revoking.title}» для участника {child?.full_name}.
              {revoking.is_required
                ? ' Это обязательное согласие: после отзыва участие ребёнка в мероприятиях движения станет невозможным.'
                : ' Это необязательное согласие, на участие в мероприятиях отзыв не влияет.'}
            </p>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Причина (по желанию)</label>
              <textarea
                className="form-control"
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Можно не указывать"
              />
              <span className="form-hint">
                Запись об отзыве останется в журнале — это требование закона, удалить её нельзя.
              </span>
            </div>

            <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setRevoking(null)}>Отмена</button>
              <button
                className="btn-danger"
                disabled={busyCode === revoking.code}
                onClick={handleRevoke}
              >
                {busyCode === revoking.code ? 'Отзываем...' : 'Отозвать согласие'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
