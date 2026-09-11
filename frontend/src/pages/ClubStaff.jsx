// frontend/src/pages/ClubStaff.jsx
//
// Сотрудники КЮДа и их должности.
//
// Раньше в клубе была одна должность — координатор, и помощнику
// приходилось либо давать полные права, либо не давать никаких.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

const POSITIONS = [
  { code: 'head', label: 'Руководитель КЮДа', hint: 'Отвечает за клуб целиком. Один на клуб.' },
  { code: 'deputy', label: 'Заместитель руководителя', hint: 'Замещает во всём, кроме отправки команд и управления составом сотрудников.' },
  { code: 'methodist', label: 'Методист', hint: 'Программы, мероприятия, отчётность. Состав клуба не меняет.' },
  { code: 'curator', label: 'Куратор', hint: 'Работа с детьми: заметки, оценки, достижения.' },
  { code: 'assistant', label: 'Помощник', hint: 'Видит клуб и помогает. Ничего не меняет.' }
];

const POSITION_COLOR = {
  head: 'var(--color-gold)',
  deputy: 'var(--color-primary-light)',
  methodist: 'var(--color-success)',
  curator: 'var(--color-gray-600)',
  assistant: 'var(--color-gray-400)'
};

export default function ClubStaff() {
  const { clubId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [staff, setStaff] = useState([]);
  const [users, setUsers] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ user_id: '', position: 'assistant', comment: '' });
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ new_head_id: '', keep_as: 'deputy' });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setProfile(userData);

      const [staffData, clubsData, usersData, myClubs] = await Promise.all([
        api.getClubStaff(clubId),
        api.getClubs(),
        api.getUsers(),
        api.getMyClubs()
      ]);

      setStaff(Array.isArray(staffData) ? staffData : []);

      const clList = Array.isArray(clubsData) ? clubsData : clubsData?.data || [];
      setClub(clList.find((c) => c.id === clubId) || null);

      // Сотрудником клуба не может быть участник или родитель
      const uList = (Array.isArray(usersData) ? usersData : usersData?.data || [])
        .filter((u) => !['participant', 'parent'].includes(u.role));
      setUsers(uList);

      if (myClubs.movement_wide) {
        setMyPosition('movement');
      } else {
        const mine = (myClubs.clubs || []).find((c) => c.club_id === clubId);
        setMyPosition(mine?.position || null);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки сотрудников:', err);
      setMessage('Не удалось загрузить сотрудников клуба');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const show = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const canManage = myPosition === 'head' || myPosition === 'movement';

  const addStaff = async (e) => {
    e.preventDefault();
    if (!addForm.user_id) {
      show('Выберите человека', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await api.addClubStaff(clubId, addForm);
      if (result?.error) throw new Error(api.describeApiError(result));
      show('Сотрудник назначен');
      setAddForm({ user_id: '', position: 'assistant', comment: '' });
      setShowAdd(false);
      loadData();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePosition = async (member, position) => {
    setBusy(true);
    try {
      const result = await api.updateClubStaff(clubId, member.user_id, position);
      if (result?.error) throw new Error(api.describeApiError(result));
      show(`${member.full_name}: должность изменена`);
      loadData();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeStaff = async (member) => {
    if (!confirm(`Снять ${member.full_name} с должности в этом КЮДе?`)) return;
    setBusy(true);
    try {
      const result = await api.removeClubStaff(clubId, member.user_id);
      if (result?.error) throw new Error(api.describeApiError(result));
      show('Сотрудник снят с должности');
      loadData();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const transferHead = async (e) => {
    e.preventDefault();
    if (!transferForm.new_head_id) {
      show('Выберите нового руководителя', 'error');
      return;
    }
    if (!confirm('Передать руководство КЮДом? Вы перестанете быть руководителем.')) return;
    setBusy(true);
    try {
      const result = await api.transferClubHead(clubId, transferForm);
      if (result?.error) throw new Error(api.describeApiError(result));
      show(`Руководство передано: ${result.new_head}`);
      setShowTransfer(false);
      loadData();
    } catch (err) {
      show(err.message, 'error');
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

  const head = staff.find((s) => s.position === 'head');
  const staffIds = new Set(staff.map((s) => s.user_id));
  const available = users.filter((u) => !staffIds.has(u.id));

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <button className="btn-secondary btn-sm" style={{ marginBottom: '16px' }} onClick={() => navigate('/clubs')}>
          ← К списку КЮДов
        </button>

        {message && (
          <div className={messageType === 'success' ? 'message-success' : 'message-error'}>{message}</div>
        )}

        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '6px' }}>Сотрудники КЮДа</h2>
          <div style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
            {club?.name || 'Клуб'} · сотрудников: {staff.length}
          </div>

          {canManage && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
                {showAdd ? 'Закрыть' : 'Назначить сотрудника'}
              </button>
              {head && (
                <button className="btn-secondary" onClick={() => setShowTransfer(!showTransfer)}>
                  Передать руководство
                </button>
              )}
            </div>
          )}

          {!canManage && (
            <div style={{
              marginTop: '16px', padding: '12px',
              background: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)',
              fontSize: '14px', color: 'var(--color-gray-600)'
            }}>
              Изменять состав сотрудников может руководитель КЮДа или координатор движения.
              Иначе заместитель назначил бы себе заместителя, и через месяц было бы не разобраться,
              кто в клубе главный.
            </div>
          )}
        </div>

        {/* ===== НАЗНАЧЕНИЕ ===== */}
        {showAdd && canManage && (
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>Назначить сотрудника</h3>

            <form onSubmit={addStaff}>
              <div className="form-group">
                <label className="form-label">Кого назначаем</label>
                <select className="form-input" value={addForm.user_id}
                  onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })} required>
                  <option value="">— выберите человека —</option>
                  {available.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
                {available.length === 0 && (
                  <div className="form-hint">
                    Все подходящие пользователи уже работают в этом клубе.
                    Новых сотрудников заводят в разделе «Пользователи».
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Должность</label>
                <select className="form-input" value={addForm.position}
                  onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}>
                  {POSITIONS.filter((p) => p.code !== 'head').map((p) => (
                    <option key={p.code} value={p.code}>{p.label}</option>
                  ))}
                </select>
                <div className="form-hint">
                  {POSITIONS.find((p) => p.code === addForm.position)?.hint}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Примечание</label>
                <input className="form-input" value={addForm.comment}
                  placeholder="необязательно"
                  onChange={(e) => setAddForm({ ...addForm, comment: e.target.value })} />
              </div>

              <button type="submit" className="btn-success" disabled={busy}>Назначить</button>
            </form>
          </div>
        )}

        {/* ===== ПЕРЕДАЧА РУКОВОДСТВА ===== */}
        {showTransfer && canManage && (
          <div className="card" style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid var(--color-gold)' }}>
            <h3 style={{ marginBottom: '12px' }}>Передать руководство КЮДом</h3>

            <div style={{
              padding: '12px', marginBottom: '16px',
              background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-sm)',
              fontSize: '14px', color: 'var(--color-gray-700)'
            }}>
              Руководитель в клубе один. Обе операции — снятие прежнего и назначение
              нового — выполняются вместе, чтобы клуб не остался без руководителя.
            </div>

            <form onSubmit={transferHead}>
              <div className="form-group">
                <label className="form-label">Новый руководитель</label>
                <select className="form-input" value={transferForm.new_head_id}
                  onChange={(e) => setTransferForm({ ...transferForm, new_head_id: e.target.value })} required>
                  <option value="">— выберите —</option>
                  <optgroup label="Сотрудники этого КЮДа">
                    {staff.filter((s) => s.position !== 'head').map((s) => (
                      <option key={s.user_id} value={s.user_id}>{s.full_name} — {s.position_label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Остальные">
                    {available.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Что делать с прежним руководителем</label>
                <select className="form-input" value={transferForm.keep_as}
                  onChange={(e) => setTransferForm({ ...transferForm, keep_as: e.target.value })}>
                  <option value="deputy">Оставить заместителем</option>
                  <option value="methodist">Оставить методистом</option>
                  <option value="curator">Оставить куратором</option>
                  <option value="assistant">Оставить помощником</option>
                  <option value="">Снять с должности совсем</option>
                </select>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn-primary" disabled={busy}>Передать руководство</button>
                <button type="button" className="btn-secondary" onClick={() => setShowTransfer(false)}>Отмена</button>
              </div>
            </form>
          </div>
        )}

        {/* ===== СОСТАВ ===== */}
        {staff.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="users" /></div>
            <div>В клубе пока нет сотрудников</div>
          </div>
        )}

        {staff.map((s) => (
          <div className="card" key={s.id} style={{
            padding: '16px', marginBottom: '12px',
            borderLeft: `4px solid ${POSITION_COLOR[s.position] || 'var(--color-gray-300)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>
                  {s.full_name}
                  {s.position === 'head' && <span style={{ marginLeft: '8px' }}><Icon name="crown" /></span>}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
                  {s.email}{s.phone ? ` · ${s.phone}` : ''}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  Назначен {new Date(s.appointed_at).toLocaleDateString('ru-RU')}
                  {s.appointed_by_name ? ` — ${s.appointed_by_name}` : ''}
                </div>
                {s.comment && (
                  <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', marginTop: '4px', fontStyle: 'italic' }}>
                    {s.comment}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {canManage && s.position !== 'head' ? (
                  <>
                    <select
                      className="form-input"
                      style={{ width: 'auto', minWidth: '200px' }}
                      value={s.position}
                      onChange={(e) => changePosition(s, e.target.value)}
                      disabled={busy}
                    >
                      {POSITIONS.filter((p) => p.code !== 'head').map((p) => (
                        <option key={p.code} value={p.code}>{p.label}</option>
                      ))}
                    </select>
                    <button className="btn-danger btn-sm" onClick={() => removeStaff(s)} disabled={busy} title="Снять с должности">
                      <Icon name="trash" />
                    </button>
                  </>
                ) : (
                  <span className="tag" style={{
                    background: 'var(--color-gray-100)',
                    color: POSITION_COLOR[s.position] || 'var(--color-gray-600)'
                  }}>
                    {s.position_label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* ===== СПРАВКА ПО ДОЛЖНОСТЯМ ===== */}
        <div className="card" style={{ padding: '20px', marginTop: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Что может каждая должность</h3>
          {POSITIONS.map((p) => (
            <div key={p.code} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-gray-200)' }}>
              <div style={{ fontWeight: 600, color: POSITION_COLOR[p.code] }}>{p.label}</div>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-600)' }}>{p.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
