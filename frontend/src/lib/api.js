// frontend/src/lib/api.js

const API_URL = 'https://dod-backend.relaxdev.ru/api';

const getToken = () => {
  const token = localStorage.getItem('token');
  const sessionId = sessionStorage.getItem('sessionId');
  
  // Если есть токен, но нет сессии — выходим
  if (token && !sessionId) {
    console.log('🔒 Сессия истекла');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return null;
  }
  
  return token ? token.trim() : null;
};

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` })
});

// ============================================================
// 1. АУТЕНТИФИКАЦИЯ
// ============================================================
export const getMe = async () => {
  const token = getToken();
  console.log('🔑 Токен для запроса:', token ? `${token.slice(0, 20)}...` : 'null');
  
  let response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('📥 Статус /me:', response.status);
  
  if (!response.ok) {
    console.log('🔄 /me не работает, пробуем /api/me2...');
    response = await fetch(`${API_URL}/me2`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('📥 Статус /me2:', response.status);
  }
  
  const data = await response.json();
  console.log('📥 Ответ:', data);
  return data;
};

// ============================================================
// 2. ПРОФИЛЬ
// ============================================================
export const updateProfile = async (data) => {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 3. ПОЛЬЗОВАТЕЛИ
// ============================================================
export const getUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getProfiles = async () => {
  const response = await fetch(`${API_URL}/profiles`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getParticipants = async () => {
  const response = await fetch(`${API_URL}/participants`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createUser = async (data) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateUser = async (userId, data) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteUser = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

export const updateUserRole = async (userId, role) => {
  const response = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ role })
  });
  return response.json();
};

// ============================================================
// 4. КЛУБЫ
// ============================================================
export const getClubs = async () => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 5. ДОСТИЖЕНИЯ
// ============================================================
export const getAchievements = async () => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const addAchievement = async (data) => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteAchievement = async (id) => {
  const response = await fetch(`${API_URL}/achievements/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 6. СОБЫТИЯ
// ============================================================
export const getEvents = async () => {
  try {
    const response = await fetch(`${API_URL}/events`, {
      method: 'GET',
      headers: headers()
    });
    
    if (!response.ok) {
      console.error('❌ Ошибка получения событий:', response.status);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Ошибка getEvents:', error);
    return [];
  }
};

export const createEvent = async (data) => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateEvent = async (id, data) => {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteEvent = async (id) => {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 7. РЕГИСТРАЦИИ
// ============================================================
export const getRegistrations = async () => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const addRegistration = async (data) => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 8. ОБРАЩЕНИЯ
// ============================================================
export const getAppeals = async () => {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const addAppeal = async (data) => {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const replyToAppeal = async (appealId, data) => {
  const response = await fetch(`${API_URL}/appeals/${appealId}/reply`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const getAppealReplies = async (appealId) => {
  const response = await fetch(`${API_URL}/appeals/${appealId}/replies`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 9. ЗАПРОСЫ НА ТЬЮТОРОВ
// ============================================================
export const getTutorRequests = async () => {
  const response = await fetch(`${API_URL}/tutor-requests`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createTutorRequest = async (data) => {
  const response = await fetch(`${API_URL}/tutor-requests`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateTutorRequest = async (id, data) => {
  const response = await fetch(`${API_URL}/tutor-requests/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 10. РЕГИСТРАЦИЯ (ПУБЛИЧНАЯ)
// ============================================================
export const registerUser = async (data) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 11. ИМПОРТ
// ============================================================
export const importParticipants = async (data) => {
  const response = await fetch(`${API_URL}/import-participants`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 12. АВАТАР
// ============================================================
export const uploadAvatar = async (avatarBase64) => {
  const response = await fetch(`${API_URL}/upload-avatar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ avatar_base64: avatarBase64 })
  });
  return response.json();
};

export const getAvatar = async (userId) => {
  const response = await fetch(`${API_URL}/avatar/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 13. ИСТОРИЯ УЧАСТНИКА
// ============================================================
export const getParticipantEvents = async (userId) => {
  const response = await fetch(`${API_URL}/participant-events/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getParticipantStats = async (userId) => {
  const response = await fetch(`${API_URL}/participant-stats/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 14. ДЕТИ РОДИТЕЛЯ
// ============================================================
export const getParentChildren = async () => {
  const response = await fetch(`${API_URL}/parent-children`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const addParentChild = async (data) => {
  const response = await fetch(`${API_URL}/parent-children`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const removeParentChild = async (childId) => {
  const response = await fetch(`${API_URL}/parent-children/${childId}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 15. TIMELINE РЕБЁНКА
// ============================================================
export const getChildTimeline = async (childId, limit = 20) => {
  const response = await fetch(`${API_URL}/child-timeline/${childId}?limit=${limit}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 16. ОБЪЯВЛЕНИЯ
// ============================================================
export const getAnnouncements = async (clubId, limit = 20) => {
  const response = await fetch(`${API_URL}/announcements/${clubId}?limit=${limit}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createAnnouncement = async (data) => {
  const response = await fetch(`${API_URL}/announcements`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteAnnouncement = async (id) => {
  const response = await fetch(`${API_URL}/announcements/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 17. ШАБЛОНЫ ОТЧЁТОВ
// ============================================================
export const getReportTemplates = async () => {
  const response = await fetch(`${API_URL}/report-templates`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createReportTemplate = async (data) => {
  const response = await fetch(`${API_URL}/report-templates`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteReportTemplate = async (id) => {
  const response = await fetch(`${API_URL}/report-templates/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 18. ПРЕЗИДЕНТ КЛУБА
// ============================================================
export const setClubPresident = async (clubId, presidentId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/president`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ president_id: presidentId })
  });
  return response.json();
};

export const getClubPresident = async (clubId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/president`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 19. РЕЙТИНГ КЛУБА
// ============================================================
export const getClubRating = async (clubId, limit = 20) => {
  const response = await fetch(`${API_URL}/club-rating/${clubId}?limit=${limit}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 20. ЭКСПОРТ API ОБЪЕКТА
// ============================================================
const api = {
  getMe,
  updateProfile,
  getUsers,
  getProfiles,
  getParticipants,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  getClubs,
  getAchievements,
  addAchievement,
  deleteAchievement,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getRegistrations,
  addRegistration,
  getAppeals,
  addAppeal,
  replyToAppeal,
  getAppealReplies,
  getTutorRequests,
  createTutorRequest,
  updateTutorRequest,
  registerUser,
  importParticipants,
  uploadAvatar,
  getAvatar,
  getParticipantEvents,
  getParticipantStats,
  getParentChildren,
  addParentChild,
  removeParentChild,
  getChildTimeline,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getReportTemplates,
  createReportTemplate,
  deleteReportTemplate,
  setClubPresident,
  getClubPresident,
  getClubRating
};

export default api;