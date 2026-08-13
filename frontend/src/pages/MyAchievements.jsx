// frontend/src/pages/MyAchievements.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function MyAchievements() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
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
      setProfile(userData);

      const achievementsData = await api.getAchievements();
      setAchievements(achievementsData || []);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const total = achievements.length;
    const totalPoints = achievements.reduce((sum, item) => {
      return sum + (item.points || 0);
    }, 0);
    
    const categories = {};
    achievements.forEach(item => {
      const cat = item.category || 'Другое';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return { total, totalPoints, categories };
  };

  const stats = getStats();

  const getCategoryIcon = (category) => {
    const icons = {
      'Участие': '🎯',
      'Организация': '🤝',
      'Особое': '⭐',
      'Спорт': '⚽',
      'Творчество': '🎨',
      'Наука': '🔬',
      'Волонтерство': '❤️'
    };
    return icons[category] || '🏅';
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
          <span style={{ fontSize: '32px' }}>🏆</span>
          <div>
            <h1>Мои достижения</h1>
            <p>Все ваши награды и достижения в ДОД «Дипломаты будущего»</p>
          </div>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid-4" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="number">{stats.total}</div>
            <div className="label">Всего достижений</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.totalPoints}</div>
            <div className="label">Всего баллов</div>
          </div>
          {Object.keys(stats.categories).length > 0 && (
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '8px' }}>
                По категориям:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {Object.entries(stats.categories).map(([category, count]) => (
                  <span key={category} className="tag tag-blue">
                    {getCategoryIcon(category)} {category}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* СПИСОК ДОСТИЖЕНИЙ */}
        {achievements.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🌟</div>
            <p style={{ fontSize: '18px', color: '#0B1F3A' }}>У вас пока нет достижений</p>
            <p style={{ color: '#667085' }}>Участвуйте в мероприятиях и получайте награды! 🏆</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {achievements.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${item.color || '#C9A227'}`,
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{
                    fontSize: '40px',
                    width: '56px',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F4F6F9',
                    borderRadius: '12px',
                    flexShrink: 0
                  }}>
                    {item.icon || '🏅'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0B1F3A' }}>
                        {item.title || 'Достижение'}
                      </h3>
                      <span className="tag tag-gold">
                        +{item.points || 0} баллов
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ margin: '4px 0 8px 0', fontSize: '14px', color: '#667085' }}>
                        {item.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#98A2B3', flexWrap: 'wrap' }}>
                      <span>📅 {new Date(item.achievement_date || item.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                      {item.category && (
                        <span className="tag tag-blue">
                          {getCategoryIcon(item.category)} {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}