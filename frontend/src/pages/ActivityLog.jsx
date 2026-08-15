// frontend/src/pages/ActivityLog.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function ActivityLog() {
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity_type: '',
    limit: 100,
    offset: 0
  });
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      if (userData.role !== 'movement_coordinator' && userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      const params = {};
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.limit) params.limit = filters.limit;
      if (filters.offset) params.offset = filters.offset;

      const data = await api.getActivityLog(params);
      setLogs(data || []);
      setTotalCount(data?.length || 0);

    } catch (err) {
      console.error('Ошибка загрузки журнала:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREATE': '➕ Создание',
      'UPDATE': '✏️ Обновление',
      'DELETE': '🗑️ Удаление',
      'LOGIN': '🔐 Вход',
      'LOGOUT': '🚪 Выход'
    };
    return labels[action] || action;
  };

  const getEntityLabel = (entity) => {
    const labels = {
      'user': '👤 Пользователь',
      'document': '📄 Документ',
      'task': '📋 Задача',
      'event': '📅 Мероприятие',
      'goal': '🎯 Цель',
      'club': '🏫 Клуб',
      'mass_notification': '📨 Уведомление',
      'appeal': '📩 Обращение'
    };
    return labels[entity] || entity;
  };

  const getActionColor = (action) => {
    const colors = {
      'CREATE': '#16845B',
      'UPDATE': '#174A7E',
      'DELETE': '#B3262E',
      'LOGIN': '#C9A227',
      'LOGOUT': '#667085'
    };
    return colors[action] || '#667085';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  const entityTypes = [
    { value: '', label: 'Все типы' },
    { value: 'user', label: '👤 Пользователи' },
    { value: 'document', label: '📄 Документы' },
    { value: 'task', label: '📋 Задачи' },
    { value: 'event', label: '📅 Мероприятия' },
    { value: 'goal', label: '🎯 Цели' },
    { value: 'club', label: '🏫 Клубы' },
    { value: 'mass_notification', label: '📨 Уведомления' },
    { value: 'appeal', label: '📩 Обращения' }
  ];

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📋</span>
          <div>
            <h1>Журнал действий</h1>
            <p>История всех действий в системе</p>
          </div>
          <button
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => loadData()}
          >
            🔄 Обновить
          </button>
        </div>

        {/* ФИЛЬТРЫ */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ minWidth: '200px' }}>
              <select
                value={filters.entity_type}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value, offset: 0 })}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                {entityTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: '120px' }}>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: '1.5px solid #D5DCE7',
                  borderRadius: '10px',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value={50}>50 записей</option>
                <option value={100}>100 записей</option>
                <option value={200}>200 записей</option>
                <option value={500}>500 записей</option>
              </select>
            </div>
            <span style={{ fontSize: '13px', color: '#667085' }}>
              Найдено: <strong>{totalCount}</strong> записей
            </span>
          </div>
        </div>

        {/* ТАБЛИЦА ЛОГОВ */}
        <div className="card">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>Записей в журнале пока нет</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Пользователь</th>
                    <th>Действие</th>
                    <th>Сущность</th>
                    <th>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: '#667085', whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <div style={{ fontWeight: '500', color: '#0B1F3A' }}>
                          {log.user_name || 'Система'}
                        </div>
                        {log.user_role && (
                          <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                            {log.user_role}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          background: `${getActionColor(log.action)}15`,
                          color: getActionColor(log.action),
                          fontWeight: '500'
                        }}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#667085' }}>
                        {getEntityLabel(log.entity_type)}
                        {log.entity_id && (
                          <span style={{ fontSize: '11px', color: '#98A2B3', display: 'block' }}>
                            ID: {log.entity_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#667085', maxWidth: '200px' }}>
                        {log.details && (
                          <div>
                            {log.details.title && (
                              <div><strong>Название:</strong> {log.details.title}</div>
                            )}
                            {log.details.status && (
                              <div><strong>Статус:</strong> {log.details.status}</div>
                            )}
                            {log.details.recipients && (
                              <div><strong>Получатели:</strong> {log.details.recipients}</div>
                            )}
                            {log.details.target && (
                              <div><strong>Цель:</strong> {log.details.target}</div>
                            )}
                            {log.details.progress && (
                              <div><strong>Прогресс:</strong> {log.details.progress}</div>
                            )}
                            {!log.details.title && !log.details.status && !log.details.recipients && (
                              <span style={{ color: '#98A2B3' }}>Нет деталей</span>
                            )}
                          </div>
                        )}
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