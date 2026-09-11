// frontend/src/pages/Attention.jsx
//
// Требует внимания.
//
// Чтобы понять состояние дел, раньше нужно было обойти десяток
// разделов: согласия, КЮДы, отчёты, команды, журнал занятий. Никто
// этого не делает — поэтому сорок два клуба из сорока четырёх живут без
// руководителя в системе, и никого это не беспокоит ровно до того дня,
// когда нужно собрать команду на форум.
//
// Экран отвечает на один вопрос: что сломается ближайшим, если не
// вмешаться. Поэтому у каждого пункта написано не только «сколько», но
// и «чем это грозит» — иначе список превращается в фоновый шум, на
// который перестают смотреть.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

const SECTION_ICON = {
  no_parent: 'family',
  no_consent: 'consent',
  no_head: 'crown',
  no_report: 'report',
  faded: 'clock',
  teams_waiting: 'megaphone',
  teams_not_formed: 'users'
};

export default function Attention() {
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(() => new Set());
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await api.getMe();
      if (!me || !me.id) return;
      setProfile(me);
      setData(await api.getAttention());
    } catch (err) {
      console.error('❌ Ошибка загрузки сводки:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key) => {
    setOpened((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const nameOf = (item) =>
    item.full_name || item.name || item.event_title || item.club_name || '—';

  const noteOf = (item) => {
    if (item.full_name && item.club_name) return item.club_name;
    if (item.event_title && item.club_name) return item.club_name;
    if (item.city) return item.city;
    return null;
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

  const sections = data?.sections || [];
  const total = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <span className="page-header-icon"><Icon name="warning" size={26} /></span>
          <div>
            <h1 className="page-title">Требует внимания</h1>
            <p className="page-subtitle">
              {data?.scope === 'club'
                ? 'То, что мешает работе вашего КЮДа прямо сейчас.'
                : 'То, что мешает работе движения прямо сейчас.'}
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn-outline" onClick={load}>
              <Icon name="refresh" size={15} />
              Обновить
            </button>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                <Icon name="success" />
              </div>
              <h3>Всё в порядке</h3>
              <p>Ничего срочного нет: согласия оформлены, руководители назначены, отчёты сданы.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="message message-warning">
              Всего требует внимания: <strong>{total}</strong> в {sections.length} направлениях.
              Начните сверху — там то, что блокирует остальное.
            </div>

            {sections.map((section) => {
              const isOpen = opened.has(section.key);
              const shown = isOpen ? section.items : section.items.slice(0, 5);

              return (
                <div className="card" key={section.key} style={{ marginBottom: '14px' }}>
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span className="page-header-icon" style={{ width: '36px', height: '36px' }}>
                        <Icon name={SECTION_ICON[section.key] || 'info'} size={18} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="card-title">{section.title}</h3>
                        <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', lineHeight: 1.5 }}>
                          {section.why}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-warning badge-dot">{section.items.length}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {shown.map((item, i) => (
                      <span
                        key={item.id || `${section.key}-${i}`}
                        style={{
                          fontSize: '13px',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: 'var(--color-gray-100)',
                          color: 'var(--color-gray-700)'
                        }}
                      >
                        {nameOf(item)}
                        {noteOf(item) && (
                          <span style={{ color: 'var(--color-gray-500)' }}> · {noteOf(item)}</span>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="btn-group" style={{ marginTop: '14px' }}>
                    <button className="btn-primary btn-sm" onClick={() => navigate(section.link)}>
                      {section.action}
                    </button>
                    {section.items.length > 5 && (
                      <button className="btn-ghost btn-sm" onClick={() => toggle(section.key)}>
                        {isOpen ? 'Свернуть' : `Показать все ${section.items.length}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
