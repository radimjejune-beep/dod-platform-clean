// frontend/src/components/FilterBar.jsx

import { useState, useEffect } from 'react';

export default function FilterBar({ 
  filters = [], 
  onFilterChange, 
  onSearchChange,
  onReset,
  searchPlaceholder = '🔍 Поиск...',
  showSearch = true,
  showReset = true,
  children,
  classFilter = false,
  classes = [],
  onClassFilterChange,
  selectedClasses = []
}) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showClassStats, setShowClassStats] = useState(false);
  const [classStats, setClassStats] = useState([]);

  // Подсчёт статистики по классам
  useEffect(() => {
    if (classFilter && classes.length > 0) {
      const stats = classes.map(cls => ({
        name: cls,
        count: 0
      }));
      setClassStats(stats);
    }
  }, [classes, classFilter]);

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
    if (onClassFilterChange) onClassFilterChange([]);
  };

  const handleClassToggle = (className) => {
    const newSelected = selectedClasses.includes(className)
      ? selectedClasses.filter(c => c !== className)
      : [...selectedClasses, className];
    if (onClassFilterChange) onClassFilterChange(newSelected);
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || search.length > 0 || selectedClasses.length > 0;

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

        {/* ФИЛЬТР ПО КЛАССАМ */}
        {classFilter && classes.length > 0 && (
          <div style={{ position: 'relative', minWidth: '150px' }}>
            <button
              onClick={() => setShowClassStats(!showClassStats)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #D5DCE7',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                background: selectedClasses.length > 0 ? '#FBF4DC' : '#FAFBFC',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                color: selectedClasses.length > 0 ? '#8A6A00' : '#667085'
              }}
            >
              <span>📚 Классы {selectedClasses.length > 0 && `(${selectedClasses.length})`}</span>
              <span>▼</span>
            </button>
            {showClassStats && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #E2E7EF',
                borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(11, 31, 58, 0.12)',
                maxHeight: '250px',
                overflowY: 'auto',
                zIndex: 100,
                padding: '8px'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: '6px'
                }}>
                  {classes.map((cls) => (
                    <label
                      key={cls}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: selectedClasses.includes(cls) ? '#FBF4DC' : 'transparent',
                        transition: 'all 0.2s ease',
                        fontSize: '13px',
                        color: selectedClasses.includes(cls) ? '#8A6A00' : '#667085'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedClasses.includes(cls)) {
                          e.currentTarget.style.background = '#F4F6F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedClasses.includes(cls)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls)}
                        onChange={() => handleClassToggle(cls)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>{cls}</span>
                    </label>
                  ))}
                </div>
                {selectedClasses.length > 0 && (
                  <button
                    onClick={() => {
                      if (onClassFilterChange) onClassFilterChange([]);
                      setShowClassStats(false);
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: '#FCEBEC',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#B3262E',
                      width: '100%'
                    }}
                  >
                    ✕ Очистить все
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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

      {/* АКТИВНЫЕ ФИЛЬТРЫ */}
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
          {selectedClasses.map((cls) => (
            <span key={cls} className="tag" style={{
              background: '#FBF4DC',
              color: '#8A6A00',
              fontSize: '12px',
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              📚 {cls}
              <button
                onClick={() => handleClassToggle(cls)}
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
          ))}
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