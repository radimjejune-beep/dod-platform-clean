// frontend/src/pages/IssueCredentials.jsx
//
// Выдача доступов списком.
//
// Почты у движения нет, поэтому логины и пароли раздаются файлом:
// координатор выгружает Excel и передаёт его руководителям КЮДов, те —
// участникам и сотрудникам. Схема рабочая ровно потому, что пароль
// одноразовый: при первом входе платформа заставит его сменить, и
// выданный пароль сразу перестаёт что-либо значить.
//
// Пароли показываются один раз. В базе лежит только хеш — восстановить
// их нельзя ни администратору, ни разработчику. Потерялся файл — выдать
// заново, это нормальная операция, а не авария.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { roleLabel, ROLE_LABELS } from '../lib/roles';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function IssueCredentials() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  const [clubFilter, setClubFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [onlyUnused, setOnlyUnused] = useState(true);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(() => new Set());

  const [issued, setIssued] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me || !me.id) { navigate('/login'); return; }
      setProfile(me);
      const [usersData, clubsData] = await Promise.all([api.getUsers(), api.getClubs()]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setClubs(Array.isArray(clubsData) ? clubsData : []);
    } catch (err) {
      console.error('❌ Ошибка загрузки списка пользователей:', err);
      show('Не удалось загрузить список пользователей', 'error');
    } finally {
      setLoading(false);
    }
  };

  const show = (text, type = 'success') => { setMessage(text); setMessageType(type); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (u.id === profile?.id) return false;                 // себе пароль не сбрасываем
      if (u.status && u.status !== 'active') return false;    // заблокированным доступ не выдаём
      if (clubFilter !== 'all' && u.club_id !== clubFilter) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // «Ещё не входил» — это и есть признак действующего временного пароля
      if (onlyUnused && u.must_change_password !== true) return false;
      if (q) {
        const hay = `${u.full_name || ''} ${u.email || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, profile, clubFilter, roleFilter, onlyUnused, search]);

  const allPicked = filtered.length > 0 && filtered.every((u) => picked.has(u.id));
  const pickedList = filtered.filter((u) => picked.has(u.id));
  // Те, кто уже сменил пароль: для них выдача означает сброс рабочего пароля
  const willReset = pickedList.filter((u) => u.must_change_password !== true);

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allPicked) filtered.forEach((u) => next.delete(u.id));
      else filtered.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const issue = async () => {
    if (pickedList.length === 0) return;
    if (willReset.length > 0) {
      const ok = await confirmAction({
        title: 'Часть людей потеряет свой пароль',
        text: `${willReset.length} из выбранных уже пользуются своим паролем. `
          + 'Он будет заменён временным, и войти со старым они больше не смогут.',
        confirmLabel: 'Выдать временные',
        tone: 'danger'
      });
      if (!ok) return;
    }

    setIssuing(true);
    setMessage('');
    try {
      const result = await api.issueCredentials(pickedList.map((u) => u.id));
      if (result?.error) {
        show(api.describeApiError(result, 'Не удалось выдать доступы'), 'error');
      } else {
        setIssued(result.issued || []);
        setPicked(new Set());
        await load();
        show(`Выдано доступов: ${result.issued?.length || 0}. Сохраните файл — пароли больше не покажутся.`);
      }
    } catch (err) {
      console.error('❌ Ошибка выдачи доступов:', err);
      show('Не удалось выдать доступы', 'error');
    } finally {
      setIssuing(false);
    }
  };

  const toExcel = () => {
    if (!issued || issued.length === 0) return;
    const rows = issued.map((u) => ({
      'ФИО': u.full_name,
      'Логин': u.email,
      'Временный пароль': u.password,
      'Роль': roleLabel(u.role),
      'КЮД': u.club_name || '—',
      'Что сделать': 'Войти на сайте и сменить пароль при первом входе'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 32 }, { wch: 34 }, { wch: 20 }, { wch: 22 }, { wch: 26 }, { wch: 46 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Доступы');
    XLSX.writeFile(wb, `Доступы_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const copyList = async () => {
    if (!issued) return;
    const text = issued
      .map((u) => `${u.full_name}\nЛогин: ${u.email}\nВременный пароль: ${u.password}\n`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      show('Скопировано');
    } catch {
      show('Буфер обмена недоступен — выгрузите файл', 'error');
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

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <span className="page-header-icon"><Icon name="key" size={26} /></span>
          <div>
            <h1 className="page-title">Выдача доступов</h1>
            <p className="page-subtitle">
              Временные пароли списком — чтобы раздать их руководителям КЮДов, а те передадут
              участникам. При первом входе платформа потребует сменить пароль, поэтому
              выданный пароль одноразовый.
            </p>
          </div>
        </div>

        {message && (
          <div className={`message ${messageType === 'error' ? 'message-error' : 'message-success'}`}>
            {message}
          </div>
        )}

        {/* ===== ВЫДАННЫЕ ПАРОЛИ — ПОКАЗЫВАЮТСЯ ОДИН РАЗ ===== */}
        {issued && issued.length > 0 && (
          <div className="card" style={{ marginBottom: '20px', borderTop: '3px solid var(--color-gold)' }}>
            <div className="card-header">
              <h3 className="card-title">Выдано доступов: {issued.length}</h3>
              <div className="btn-group">
                <button className="btn-gold" onClick={toExcel}>
                  <Icon name="download" size={15} />
                  Выгрузить в Excel
                </button>
                <button className="btn-outline" onClick={copyList}>Скопировать списком</button>
              </div>
            </div>

            <div className="message message-warning" style={{ marginBottom: '16px' }}>
              Пароли показываются один раз. В базе хранится только их зашифрованный отпечаток —
              восстановить пароль не сможет никто, включая администратора. Сохраните файл сейчас;
              если он потеряется, доступы просто выдаются заново.
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Временный пароль</th>
                    <th>Роль</th>
                    <th>КЮД</th>
                  </tr>
                </thead>
                <tbody>
                  {issued.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        {u.password}
                      </td>
                      <td>{roleLabel(u.role)}</td>
                      <td>{u.club_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ОТБОР ===== */}
        <div className="toolbar">
          <div className="search-field">
            <Icon name="search" size={16} />
            <input
              className="form-control"
              placeholder="Поиск по ФИО или логину"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="form-control" value={clubFilter} onChange={(e) => setClubFilter(e.target.value)}>
            <option value="all">Все КЮДы</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select className="form-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Все роли</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-gray-600)' }}>
            <input type="checkbox" checked={onlyUnused} onChange={(e) => setOnlyUnused(e.target.checked)} />
            Только те, кто ещё ни разу не входил
          </label>

          <div className="toolbar-spacer" />

          <button className="btn-primary" disabled={pickedList.length === 0 || issuing} onClick={issue}>
            {issuing ? 'Выдаём...' : `Выдать временные пароли (${pickedList.length})`}
          </button>
        </div>

        {willReset.length > 0 && (
          <div className="message message-warning">
            Среди выбранных {willReset.length} уже пользуются своим паролем. Им он будет заменён
            временным, и войти со старым они больше не смогут.
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Кому выдать — {filtered.length}</h3>
            {filtered.length > 0 && (
              <button className="btn-ghost btn-sm" onClick={toggleAll}>
                {allPicked ? 'Снять всё' : 'Выбрать всё'}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="users" /></div>
              <h3>Никто не подходит под отбор</h3>
              <p>
                {onlyUnused
                  ? 'Все выбранные уже входили и сменили пароль. Снимите галочку «Только те, кто ещё ни разу не входил», чтобы выдать пароль заново.'
                  : 'Измените фильтры по КЮДу или роли.'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Роль</th>
                    <th>КЮД</th>
                    <th>Состояние</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={picked.has(u.id)}
                          onChange={() => toggle(u.id)}
                          aria-label={`Выбрать ${u.full_name}`}
                        />
                      </td>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>{roleLabel(u.role)}</td>
                      <td>{u.club_name || '—'}</td>
                      <td>
                        {u.must_change_password
                          ? <span className="badge badge-warning badge-dot">ещё не входил</span>
                          : <span className="badge badge-success badge-dot">пароль свой</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
