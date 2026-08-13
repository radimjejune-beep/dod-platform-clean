// frontend/src/lib/api.js

const API_URL = 'https://dod-backend.relaxdev.ru/api';

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` })
});

// ============================================================
// 1. АВТОРИЗАЦИЯ
// ============================================================

// 1.1. РЕГИСТРАЦИЯ
export const register = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// 1.2. ВХОД
export const login = async (credentials) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();
  
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  return data;
};

// 1.3. ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
export const getMe = async () => {
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 1.4. ВЫХОД
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ============================================================
// 2. ПОЛЬЗОВАТЕЛИ
// ============================================================

// 2.1. ПОЛУЧЕНИЕ ВСЕХ ПРОФИЛЕЙ
export const getProfiles = async () => {
  const response = await fetch(`${API_URL}/profiles`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 2.2. ПОЛУЧЕНИЕ УЧАСТНИКОВ
export const getParticipants = async () => {
  const response = await fetch(`${API_URL}/participants`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 2.3. ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ ПО ID
export const getUserById = async (id) => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 2.4. ОБНОВЛЕНИЕ ПРОФИЛЯ
export const updateProfile = async (data) => {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// 2.5. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (ДЛЯ АДМИНКИ)
export const getUsers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/users?${query}` : `${API_URL}/users`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 2.6. ИЗМЕНЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
export const updateUserRole = async (userId, role) => {
  const response = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ role })
  });
  return response.json();
};

// 2.7. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
export const createUser = async (userData) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(userData)
  });
  return response.json();
};

// 2.8. ОБНОВЛЕНИЕ СТАТУСА ПОЛЬЗОВАТЕЛЯ
export const updateUserStatus = async (userId, status) => {
  const response = await fetch(`${API_URL}/users/${userId}/status`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  return response.json();
};

// ============================================================
// 3. КЛУБЫ
// ============================================================

export const getClubs = async () => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getClubById = async (id) => {
  const response = await fetch(`${API_URL}/clubs/${id}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createClub = async (data) => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 4. ДОСТИЖЕНИЯ
// ============================================================

export const getAchievements = async () => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getAchievementsByParticipant = async (participantId) => {
  const response = await fetch(`${API_URL}/achievements/participant/${participantId}`, {
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
// 5. МЕРОПРИЯТИЯ (КАЛЕНДАРЬ)
// ============================================================

export const getEvents = async () => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getEventById = async (id) => {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
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
// 6. ОБРАЩЕНИЯ
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

export const replyAppeal = async (appealId, data) => {
  const response = await fetch(`${API_URL}/appeals/${appealId}/reply`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const closeAppeal = async (appealId) => {
  const response = await fetch(`${API_URL}/appeals/${appealId}/close`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 7. РЕГИСТРАЦИИ НА МЕРОПРИЯТИЯ
// ============================================================

export const getRegistrations = async () => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const createRegistration = async (data) => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 8. СОГЛАСИЯ
// ============================================================

export const getConsents = async () => {
  const response = await fetch(`${API_URL}/consents`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const revokeConsent = async (consentId) => {
  const response = await fetch(`${API_URL}/consents/${consentId}/revoke`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

export const revokeAllConsents = async () => {
  const response = await fetch(`${API_URL}/consents/revoke-all`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 9. ДОПОЛНИТЕЛЬНЫЕ КРУЖКИ (ДЛЯ УЧАСТНИКОВ)
// ============================================================

export const getExtraActivities = async () => {
  const response = await fetch(`${API_URL}/extra-activities`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const addExtraActivity = async (data) => {
  const response = await fetch(`${API_URL}/extra-activities`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateExtraActivity = async (id, data) => {
  const response = await fetch(`${API_URL}/extra-activities/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteExtraActivity = async (id) => {
  const response = await fetch(`${API_URL}/extra-activities/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 10. ЗАПРОСЫ НА РЕГИСТРАЦИЮ (ДЛЯ АДМИНКИ)
// ============================================================

export const getRegistrationRequests = async () => {
  const response = await fetch(`${API_URL}/registration-requests`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const approveRegistration = async (userId) => {
  const response = await fetch(`${API_URL}/registration-requests/${userId}/approve`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

export const rejectRegistration = async (userId) => {
  const response = await fetch(`${API_URL}/registration-requests/${userId}/reject`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// ЭКСПОРТ ВСЕГО ОДНИМ ОБЪЕКТОМ
// ============================================================

const api = {
  // Авторизация
  register,
  login,
  getMe,
  logout,
  
  // Пользователи
  getProfiles,
  getParticipants,
  getUserById,
  updateProfile,
  getUsers,
  updateUserRole,
  createUser,
  updateUserStatus,
  
  // Клубы
  getClubs,
  getClubById,
  createClub,
  
  // Достижения
  getAchievements,
  getAchievementsByParticipant,
  addAchievement,
  deleteAchievement,
  
  // Мероприятия
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  
  // Обращения
  getAppeals,
  addAppeal,
  replyAppeal,
  closeAppeal,
  
  // Регистрации
  getRegistrations,
  createRegistration,
  
  // Согласия
  getConsents,
  revokeConsent,
  revokeAllConsents,
  
  // Кружки
  getExtraActivities,
  addExtraActivity,
  updateExtraActivity,
  deleteExtraActivity,
  
  // Запросы на регистрацию
  getRegistrationRequests,
  approveRegistration,
  rejectRegistration
};

export default api;