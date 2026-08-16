// frontend/src/lib/api.js

const API_URL = 'https://dod-backend.relaxdev.ru/api';

const getToken = () => {
  const token = localStorage.getItem('token');
  const sessionId = sessionStorage.getItem('sessionId');
  
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

// ============================================================
// 2. ВХОД
// ============================================================
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
    
    const sessionId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('userId', data.user.id);
    sessionStorage.setItem('userRole', data.user.role);
  }
  
  return data;
};

// ============================================================
// 3. СМЕНА ПАРОЛЯ
// ============================================================
export const changePassword = async (data) => {
  const response = await fetch(`${API_URL}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 4. ВЫХОД
// ============================================================
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('sessionId');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userRole');
  window.location.href = '/login';
};

// ============================================================
// 5. ПРОФИЛЬ
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
// 6. ПОЛЬЗОВАТЕЛИ (ТОЛЬКО ДЛЯ АДМИНА)
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

// ============================================================
// 7. КЛУБЫ
// ============================================================
export const getClubs = async () => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 8. ДОСТИЖЕНИЯ
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
// 9. СОБЫТИЯ
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
// 10. РЕГИСТРАЦИИ
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
// 11. ОБРАЩЕНИЯ
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

// ============================================================
// 12. ОТЧЁТЫ
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
// 13. ДОКУМЕНТЫ
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
// 14. НОВОСТИ
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
// 15. УВЕДОМЛЕНИЯ
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
// 16. АВАТАР
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
// 17. ДЕТИ РОДИТЕЛЯ
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
// 18. ПРЕЗИДЕНТ
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
// 19. ОСТАЛЬНЫЕ
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
// ЭКСПОРТ API ОБЪЕКТА
// ============================================================
const api = {
  // Аутентификация
  login,
  logout,
  getMe,
  changePassword,
  
  // Профиль
  updateProfile,
  
  // Пользователи
  getUsers,
  getParticipants,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  
  // Клубы
  getClubs,
  
  // Достижения
  getAchievements,
  addAchievement,
  deleteAchievement,
  
  // События
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  
  // Регистрации
  getRegistrations,
  addRegistration,
  
  // Обращения
  getAppeals,
  addAppeal,
  
  // Отчёты
  getReports,
  createReport,
  updateReport,
  deleteReport,
  submitReport,
  approveReport,
  rejectReport,
  
  // Документы
  getDocuments,
  createDocument,
  deleteDocument,
  
  // Новости
  getNews,
  createNews,
  updateNews,
  deleteNews,
  
  // Уведомления
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Аватар
  uploadAvatar,
  
  // Дети
  getParentChildren,
  parentLinkChild,
  
  // Президент
  getPresidentTasks,
  createPresidentTask,
  respondToPresidentTask,
  
  // Статистика
  getParticipantStats,
  getClubPresident,
  setClubPresident,
};

export default api;