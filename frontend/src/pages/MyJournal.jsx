// frontend/src/pages/MyJournal.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function MyJournal() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getMe();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }

      // ============================================================
      // ТОЛЬКО ТЬЮТОР
      // ============================================================
      if (userData.role !== 'tutor') {
        navigate('/dashboard');
        return;
      }

      setProfile(userData);

      // TODO: добавить API для получения назначений тьютора
      setAssignments([]);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="page-header">
          <span style={{ fontSize: '32px' }}>📓</span>
          <div>
            <h1>Мой журнал</h1>
            <p>Ваши мероприятия для оценки участников</p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>У вас пока нет мероприятий для оценки</p>
            <p style={{ color: '#667085' }}>Когда вас назначат на мероприятие, оно появится здесь</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assignments.map((a) => (
              <div
                key={a.id}
                className="list-item"
                style={{ borderLeftColor: a.is_lead_tutor ? '#C9A227' : '#174A7E' }}
                onClick={() => navigate(`/tutor-journal/${a.event_id}`)}
              >
                <div className="title">
                  {a.event_title || 'Мероприятие'}
                  {a.is_lead_tutor && (
                    <span className="tag tag-gold" style={{ marginLeft: '8px', fontSize: '10px' }}>
                      ⭐ Старший тьютор
                    </span>
                  )}
                </div>
                <div className="subtitle">
                  📅 {a.event_date ? new Date(a.event_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                  {a.location && ` • 📍 ${a.location}`}
                </div>
                <div className="meta">
                  🎯 Роль: <span className="tag tag-blue">{a.role || 'Тьютор'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}