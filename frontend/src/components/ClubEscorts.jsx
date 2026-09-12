// frontend/src/components/ClubEscorts.jsx
//
// Справочник сопровождающих взрослых КЮДа. На каждый форум ФИО, телефон и
// организацию вбивали заново — теперь человек заводится один раз и
// выбирается из списка.
//
// Это не пользователи платформы: ни входа, ни прав. Только карточка, чтобы
// не набирать одно и то же по три раза в год.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import Icon from './Icon';

const EMPTY = { full_name: '', phone: '', organization: '', relation: '' };

export default function ClubEscorts({ clubId, canManage }) {
  const [escorts, setEscorts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => { if (clubId) load(); }, [clubId]);

  const load = async () => setEscorts(await api.getClubEscorts(clubId));

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await api.addClubEscort(clubId, form);
      if (result?.error) {
        setMessage(api.describeApiError(result, 'Не удалось добавить'));
        setMessageType('error');
        return;
      }
      setForm(EMPTY);
      setShowForm(false);
      setMessage('Сопровождающий добавлен');
      setMessageType('success');
      await load();
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmRemove) return;
    setBusy(true);
    try {
      await api.removeClubEscort(clubId, confirmRemove.id);
      setConfirmRemove(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Сопровождающие взрослые</h3>
        {canManage && (
          <button
            className="btn-outline btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Отмена' : 'Добавить'}
          </button>
        )}
      </div>

      <p style={{ color: 'var(--color-gray-600)', fontSize: '13px', marginTop: '6px' }}>
        Те, кто ездит с КЮДом на форумы. Заведите человека один раз — дальше он
        выбирается из списка при сборе команды. Учётной записи и входа в
        платформу у них нет.
      </p>

      {message && (
        <div className={messageType === 'success' ? 'message message-success' : 'message message-error'}>
          {message}
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={add} style={{ marginTop: '12px' }}>
          <div className="grid-2">
            <div className="form-group">
              <label>ФИО <span className="required">*</span></label>
              <input
                className="form-control"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Нагоева Римма Артаговна"
                required
              />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 999 123 45 67"
              />
            </div>
            <div className="form-group">
              <label>Организация</label>
              <input
                className="form-control"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="МКОУ Гимназия № 4"
              />
            </div>
            <div className="form-group">
              <label>Кем приходится</label>
              <input
                className="form-control"
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="Учитель, родитель, методист"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Добавить'}
          </button>
        </form>
      )}

      {escorts.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)', marginTop: '12px' }}>
          Список пуст. Пока он пуст, данные сопровождающего придётся вводить
          на каждый форум заново.
        </p>
      ) : (
        <div className="list" style={{ marginTop: '12px' }}>
          {escorts.map((e) => (
            <div className="list-row" key={e.id}>
              <div className="title">{e.full_name}</div>
              <div className="subtitle">
                {[e.relation, e.organization, e.phone].filter(Boolean).join(' · ') || 'Контакты не указаны'}
              </div>
              {canManage && (
                <div className="row-actions">
                  <button
                    className="btn-ghost btn-sm btn-icon row-action-danger"
                    onClick={() => setConfirmRemove(e)}
                    title="Убрать из списка"
                    aria-label="Убрать из списка"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Убрать из списка?</h3>
            </div>
            <p style={{ color: 'var(--color-gray-600)' }}>
              {confirmRemove.full_name} пропадёт из списка при сборе команды. В уже
              поданных заявках он останется — там данные сохранены отдельно.
            </p>
            <div className="modal-actions">
              <button className="btn-danger" onClick={remove} disabled={busy}>Убрать</button>
              <button className="btn-outline" onClick={() => setConfirmRemove(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
