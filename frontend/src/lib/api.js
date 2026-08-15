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
  
  // ============================================================
  // ПРОВЕРКА РАЗМЕРА ПЕРЕД СОХРАНЕНИЕМ
  // ============================================================
  try {
    const dataSize = JSON.stringify(data).length;
    console.log(`📦 Размер данных: ${(dataSize / 1024).toFixed(2)} KB`);
    
    // Если размер больше 500KB — предупреждение
    if (dataSize > 500 * 1024) {
      console.warn('⚠️ Данные профиля слишком большие! Возможен сбой localStorage.');
    }
  } catch (e) {
    console.warn('⚠️ Не удалось проверить размер данных:', e);
  }
  
  // ============================================================
  // СОХРАНЯЕМ club_id В LOCALSTORAGE
  // ============================================================
  if (data && data.club_id) {
    localStorage.setItem('userClubId', data.club_id);
    console.log('🏫 Сохранён club_id в localStorage:', data.club_id);
  } else {
    localStorage.removeItem('userClubId');
  }
  
  // ============================================================
  // СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО НУЖНЫЕ ПОЛЯ)
  // ============================================================
  if (data && data.id) {
    try {
      // Сохраняем только нужные поля, чтобы уменьшить размер
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
        avatar_url: data.avatar_url || null
      };
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('✅ Пользователь сохранён');
    } catch (storageError) {
      console.warn('⚠️ Не удалось сохранить пользователя в localStorage:', storageError);
      // Если ошибка — пробуем без avatar_url
      if (storageError.name === 'QuotaExceededError') {
        console.log('🔄 Пробуем сохранить без avatar_url...');
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
          status: data.status || 'active'
        };
        localStorage.setItem('user', JSON.stringify(userData));
      }
    }
  }
  
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
// 20. ПРИГЛАШЕНИЯ ТЬЮТОРОВ
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
// 21. ПРИВЯЗКА РЕБЁНКА К РОДИТЕЛЮ (ПО ЛОГИНУ И ПАРОЛЮ)
// ============================================================
export const parentLinkChild = async (data) => {
  const response = await fetch(`${API_URL}/parent-link-child`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 22. АДМИН-ФУНКЦИИ
// ============================================================

// ===== ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ (ЛОГИН) =====
export const getUserCredentials = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}/credentials`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== СБРОС ПАРОЛЯ ПОЛЬЗОВАТЕЛЯ (АДМИН) =====
export const resetUserPassword = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

// ===== ПРИКРЕПЛЕНИЕ УЧАСТНИКА К КЛУБУ (АДМИН) =====
export const assignUserToClub = async (userId, clubId) => {
  const response = await fetch(`${API_URL}/users/${userId}/assign-club`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ club_id: clubId })
  });
  return response.json();
};

// ===== УДАЛЕНИЕ ПРЕЗИДЕНТА КЛУБА (АДМИН) =====
export const removeClubPresident = async (clubId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/president`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// НАЗНАЧЕНИЯ ТЬЮТОРОВ
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
// ЭКСПОРТ API ОБЪЕКТА
// ============================================================
const api = {
  // Аутентификация
  getMe,
  
  // Профиль
  updateProfile,
  
  // Пользователи
  getUsers,
  getProfiles,
  getParticipants,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  
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
  replyToAppeal,
  getAppealReplies,
  
  // Запросы на тьюторов
  getTutorRequests,
  createTutorRequest,
  updateTutorRequest,
  
  // Регистрация (публичная)
  registerUser,
  
  // Импорт
  importParticipants,
  
  // Аватар
  uploadAvatar,
  getAvatar,
  
  // История участника
  getParticipantEvents,
  getParticipantStats,
  
  // Дети родителя
  getParentChildren,
  addParentChild,
  removeParentChild,
  
  // Timeline ребёнка
  getChildTimeline,
  
  // Объявления
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  
  // Шаблоны отчётов
  getReportTemplates,
  createReportTemplate,
  deleteReportTemplate,
  
  // Президент клуба
  setClubPresident,
  getClubPresident,
  
  // Рейтинг клуба
  getClubRating,
  
  // Приглашения тьюторов
  getTutorInvitations,
  createTutorInvitation,
  respondToTutorInvitation,
  cancelTutorInvitation,
  
  // Привязка ребёнка
  parentLinkChild,
  
  // Админ-функции
  getUserCredentials,
  resetUserPassword,
  assignUserToClub,
  removeClubPresident,
};

export default api;