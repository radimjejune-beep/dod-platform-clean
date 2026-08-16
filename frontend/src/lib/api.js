// frontend/src/lib/api.js

const API_URL = 'https://dod-backend.relaxdev.ru/api';

const getToken = () => {
  const token = localStorage.getItem('token');
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
  
  if (!token) {
    throw new Error('Нет токена');
  }
  
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(`Ошибка ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data && data.id) {
    try {
      const userData = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        club_id: data.club_id,
        club_name: data.club_name,
        phone: data.phone || '',
        school: data.school || '',
        class_name: data.class_name || '',
        status: data.status || 'active',
        avatar_url: data.avatar_url || null,
        must_change_password: data.must_change_password || false
      };
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (storageError) {
      console.warn('⚠️ Не удалось сохранить пользователя в localStorage');
    }
  }
  
  return data;
};

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка входа');
  }
  
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  return data;
};

export const changePassword = async (data) => {
  const response = await fetch(`${API_URL}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
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

export const resetUserPassword = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

export const assignUserToClub = async (userId, clubId) => {
  const response = await fetch(`${API_URL}/users/${userId}/assign-club`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ club_id: clubId })
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
// 9. ОТЧЁТЫ
// ============================================================
export const getReports = async () => {
  const response = await fetch(`${API_URL}/reports`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createReport = async (data) => {
  const response = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateReport = async (id, data) => {
  const response = await fetch(`${API_URL}/reports/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteReport = async (id) => {
  const response = await fetch(`${API_URL}/reports/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

export const submitReport = async (id) => {
  const response = await fetch(`${API_URL}/reports/${id}/submit`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

export const approveReport = async (id) => {
  const response = await fetch(`${API_URL}/reports/${id}/approve`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

export const rejectReport = async (id, comment) => {
  const response = await fetch(`${API_URL}/reports/${id}/reject`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ comment })
  });
  return response.json();
};

// ============================================================
// 10. ДОКУМЕНТЫ
// ============================================================
export const getDocuments = async () => {
  const response = await fetch(`${API_URL}/documents`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createDocument = async (data) => {
  const response = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteDocument = async (id) => {
  const response = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 11. НОВОСТИ
// ============================================================
export const getNews = async () => {
  const response = await fetch(`${API_URL}/news`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createNews = async (data) => {
  const response = await fetch(`${API_URL}/news`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateNews = async (id, data) => {
  const response = await fetch(`${API_URL}/news/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteNews = async (id) => {
  const response = await fetch(`${API_URL}/news/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 12. УВЕДОМЛЕНИЯ
// ============================================================
export const getNotifications = async () => {
  const response = await fetch(`${API_URL}/notifications`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const markNotificationRead = async (id) => {
  const response = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

export const markAllNotificationsRead = async () => {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 13. АВАТАР
// ============================================================
export const uploadAvatar = async (avatarBase64) => {
  const response = await fetch(`${API_URL}/upload-avatar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ avatar_base64: avatarBase64 })
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

export const parentLinkChild = async (data) => {
  const response = await fetch(`${API_URL}/parent-link-child`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 15. ПРЕЗИДЕНТ
// ============================================================
export const getPresidentTasks = async () => {
  const response = await fetch(`${API_URL}/president-tasks`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createPresidentTask = async (data) => {
  const response = await fetch(`${API_URL}/president-tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const respondToPresidentTask = async (id, response) => {
  const result = await fetch(`${API_URL}/president-tasks/${id}/respond`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ response })
  });
  return result.json();
};

// ============================================================
// 16. СТАТИСТИКА
// ============================================================
export const getParticipantStats = async (userId) => {
  const response = await fetch(`${API_URL}/participant-stats/${userId}`, {
    method: 'GET',
    headers: headers()
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

export const setClubPresident = async (clubId, presidentId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/president`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ president_id: presidentId })
  });
  return response.json();
};

// ============================================================
// 17. ЗАПРОСЫ НА ТЬЮТОРОВ
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
// 18. НАЗНАЧЕНИЯ ТЬЮТОРОВ
// ============================================================
export const getTutorAssignments = async () => {
  const response = await fetch(`${API_URL}/event-tutor-assignments`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const respondToAssignment = async (assignmentId, status) => {
  const response = await fetch(`${API_URL}/event-tutor-assignments/${assignmentId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  return response.json();
};

// ============================================================
// 19. ТЬЮТОР ИНВАЙТЫ
// ============================================================
export const getTutorInvitations = async () => {
  const response = await fetch(`${API_URL}/tutor-invitations`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createTutorInvitation = async (data) => {
  const response = await fetch(`${API_URL}/tutor-invitations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const respondToTutorInvitation = async (invitationId, status) => {
  const response = await fetch(`${API_URL}/tutor-invitations/${invitationId}/respond`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  return response.json();
};

export const cancelTutorInvitation = async (invitationId) => {
  const response = await fetch(`${API_URL}/tutor-invitations/${invitationId}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 20. МАССОВЫЕ УВЕДОМЛЕНИЯ
// ============================================================
export const getMassNotifications = async () => {
  const response = await fetch(`${API_URL}/mass-notifications`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createMassNotification = async (data) => {
  const response = await fetch(`${API_URL}/mass-notifications`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteMassNotification = async (id) => {
  const response = await fetch(`${API_URL}/mass-notifications/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 21. ЦЕЛИ И KPI
// ============================================================
export const getGoals = async () => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createGoal = async (data) => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateGoal = async (id, data) => {
  const response = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteGoal = async (id) => {
  const response = await fetch(`${API_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 22. ЖУРНАЛ ДЕЙСТВИЙ
// ============================================================
export const getActivityLog = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/activity-log?${query}` : `${API_URL}/activity-log`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 23. КАТЕГОРИИ ДОСТИЖЕНИЙ
// ============================================================
export const getAchievementCategories = async () => {
  const response = await fetch(`${API_URL}/achievement-categories`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 24. СОГЛАСИЯ
// ============================================================
export const getConsentsStats = async (clubId = null) => {
  const url = clubId ? `${API_URL}/consents-stats?club_id=${clubId}` : `${API_URL}/consents-stats`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getConsentsMissing = async (clubId = null) => {
  const url = clubId ? `${API_URL}/consents-missing?club_id=${clubId}` : `${API_URL}/consents-missing`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 25. ИСТОРИЯ УЧАСТНИКА
// ============================================================
export const getParticipantEvents = async (userId) => {
  const response = await fetch(`${API_URL}/participant-events/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 26. ЗАДАЧИ
// ============================================================
export const getTasks = async () => {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createTask = async (data) => {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateTask = async (id, data) => {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteTask = async (id) => {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// ЭКСПОРТ API ОБЪЕКТА
// ============================================================
const api = {
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
  getUsers,
  getParticipants,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  assignUserToClub,
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
  getReports,
  createReport,
  updateReport,
  deleteReport,
  submitReport,
  approveReport,
  rejectReport,
  getDocuments,
  createDocument,
  deleteDocument,
  getNews,
  createNews,
  updateNews,
  deleteNews,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  uploadAvatar,
  getParentChildren,
  parentLinkChild,
  getPresidentTasks,
  createPresidentTask,
  respondToPresidentTask,
  getParticipantStats,
  getClubPresident,
  setClubPresident,
  getTutorRequests,
  createTutorRequest,
  updateTutorRequest,
  getTutorAssignments,
  respondToAssignment,
  getTutorInvitations,
  createTutorInvitation,
  respondToTutorInvitation,
  cancelTutorInvitation,
  getMassNotifications,
  createMassNotification,
  deleteMassNotification,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getActivityLog,
  getAchievementCategories,
  getConsentsStats,
  getConsentsMissing,
  getParticipantEvents,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};

export default api;