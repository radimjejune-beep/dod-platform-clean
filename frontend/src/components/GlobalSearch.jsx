// frontend/src/components/GlobalSearch.jsx
//
// Поиск в верхней панели.
//
// Чтобы найти человека, надо было знать, в каком разделе смотреть:
// участник — в «Участниках», сотрудник — в «Пользователях», клуб — в
// «Управлении КЮДами». При сорока четырёх клубах это перебор вкладок.
//
// Поиск не расширяет прав: сервер ищет ровно в той зоне, которую человек
// и так может открыть.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Icon from './Icon';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  // Запрос уходит не на каждую букву: человек печатает быстрее, чем
  // отвечает сервер, и без паузы получится десяток лишних запросов
  useEffect(() => {
    if (query.trim().length < 2) {
      setGroups([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const result = await api.search(query.trim());
        setGroups(result.groups || []);
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const go = (link) => {
    setOpen(false);
    setQuery('');
    navigate(link);
  };

  const nothing = open && !busy && query.trim().length >= 2 && groups.length === 0;

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '10px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--color-gray-400)',
          display: 'flex', pointerEvents: 'none'
        }}>
          <Icon name="search" size={16} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => groups.length > 0 && setOpen(true)}
          placeholder="Поиск"
          title="Поиск по людям, КЮДам и мероприятиям"
          style={{
            width: '100%', padding: '8px 12px 8px 32px',
            fontSize: '13.5px', fontFamily: 'inherit',
            border: '1px solid var(--color-gray-200)',
            borderRadius: '20px',
            background: 'var(--color-gray-50)',
            color: 'var(--color-gray-800)', outline: 'none'
          }}
        />
      </div>

      {(open && (groups.length > 0 || nothing)) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          maxHeight: '60vh', overflowY: 'auto', zIndex: 200,
          background: 'white',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 12px 28px rgba(7, 20, 38, 0.14)'
        }}>
          {nothing && (
            <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-gray-500)' }}>
              Ничего не нашли. Поиск идёт только по тому, что вам доступно.
            </div>
          )}

          {groups.map((group) => (
            <div key={group.key}>
              <div style={{
                padding: '8px 14px 4px', fontSize: '11px',
                letterSpacing: '1px', textTransform: 'uppercase',
                color: 'var(--color-gray-400)', fontWeight: 600
              }}>
                {group.label}
              </div>
              {group.items.map((item) => (
                /* Не <button>: общий стиль кнопок в проекте задаёт им
                   line-height: 1 и запрет переноса, из-за чего строка из
                   двух строк налезала на следующую. Перебивать это по
                   одному свойству — борьба с симптомами. */
                <div
                  key={`${group.key}-${item.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => go(item.link)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      go(item.link);
                    }
                  }}
                  style={{
                    padding: '9px 14px', cursor: 'pointer',
                    borderTop: '1px solid var(--color-gray-100)'
                  }}
                >
                  <div style={{
                    fontSize: '13.5px', fontWeight: 500,
                    color: 'var(--color-gray-800)', overflowWrap: 'anywhere'
                  }}>
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div style={{
                      fontSize: '12px', color: 'var(--color-gray-500)',
                      marginTop: '1px', overflowWrap: 'anywhere'
                    }}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
