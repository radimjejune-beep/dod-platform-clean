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
  children 
}) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '20px',
      padding: '16px',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E2E7EF',
      boxShadow: '0 2px 8px rgba(11, 31, 58, 0.04)'
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        width: '100%'
      }}>
        {showSearch && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: '#FAFBFC'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0B1F3A';
                e.target.style.background = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D5DCE7';
                e.target.style.background = '#FAFBFC';
              }}
            />
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.key} style={{ minWidth: filter.minWidth || '150px' }}>
            {filter.type === 'select' ? (
              <select
                value={activeFilters[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#FAFBFC',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0B1F3A';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D5DCE7';
                  e.target.style.background = '#FAFBFC';
                }}
              >
                <option value="">{filter.placeholder || 'Все'}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'checkbox' ? (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px 12px',
                background: '#FAFBFC',
                borderRadius: '8px',
                border: '1.5px solid #D5DCE7',
                fontSize: '14px',
                color: '#0B1F3A',
                whiteSpace: 'nowrap'
              }}>
                <input
                  type="checkbox"
                  checked={activeFilters[filter.key] || false}
                  onChange={(e) => handleFilterChange(filter.key, e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                {filter.label}
              </label>
            ) : null}
          </div>
        ))}

        {showReset && hasActiveFilters && (
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              background: '#FCEBEC',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#B3262E',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#FED7D7';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#FCEBEC';
            }}
          >
            ✕ Сбросить фильтры
          </button>
        )}

        {children}
      </div>

      {hasActiveFilters && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          paddingTop: '8px',
          borderTop: '1px solid #F4F6F9'
        }}>
          {search && (
            <span className="tag" style={{
              background: '#EAF2FA',
              color: '#174A7E',
              fontSize: '12px',
              padding: '4px 12px'
            }}>
              🔍 {search}
            </span>
          )}
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null;
            const filter = filters.find(f => f.key === key);
            const label = filter?.options?.find(o => o.value === value)?.label || value;
            return (
              <span key={key} className="tag" style={{
                background: '#FBF4DC',
                color: '#8A6A00',
                fontSize: '12px',
                padding: '4px 12px'
              }}>
                {filter?.label || key}: {label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}