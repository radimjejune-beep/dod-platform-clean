// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    participants: 0,
    clubs: 0,
    events: 0,
    achievements: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await api.getMe();
        if (userData && userData.id) {
          setUser(userData);
          
          const [users, clubs, events, achievements] = await Promise.all([
            api.getUsers(),
            api.getClubs(),
            api.getEvents(),
            api.getAchievements()
          ]);
          
          setStats({
            participants: users.filter(u => u.role === 'participant').length,
            clubs: clubs.length,
            events: events.length,
            achievements: achievements.length
          });
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Ошибка:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  const role = user?.role;

  // Получение названия роли
  const getRoleLabel = () => {
    const labels = {
      'participant': '👤 Участник',
      'parent': '👨‍👩‍👦 Родитель',
      'club_coordinator': '🏫 Координатор КЮДа',
      'tutor': '📚 Тьютор',
      'movement_coordinator': '⭐ Координатор движения',
      'admin': '🔧 Администратор',
      'president': '👑 Президент',
      'vice_president': '⭐ Вице-президент'
    };
    return labels[role] || role;
  };

  // ============================================================
  // КНОПКИ В ЗАВИСИМОСТИ ОТ РОЛИ
  // ============================================================
  const getButtons = () => {
    const buttons = [];

    // Базовые кнопки для всех
    buttons.push(
      { path: '/profile', label: '👤 Профиль', color: 'btn-secondary' }
    );

    if (role === 'participant' || role === 'parent') {
      buttons.push(
        { path: '/events', label: '📅 Мероприятия', color: 'btn-primary' },
        { path: '/my-achievements', label: '🏆 Мои достижения', color: 'btn-primary' },
        { path: '/my-reviews', label: '📊 Мои оценки', color: 'btn-primary' },
        { path: '/calendar', label: '📅 Календарь', color: 'btn-secondary' }
      );
      if (role === 'participant') {
        buttons.push(
          { path: '/president-tasks', label: '👑 Задания президента', color: 'btn-primary' }
        );
      }
    }

    if (role === 'club_coordinator') {
      buttons.push(
        { path: '/clubs', label: '🏫 Мой КЮД', color: 'btn-primary' },
        { path: '/events', label: '📅 Мероприятия', color: 'btn-primary' },
        { path: '/participants', label: '👥 Участники', color: 'btn-primary' },
        { path: '/manage-achievements', label: '🏆 Достижения клуба', color: 'btn-primary' },
        { path: '/reports', label: '📋 Отчёты', color: 'btn-primary' },
        { path: '/appeals', label: '📨 Обращения', color: 'btn-primary' },
        { path: '/staff', label: '👥 Сотрудники', color: 'btn-secondary' },
        { path: '/calendar', label: '📅 Календарь', color: 'btn-secondary' }
      );
    }

    if (role === 'tutor') {
      buttons.push(
        { path: '/clubs', label: '🏫 КЮДы', color: 'btn-primary' },
        { path: '/events', label: '📅 Мероприятия', color: 'btn-primary' },
        { path: '/participants', label: '👥 Участники', color: 'btn-primary' },
        { path: '/achievements', label: '🏆 Достижения', color: 'btn-primary' },
        { path: '/my-reviews', label: '📊 Оценки', color: 'btn-primary' },
        { path: '/staff-calendar', label: '📅 Мой календарь', color: 'btn-secondary' },
        { path: '/my-journal', label: '📓 Мой журнал', color: 'btn-primary' }
      );
    }

    if (role === 'movement_coordinator' || role === 'admin') {
      buttons.push(
        { path: '/clubs', label: '🏫 КЮДы', color: 'btn-primary' },
        { path: '/events', label: '📅 Мероприятия', color: 'btn-primary' },
        { path: '/participants', label: '👥 Участники', color: 'btn-primary' },
        { path: '/achievements', label: '🏆 Достижения', color: 'btn-primary' },
        { path: '/reports', label: '📋 Отчёты', color: 'btn-primary' },
        { path: '/analytics', label: '📊 Аналитика', color: 'btn-primary' },
        { path: '/appeals', label: '📨 Обращения', color: 'btn-primary' },
        { path: '/admin/users', label: '👥 Пользователи', color: 'btn-primary' }
      );
      if (role === 'admin') {
        buttons.push(
          { path: '/settings', label: '⚙️ Настройки', color: 'btn-primary' },
          { path: '/admin/invite', label: '🎫 Пригласить', color: 'btn-primary' },
          { path: '/import-participants', label: '📥 Импорт', color: 'btn-primary' }
        );
      }
    }

    if (role === 'president' || role === 'vice_president') {
      buttons.push(
        { path: '/clubs', label: '🏫 КЮДы', color: 'btn-primary' },
        { path: '/events', label: '📅 Мероприятия', color: 'btn-primary' },
        { path: '/participants', label: '👥 Участники', color: 'btn-primary' },
        { path: '/achievements', label: '🏆 Достижения', color: 'btn-primary' },
        { path: '/reports', label: '📋 Отчёты', color: 'btn-primary' },
        { path: '/analytics', label: '📊 Аналитика', color: 'btn-primary' },
        { path: '/appeals', label: '📨 Обращения', color: 'btn-primary' }
      );
    }

    return buttons;
  };

  const buttons = getButtons();

  return (
    <div className="page-background">
      <Navigation profile={user} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📊</span>
          <div>
            <h1>👋 Привет, {user?.full_name || 'Гость'}!</h1>
            <p>
              {getRoleLabel()} • Добро пожаловать в систему управления ДОД «Дипломаты будущего»
            </p>
          </div>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-4">
          <div className="stat-card">
            <div className="number">{stats.participants}</div>
            <div className="label">👥 Участников</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.clubs}</div>
            <div className="label">🏫 Клубов</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.events}</div>
            <div className="label">📅 Мероприятий</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.achievements}</div>
            <div className="label">🏆 Достижений</div>
          </div>
        </div>

        {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
        {buttons.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0B1F3A', marginBottom: '16px' }}>
              🚀 Быстрые действия
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {buttons.map((btn, index) => (
                <Link
                  key={index}
                  to={btn.path}
                  className={btn.color}
                  style={{ textDecoration: 'none' }}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#667085' }}>Email</div>
              <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#667085' }}>Роль</div>
              <div style={{ fontWeight: '500', color: '#0B1F3A' }}>{getRoleLabel()}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#667085' }}>Статус</div>
              <div className="status-active">🟢 Активен</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}