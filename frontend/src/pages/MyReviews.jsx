// frontend/src/pages/MyReviews.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';
import Icon from '../components/Icon';

export default function MyReviews() {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [childInfo, setChildInfo] = useState(null);
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

      const [clubsData, participantsData, usersData] = await Promise.all([
        api.getClubs(),
        api.getParticipants(),
        api.getUsers()
      ]);

      setClubs(clubsData || []);

      const role = userData.role;
      let filteredParticipants = [];

      if (role === 'participant') {
        filteredParticipants = participantsData.filter(p => p.id === userData.id);
      } 
      else if (role === 'parent') {
        filteredParticipants = participantsData;
        setChildInfo({ name: 'Ваш ребёнок' });
      } 
      else if (role === 'club_coordinator') {
        const coordinatorClub = clubsData.find(c => 
          c.coordinator_id === userData.id || 
          c.leader_id === userData.id
        );
        if (coordinatorClub) {
          filteredParticipants = participantsData.filter(p => p.club_id === coordinatorClub.id);
        } else {
          filteredParticipants = [];
        }
      } 
      else if (role === 'tutor' || 
               role === 'movement_coordinator' || 
               role === 'admin' || 
               role === 'president' || 
               role === 'vice_president') {
        filteredParticipants = participantsData;
      } 
      else {
        filteredParticipants = [];
      }

      const mockReviews = [];
      
      filteredParticipants.forEach((p, index) => {
        if (index < 15) {
          mockReviews.push({
            id: `review-${index}`,
            participant_id: p.id,
            participant_name: p.full_name,
            participant_school: p.school || '',
            participant_class: p.class_name || '',
            club_id: p.club_id,
            club_name: clubsData.find(c => c.id === p.club_id)?.name || 'Без клуба',
            event_title: `Мероприятие ${Math.floor(Math.random() * 20) + 1}`,
            event_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            engagement: ['active', 'moderate', 'passive'][Math.floor(Math.random() * 3)],
            teamwork: ['excellent', 'good', 'developing'][Math.floor(Math.random() * 3)],
            initiative: ['high', 'average', 'low'][Math.floor(Math.random() * 3)],
            communication: ['confident', 'developing', 'needs_support'][Math.floor(Math.random() * 3)],
            responsibility: ['reliable', 'average', 'needs_attention'][Math.floor(Math.random() * 3)],
            status: ['draft', 'submitted', 'approved'][Math.floor(Math.random() * 3)],
            comment: 'Хорошее участие в мероприятии',
            is_final: Math.random() > 0.5,
            reviewer_name: 'Тьютор Иванова М.А.'
          });
        }
      });

      setAllReviews(mockReviews);
      setReviews(mockReviews);

    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const canFilterByClub = profile?.role === 'admin' || 
                          profile?.role === 'movement_coordinator' || 
                          profile?.role === 'tutor' ||
                          profile?.role === 'president' ||
                          profile?.role === 'vice_president';

  useEffect(() => {
    if (selectedClubId && canFilterByClub) {
      setReviews(allReviews.filter(r => r.club_id === selectedClubId));
    } else {
      setReviews(allReviews);
    }
  }, [selectedClubId, allReviews, canFilterByClub]);

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { text: 'Черновик', color: '#8A9AAA', bg: 'var(--color-gray-100)' },
      'submitted': { text: 'На проверке', color: 'var(--color-gold)', bg: 'var(--color-gold-pale)' },
      'approved': { text: 'Утверждено', color: 'var(--color-success)', bg: 'var(--color-success-bg)' }
    };
    return badges[status] || badges['draft'];
  };

  const getEngagementLabel = (value) => {
    const labels = {
      'active': 'Активно',
      'moderate': 'Умеренно',
      'passive': 'Пассивно'
    };
    return labels[value] || value;
  };

  const getTeamworkLabel = (value) => {
    const labels = {
      'excellent': 'Отлично',
      'good': 'Хорошо',
      'developing': 'Развивается'
    };
    return labels[value] || value;
  };

  const getInitiativeLabel = (value) => {
    const labels = {
      'high': 'Высокая',
      'average': 'Средняя',
      'low': 'Низкая'
    };
    return labels[value] || value;
  };

  const getRoleSpecificTitle = () => {
    const role = profile?.role;
    const titles = {
      'participant': 'Мои оценки',
      'parent': 'Оценки моего ребёнка',
      'club_coordinator': 'Оценки участников клуба',
      'tutor': 'Оценки участников',
      'movement_coordinator': 'Оценки участников движения',
      'admin': 'Оценки участников движения',
      'president': 'Оценки участников движения',
      'vice_president': 'Оценки участников движения'
    };
    return titles[role] || 'Оценки';
  };

  const getRoleSpecificSubtitle = () => {
    const role = profile?.role;
    const subtitles = {
      'participant': 'Ваши оценки за участие в мероприятиях',
      'parent': childInfo ? `Оценки вашего ребёнка` : 'Оценки вашего ребёнка',
      'club_coordinator': `Участники вашего КЮДа`,
      'tutor': 'Оценки всех участников',
      'movement_coordinator': 'Все оценки участников движения',
      'admin': 'Все оценки участников движения',
      'president': 'Все оценки участников движения',
      'vice_president': 'Все оценки участников движения'
    };
    return subtitles[role] || 'Оценки';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-gray-100)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">

        <div className="page-header">
          <div>
            <h1 className="page-title">Мои оценки</h1>
            <p className="page-subtitle">Оценки за участие в мероприятиях</p>
          </div>
        </div>

        {/* УБРАН ДУБЛИРУЮЩИЙСЯ PAGE-HEADER */}

        {canFilterByClub && clubs.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ minWidth: '200px' }}>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid var(--color-gray-200)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white',
                  transition: 'all 0.2s'
                }}
              >
                <option value="">Все КЮДы</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-gray-500)' }}>
              {selectedClubId ? (
                <span><Icon name="filter" size={14} /> Отфильтровано по клубу: <strong>{clubs.find(c => c.id === selectedClubId)?.name}</strong></span>
              ) : (
                <span>Все оценки</span>
              )}
            </div>
            {selectedClubId && (
              <button
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-error-bg)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--color-error)'
                }}
                onClick={() => setSelectedClubId('')}
              >
                Сбросить
              </button>
            )}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><Icon name="edit" /></div>
            <p style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
              {profile?.role === 'participant' && 'У вас пока нет оценок'}
              {profile?.role === 'parent' && 'У вашего ребёнка пока нет оценок'}
              {profile?.role === 'club_coordinator' && 'У участников вашего клуба пока нет оценок'}
              {(profile?.role === 'tutor' || 
                profile?.role === 'movement_coordinator' || 
                profile?.role === 'admin' || 
                profile?.role === 'president' || 
                profile?.role === 'vice_president') && 'Оценок пока нет'}
            </p>
            <p style={{ color: 'var(--color-gray-500)' }}>Оценки появляются после мероприятий с участием тьюторов</p>
          </div>
        ) : (
          <>
            {viewMode === 'table' && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Участник</th>
                      <th>Клуб</th>
                      <th>Мероприятие</th>
                      <th style={{ textAlign: 'center' }}>Активность</th>
                      <th style={{ textAlign: 'center' }}>Команда</th>
                      <th style={{ textAlign: 'center' }}>Инициатива</th>
                      <th style={{ textAlign: 'center' }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => {
                      const status = getStatusBadge(review.status);
                      return (
                        <tr key={review.id}>
                          <td>
                            <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>
                              {review.participant_name || 'Неизвестно'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
                              {review.participant_school} {review.participant_class}
                            </div>
                          </td>
                          <td>
                            <span className="tag tag-blue">{review.club_name || '—'}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: '500', color: 'var(--color-primary)' }}>
                              {review.event_title || 'Мероприятие'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
                              <Icon name="calendar" size={14} /> {review.event_date ? new Date(review.event_date).toLocaleDateString('ru-RU') : ''}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {review.engagement ? (
                              <span className="tag" style={{
                                background: review.engagement === 'active' ? 'var(--color-success-bg)' :
                                           review.engagement === 'moderate' ? 'var(--color-gold-pale)' : 'var(--color-error-bg)',
                                color: review.engagement === 'active' ? 'var(--color-success)' :
                                       review.engagement === 'moderate' ? 'var(--color-gold-dark)' : 'var(--color-error)'
                              }}>
                                {getEngagementLabel(review.engagement)}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {review.teamwork ? (
                              <span className="tag" style={{
                                background: review.teamwork === 'excellent' ? 'var(--color-success-bg)' :
                                           review.teamwork === 'good' ? 'var(--color-gold-pale)' : 'var(--color-error-bg)',
                                color: review.teamwork === 'excellent' ? 'var(--color-success)' :
                                       review.teamwork === 'good' ? 'var(--color-gold-dark)' : 'var(--color-error)'
                              }}>
                                {getTeamworkLabel(review.teamwork)}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {review.initiative ? (
                              <span className="tag" style={{
                                background: review.initiative === 'high' ? 'var(--color-success-bg)' :
                                           review.initiative === 'average' ? 'var(--color-gold-pale)' : 'var(--color-error-bg)',
                                color: review.initiative === 'high' ? 'var(--color-success)' :
                                       review.initiative === 'average' ? 'var(--color-gold-dark)' : 'var(--color-error)'
                              }}>
                                {getInitiativeLabel(review.initiative)}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="tag" style={{
                              background: status.bg,
                              color: status.color
                            }}>
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {reviews.map((review) => {
                  const status = getStatusBadge(review.status);
                  return (
                    <div
                      key={review.id}
                      className="card"
                      style={{
                        borderLeft: `4px solid ${review.is_final ? 'var(--color-gold)' : 'var(--color-primary-light)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                            {review.participant_name || 'Неизвестно'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
                            {review.club_name || 'Без клуба'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
                            <Icon name="calendar" size={14} /> {review.event_date ? new Date(review.event_date).toLocaleDateString('ru-RU') : ''}
                          </div>
                        </div>
                        <span className="tag" style={{ background: status.bg, color: status.color }}>
                          {status.text}
                        </span>
                      </div>

                      <div className="grid-3" style={{ fontSize: '12px', marginTop: '8px' }}>
                        {review.engagement && (
                          <div style={{ padding: '4px 8px', background: 'var(--color-gray-50)', borderRadius: '4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: 'var(--color-gray-400)' }}>Активность</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                              {getEngagementLabel(review.engagement)}
                            </div>
                          </div>
                        )}
                        {review.teamwork && (
                          <div style={{ padding: '4px 8px', background: 'var(--color-gray-50)', borderRadius: '4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: 'var(--color-gray-400)' }}>Команда</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                              {getTeamworkLabel(review.teamwork)}
                            </div>
                          </div>
                        )}
                        {review.initiative && (
                          <div style={{ padding: '4px 8px', background: 'var(--color-gray-50)', borderRadius: '4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: 'var(--color-gray-400)' }}>Инициатива</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                              {getInitiativeLabel(review.initiative)}
                            </div>
                          </div>
                        )}
                      </div>

                      {review.comment && (
                        <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-gray-100)' }}>
                          {review.comment}
                        </div>
                      )}
                      {review.reviewer_name && (
                        <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                          {review.reviewer_name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}