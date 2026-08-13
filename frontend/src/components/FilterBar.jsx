// frontend/src/components/FilterBar.jsx

import { useState } from 'react';

export default function FilterBar({ 
  filters = [], 
  onFilterChange, 
  onSearchChange,
  onReset,
  searchPlaceholder = '🔍 Поиск...',
  showSearch = true,
  showReset = true,
  children,
  className = ''
}) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = (value) => {
    setSearch(value);
    if (onSearchChange) onSearchChange(value);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (!value || value === '') {
      delete newFilters[key];
    }
    setActiveFilters(newFilters);
    if (onFilterChange) onFilterChange(newFilters);
  };

  const handleReset = () => {
    setSearch('');
    setActiveFilters({});
    if (onSearchChange) onSearchChange('');
    if (onFilterChange) onFilterChange({});
    if (onReset) onReset();
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || search.length > 0;

  // Показываем только первые 2 фильтра, остальные скрыты под "Ещё"
  const visibleFilters = filters.slice(0, 2);
  const hiddenFilters = filters.slice(2);

  return (
    <div className={`filter-bar ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '20px',
      padding: '16px 20px',
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #E2E7EF',
      boxShadow: '0 2px 8px rgba(11, 31, 58, 0.04)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* ПОИСК */}
        {showSearch && (
          <div style={{ flex: '1 1 200px', minWidth: '180px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '16px',
              color: '#98A2B3'
            }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                border: '1.5px solid #E2E7EF',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s ease',
                background: '#F8FAFC',
                color: '#0B1F3A'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0B1F3A';
                e.target.style.background = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(11, 31, 58, 0.06)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E7EF';
                e.target.style.background = '#F8FAFC';
                e.target.style.boxShadow = 'none';
              }}
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#98A2B3',
                  fontSize: '16px',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ВИДИМЫЕ ФИЛЬТРЫ */}
        {visibleFilters.map((filter) => (
          <div key={filter.key} style={{ minWidth: filter.minWidth || '150px' }}>
            {filter.type === 'select' ? (
              <div style={{ position: 'relative' }}>
                <select
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 14px',
                    border: '1.5px solid #E2E7EF',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    background: activeFilters[filter.key] ? '#FBF4DC' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: activeFilters[filter.key] ? '#8A6A00' : '#667085',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0B1F3A';
                    e.target.style.boxShadow = '0 0 0 3px rgba(11, 31, 58, 0.06)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E7EF';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">{filter.placeholder || 'Все'}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#98A2B3',
                  pointerEvents: 'none'
                }}>▼</span>
              </div>
            ) : filter.type === 'checkbox' ? (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px 14px',
                background: activeFilters[filter.key] ? '#FBF4DC' : '#F8FAFC',
                borderRadius: '12px',
                border: activeFilters[filter.key] ? '1.5px solid #C9A227' : '1.5px solid #E2E7EF',
                fontSize: '14px',
                color: activeFilters[filter.key] ? '#8A6A00' : '#667085',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}>
                <input
                  type="checkbox"
                  checked={activeFilters[filter.key] || false}
                  onChange={(e) => handleFilterChange(filter.key, e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#C9A227'
                  }}
                />
                {filter.label}
              </label>
            ) : null}
          </div>
        ))}

        {/* КНОПКА "ЕЩЁ" */}
        {hiddenFilters.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '8px 16px',
              background: isExpanded ? '#FBF4DC' : '#F8FAFC',
              border: '1.5px solid #E2E7EF',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: isExpanded ? '#8A6A00' : '#667085',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isExpanded ? '▲ Скрыть' : `▼ Ещё ${hiddenFilters.length}`}
          </button>
        )}

        {/* КНОПКА СБРОСА */}
        {showReset && hasActiveFilters && (
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              background: '#FCEBEC',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#B3262E',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#FED7D7';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#FCEBEC';
            }}
          >
            ✕ Сбросить
          </button>
        )}

        {/* СЧЁТЧИК */}
        {children}
      </div>

      {/* РАСШИРЕННЫЕ ФИЛЬТРЫ */}
      {isExpanded && hiddenFilters.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          paddingTop: '12px',
          borderTop: '1px solid #F4F6F9'
        }}>
          {hiddenFilters.map((filter) => (
            <div key={filter.key} style={{ minWidth: filter.minWidth || '150px' }}>
              {filter.type === 'select' ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 14px',
                      border: '1.5px solid #E2E7EF',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      background: activeFilters[filter.key] ? '#FBF4DC' : '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      color: activeFilters[filter.key] ? '#8A6A00' : '#667085',
                      appearance: 'none',
                      WebkitAppearance: 'none'
                    }}
                  >
                    <option value="">{filter.placeholder || 'Все'}</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: '#98A2B3',
                    pointerEvents: 'none'
                  }}>▼</span>
                </div>
              ) : filter.type === 'checkbox' ? (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  background: activeFilters[filter.key] ? '#FBF4DC' : '#F8FAFC',
                  borderRadius: '12px',
                  border: activeFilters[filter.key] ? '1.5px solid #C9A227' : '1.5px solid #E2E7EF',
                  fontSize: '14px',
                  color: activeFilters[filter.key] ? '#8A6A00' : '#667085',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap'
                }}>
                  <input
                    type="checkbox"
                    checked={activeFilters[filter.key] || false}
                    onChange={(e) => handleFilterChange(filter.key, e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#C9A227'
                    }}
                  />
                  {filter.label}
                </label>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* АКТИВНЫЕ ФИЛЬТРЫ (ТЕГИ) */}
      {hasActiveFilters && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          paddingTop: '8px',
          borderTop: '1px solid #F4F6F9'
        }}>
          {search && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#EAF2FA',
              color: '#174A7E',
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid #D5E4F0'
            }}>
              🔍 {search}
              <button
                onClick={() => handleSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#174A7E',
                  fontSize: '12px',
                  padding: '0 2px'
                }}
              >
                ✕
              </button>
            </span>
          )}
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null;
            const filter = filters.find(f => f.key === key);
            const label = filter?.options?.find(o => o.value === value)?.label || value;
            return (
              <span key={key} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FBF4DC',
                color: '#8A6A00',
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #E8D9A8'
              }}>
                {filter?.label || key}: {label}
                <button
                  onClick={() => handleFilterChange(key, '')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8A6A00',
                    fontSize: '12px',
                    padding: '0 2px'
                  }}
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}