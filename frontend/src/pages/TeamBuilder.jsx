// frontend/src/pages/TeamBuilder.jsx
//
// Формирование команды КЮДа на форум или выезд.
//
// Участники ВЫБИРАЮТСЯ из клуба, а не вводятся руками: данные подтянутся
// из карточки, а система проверит согласия родителей. Ребёнок без согласий
// в команду не добавится — и это выяснится сейчас, а не когда автобус
// уже заказан.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

const STATUS = {
  draft: { label: 'Черновик', color: 'var(--color-gray-600)', bg: 'var(--color-gray-100)' },
  submitted: { label: 'На утверждении', color: 'var(--color-primary-light)', bg: 'var(--color-info-bg)' },
  approved: { label: 'Утверждена', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  revision_requested: { label: '↩ Возвращена на доработку', color: 'var(--color-error)', bg: 'var(--color-error-bg)' }
};

const EMPTY_ESCORT = {
  full_name: '', birth_date: '', city: '', school_full_name: '',
  parent_full_name: '', parent_phone: '', participant_phone: '', comment: ''
};

export default function TeamBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [search, setSearch] = useState('');
  const [showEscortForm, setShowEscortForm] = useState(false);
  const [escort, setEscort] = useState(EMPTY_ESCORT);
  const [docFor, setDocFor] = useState(null);
  const [docForm, setDocForm] = useState({ document_type: 'birth_certificate', series_number: '', issued_by: '', issued_at: '' });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const data = await api.getTeamSubmission(id);
      if (data?.error) throw new Error(api.describeApiError(data));
      setTeam(data);

      // Кто я в этом клубе — от этого зависит, можно ли отправлять команду
      const myClubs = await api.getMyClubs();
      if (myClubs.movement_wide) {
        setMyPosition('movement');
      } else {
        const mine = (myClubs.clubs || []).find((c) => c.club_id === data.club_id);
        setMyPosition(mine?.position || null);
      }

      // Кандидаты: участники клуба и у кого чего не хватает по согласиям
      const [participants, missing] = await Promise.all([
        api.getParticipants(),
        api.getConsentsMissing()
      ]);

      const missingMap = {};
      for (const m of Array.isArray(missing) ? missing : []) {
        missingMap[m.id] = m.missing || [];
      }

      const list = (Array.isArray(participants) ? participants : [])
        .filter((p) => p.club_id === data.club_id)
        .map((p) => ({ ...p, missing_consents: missingMap[p.id] || [] }));

      setCandidates(list);
    } catch (err) {
      console.error('❌ Ошибка загрузки команды:', err);
      setMessage('❌ ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const show = (text, type = 'success', keep = 5000) => {
    setMessage(text);
    setMessageType(type);
    if (keep) setTimeout(() => setMessage(''), keep);
  };

  const addParticipant = async (participant) => {
    setBusy(true);
    try {
      const result = await api.addTeamMember(id, { participant_id: participant.id, role_in_team: 'student' });
      if (result?.error) {
        // Отдельно разбираем случай с согласиями: это самая частая причина
        if (result.code === 'CONSENTS_MISSING') {
          show(`${participant.full_name}: не оформлены согласия — ${(result.missing || []).join(', ')}`, 'error', 9000);
          return;
        }
        throw new Error(api.describeApiError(result));
      }
      show(`${participant.full_name} добавлен в команду`);
      loadData();
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const addEscort = async (e) => {
    e.preventDefault();
    if (!escort.full_name.trim()) {
      show('ФИО сопровождающего обязательно', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await api.addTeamMember(id, { ...escort, role_in_team: 'escort' });
      if (result?.error) throw new Error(api.describeApiError(result));
      show('Сопровождающий добавлен');
      setEscort(EMPTY_ESCORT);
      setShowEscortForm(false);
      loadData();
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (member) => {
    if (!confirm(`Убрать ${member.full_name} из команды?`)) return;
    setBusy(true);
    try {
      const result = await api.deleteTeamMember(id, member.id);
      if (result?.error) throw new Error(api.describeApiError(result));
      show('Участник убран из команды');
      loadData();
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleExtraProgram = async (member, field) => {
    setBusy(true);
    try {
      const result = await api.updateTeamMember(id, member.id, { [field]: !member[field] });
      if (result?.error) throw new Error(api.describeApiError(result));
      loadData();
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (member) => {
    setDocFor(member);
    setDocForm({ document_type: 'birth_certificate', series_number: '', issued_by: '', issued_at: '' });

    // Если документ уже заполнен — подгружаем, чтобы не вводить заново
    if (member.has_document) {
      const existing = await api.getTeamMemberDocument(id, member.id);
      if (!existing?.error) {
        setDocForm({
          document_type: existing.document_type || 'birth_certificate',
          series_number: existing.series_number || '',
          issued_by: existing.issued_by || '',
          issued_at: existing.issued_at ? String(existing.issued_at).slice(0, 10) : ''
        });
      }
    }
  };

  const saveDocument = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api.saveTeamMemberDocument(id, docFor.id, docForm);
      if (result?.error) throw new Error(api.describeApiError(result));
      show('Данные документа сохранены');
      setDocFor(null);
      loadData();
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitTeam = async () => {
    if (!confirm('Отправить команду на утверждение? После отправки состав менять нельзя.')) return;
    setBusy(true);
    try {
      const result = await api.submitTeam(id);
      if (result?.error) {
        if (result.code === 'CONSENTS_MISSING') {
          const list = (result.problems || []).map((p) => `${p.full_name} (${p.missing.join(', ')})`).join('; ');
          show(`Нельзя отправить: нет согласий — ${list}`, 'error', 12000);
          return;
        }
        throw new Error(api.describeApiError(result));
      }
      show('Команда отправлена на утверждение');
      loadData();
    } catch (err) {
      show('❌ ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!team || team.error) {
    return (
      <div className="page-background">
        <Navigation profile={profile} />
        <div className="container-page">
          <div className="empty-state">
            <div className="empty-state-icon">🚫</div>
            <div>Команда не найдена или нет доступа</div>
            <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/my-invitations')}>
              ← К приглашениям
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = STATUS[team.status] || STATUS.draft;
  const editable = team.editable;
  const canSubmit = myPosition === 'head' || myPosition === 'movement';
  const students = team.members.filter((m) => m.role_in_team !== 'escort');
  const escorts = team.members.filter((m) => m.role_in_team === 'escort');
  const inTeam = new Set(team.members.map((m) => m.participant_id).filter(Boolean));

  const filtered = candidates
    .filter((c) => !inTeam.has(c.id))
    .filter((c) => !search || c.full_name.toLowerCase().includes(search.toLowerCase()));

  const quotaLeft = team.quota ? team.quota - students.length : null;

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <button className="btn-secondary btn-sm" style={{ marginBottom: '16px' }} onClick={() => navigate('/my-invitations')}>
          ← К приглашениям
        </button>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>
            {message}
          </div>
        )}

        {/* ===== ШАПКА ===== */}
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ marginBottom: '6px' }}>{team.event_title}</h2>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
                {team.club_name}
                {team.event_date && <> · {new Date(team.event_date).toLocaleDateString('ru-RU')}</>}
              </div>
            </div>
            <span className="tag" style={{ background: status.bg, color: status.color, height: 'fit-content' }}>
              {status.label}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '16px', fontSize: '14px' }}>
            <div><strong>{students.length}</strong> школьников</div>
            {team.allow_escorts && <div><strong>{escorts.length}</strong> сопровождающих</div>}
            {team.quota && (
              <div style={{ color: quotaLeft <= 0 ? 'var(--color-error)' : 'var(--color-gray-600)' }}>
                Квота: <strong>{students.length} из {team.quota}</strong>
                {quotaLeft > 0 && ` (осталось ${quotaLeft})`}
              </div>
            )}
            {team.deadline && (
              <div>Срок: <strong>{new Date(team.deadline).toLocaleDateString('ru-RU')}</strong></div>
            )}
          </div>

          {team.status === 'revision_requested' && team.review_comment && (
            <div style={{
              marginTop: '16px', padding: '12px',
              background: 'var(--color-error-bg)', borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)', fontSize: '14px'
            }}>
              <strong>Возвращено на доработку:</strong> {team.review_comment}
            </div>
          )}

          {!editable && (
            <div style={{
              marginTop: '16px', padding: '12px',
              background: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)',
              fontSize: '14px', color: 'var(--color-gray-600)'
            }}>
              Состав закрыт для правок. Чтобы изменить его, попросите координатора движения вернуть команду на доработку.
            </div>
          )}
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* ===== КАНДИДАТЫ ===== */}
          {editable && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>Участники клуба</h3>

              <input
                className="form-input"
                placeholder="Поиск по ФИО"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: '12px' }}
              />

              {filtered.length === 0 && (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <div>{candidates.length === 0 ? 'В клубе пока нет участников' : 'Все подходящие участники уже в команде'}</div>
                </div>
              )}

              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {filtered.map((c) => {
                  const blocked = c.missing_consents.length > 0;
                  const quotaFull = quotaLeft !== null && quotaLeft <= 0;

                  return (
                    <div
                      key={c.id}
                      className="list-item"
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: '12px', padding: '10px 0',
                        borderBottom: '1px solid var(--color-gray-200)',
                        opacity: blocked ? 0.65 : 1
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
                          {c.class_name ? `${c.class_name} класс` : ''}
                          {c.school ? ` · ${c.school}` : ''}
                        </div>
                        {blocked && (
                          <div style={{ fontSize: '13px', color: 'var(--color-error)', marginTop: '4px' }}>
                            Нет согласий: {c.missing_consents.join(', ')}
                          </div>
                        )}
                      </div>

                      <button
                        className="btn-primary btn-sm"
                        onClick={() => addParticipant(c)}
                        disabled={busy || blocked || quotaFull}
                        title={
                          blocked ? 'Родитель не оформил согласия'
                            : quotaFull ? 'Квота исчерпана' : 'Добавить в команду'
                        }
                      >
                        ➕
                      </button>
                    </div>
                  );
                })}
              </div>

              {team.allow_escorts && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-gray-200)' }}>
                  <button className="btn-secondary" onClick={() => setShowEscortForm(!showEscortForm)}>
                    {showEscortForm ? 'Отмена' : 'Добавить сопровождающего'}
                  </button>

                  {showEscortForm && (
                    <form onSubmit={addEscort} style={{ marginTop: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">ФИО сопровождающего *</label>
                        <input className="form-input" value={escort.full_name}
                          onChange={(e) => setEscort({ ...escort, full_name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Телефон</label>
                        <input className="form-input" value={escort.participant_phone}
                          onChange={(e) => setEscort({ ...escort, participant_phone: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Организация</label>
                        <input className="form-input" value={escort.school_full_name}
                          onChange={(e) => setEscort({ ...escort, school_full_name: e.target.value })} />
                      </div>
                      <button type="submit" className="btn-success" disabled={busy}>Добавить</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== СОСТАВ КОМАНДЫ ===== */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>Состав команды</h3>

            {team.members.length === 0 && (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div className="empty-state-icon">👥</div>
                <div>Команда пока пуста</div>
              </div>
            )}

            {team.members.map((m) => (
              <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-gray-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {m.full_name}
                      {m.role_in_team === 'escort' && <span className="tag" style={{ marginLeft: '8px' }}>сопровождающий</span>}
                      {m.role_in_team === 'captain' && <span className="tag tag-blue" style={{ marginLeft: '8px' }}>капитан</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
                      {m.birth_date && `${new Date(m.birth_date).toLocaleDateString('ru-RU')} · `}
                      {m.class_name && `${m.class_name} класс · `}
                      {m.school_full_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
                      {m.parent_full_name && `Родитель: ${m.parent_full_name}`}
                      {m.parent_phone && ` · ${m.parent_phone}`}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {m.has_document
                        ? <span className="tag" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>документ заполнен</span>
                        : <span className="tag" style={{ background: 'var(--color-gold-pale)', color: 'var(--color-gold-dark)' }}>документ не заполнен</span>}
                      {editable && (
                        <button className="btn-secondary btn-sm" onClick={() => openDocument(m)} disabled={busy}>
                          {m.has_document ? 'Изменить документ' : 'Заполнить документ'}
                        </button>
                      )}
                      {m.extra_program && <span className="tag">доп. программа</span>}
                    </div>
                  </div>

                  {editable && (
                    <button className="btn-danger btn-sm" onClick={() => removeMember(m)} disabled={busy} title="Убрать из команды">
                      🗑
                    </button>
                  )}
                </div>

                {editable && (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px' }}>
                    <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={m.extra_program || false}
                        onChange={() => toggleExtraProgram(m, 'extra_program')} disabled={busy} />
                      Участвует в доп. программе
                    </label>
                    {m.extra_program && (
                      <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" checked={m.extra_program_ack || false}
                          onChange={() => toggleExtraProgram(m, 'extra_program_ack')} disabled={busy} />
                        Ознакомлен, расходы самостоятельно
                      </label>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* ===== ОТПРАВКА ===== */}
            {editable && team.members.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-gray-200)' }}>
                {canSubmit ? (
                  <button className="btn-success w-full" onClick={submitTeam} disabled={busy}>
                    Отправить команду на утверждение
                  </button>
                ) : (
                  <div style={{
                    padding: '12px', background: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--color-gray-600)'
                  }}>
                    Состав собран. Отправить команду на утверждение может только руководитель КЮДа —
                    это подпись под списком детей, которые поедут.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== ДОКУМЕНТ УЧАСТНИКА ===== */}
        {docFor && (
          <div className="modal-overlay" onClick={() => setDocFor(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Документ: {docFor.full_name}</h3>
                <button className="modal-close" onClick={() => setDocFor(null)}>✖</button>
              </div>

              <div style={{
                padding: '12px', marginBottom: '16px',
                background: 'var(--color-info-bg)', borderRadius: 'var(--radius-sm)',
                fontSize: '13px', color: 'var(--color-gray-700)', lineHeight: 1.5
              }}>
                Эти данные нужны только для проведения мероприятия: гостиница,
                транспорт, списки на входе. Они хранятся отдельно от карточки
                участника, не показываются в общих списках и удаляются после
                мероприятия.
              </div>

              <form onSubmit={saveDocument}>
                <div className="form-group">
                  <label className="form-label">Вид документа</label>
                  <select className="form-input" value={docForm.document_type}
                    onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}>
                    <option value="birth_certificate">Свидетельство о рождении</option>
                    <option value="passport">Паспорт гражданина РФ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Серия и номер</label>
                  <input className="form-input" value={docForm.series_number}
                    onChange={(e) => setDocForm({ ...docForm, series_number: e.target.value })}
                    placeholder={docForm.document_type === 'passport' ? '00 00 000000' : 'I-АБ 000000'} />
                </div>

                <div className="form-group">
                  <label className="form-label">Кем выдан</label>
                  <input className="form-input" value={docForm.issued_by}
                    onChange={(e) => setDocForm({ ...docForm, issued_by: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата выдачи</label>
                  <input type="date" className="form-input" value={docForm.issued_at}
                    onChange={(e) => setDocForm({ ...docForm, issued_at: e.target.value })} />
                </div>

                <div className="btn-group">
                  <button type="submit" className="btn-success" disabled={busy}>Сохранить</button>
                  <button type="button" className="btn-secondary" onClick={() => setDocFor(null)}>Отмена</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
