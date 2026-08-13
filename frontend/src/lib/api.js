// frontend/src/lib/api.js

// ===== АДРЕС БЭКЕНДА =====
const API_URL = import.meta.env.VITE_API_URL || 'https://dod-backend.relaxdev.ru/api';

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
// 2. ПРОФИЛЬ
// ============================================================

// 2.1. ОБНОВЛЕНИЕ ПРОФИЛЯ
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

// 3.1. ПОЛУЧЕНИЕ ВСЕХ ПРОФИЛЕЙ
export const getProfiles = async () => {
  const response = await fetch(`${API_URL}/profiles`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 3.2. ПОЛУЧЕНИЕ УЧАСТНИКОВ
export const getParticipants = async () => {
  const response = await fetch(`${API_URL}/participants`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 3.3. ПОЛУЧЕНИЕ КЛУБОВ
export const getClubs = async () => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 3.4. ПОЛУЧЕНИЕ РЕГИСТРАЦИЙ
export const getRegistrations = async () => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 4. ДОСТИЖЕНИЯ
// ============================================================

// 4.1. ПОЛУЧЕНИЕ ВСЕХ ДОСТИЖЕНИЙ
export const getAchievements = async () => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 4.2. ДОБАВЛЕНИЕ ДОСТИЖЕНИЯ
export const addAchievement = async (data) => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// 4.3. УДАЛЕНИЕ ДОСТИЖЕНИЯ
export const deleteAchievement = async (id) => {
  const response = await fetch(`${API_URL}/achievements/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 5. ОБРАЩЕНИЯ
// ============================================================

// 5.1. ПОЛУЧЕНИЕ ОБРАЩЕНИЙ
export const getAppeals = async () => {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 5.2. ДОБАВЛЕНИЕ ОБРАЩЕНИЯ
export const addAppeal = async (data) => {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// 5.3. ОТВЕТ НА ОБРАЩЕНИЕ
export const replyAppeal = async (appealId, data) => {
  const response = await fetch(`${API_URL}/appeals/${appealId}/reply`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// 5.4. ЗАКРЫТИЕ ОБРАЩЕНИЯ
export const closeAppeal = async (appealId) => {
  const response = await fetch(`${API_URL}/appeals/${appealId}/close`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 6. МЕРОПРИЯТИЯ (КАЛЕНДАРЬ)
// ============================================================

// 6.1. ПОЛУЧЕНИЕ МЕРОПРИЯТИЙ
export const getEvents = async () => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 7. КРУЖКИ (ДЛЯ УЧАСТНИКОВ)
// ============================================================

// 7.1. ПОЛУЧЕНИЕ КРУЖКОВ
export const getExtraActivities = async () => {
  const response = await fetch(`${API_URL}/extra-activities`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 7.2. ДОБАВЛЕНИЕ КРУЖКА
export const addExtraActivity = async (data) => {
  const response = await fetch(`${API_URL}/extra-activities`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// 7.3. ОБНОВЛЕНИЕ КРУЖКА
export const updateExtraActivity = async (id, data) => {
  const response = await fetch(`${API_URL}/extra-activities/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// 7.4. УДАЛЕНИЕ КРУЖКА
export const deleteExtraActivity = async (id) => {
  const response = await fetch(`${API_URL}/extra-activities/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 8. УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (АДМИНКА)
// ============================================================

// 8.1. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
export const getUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 8.2. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
export const createUser = async (userData) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(userData)
  });
  return response.json();
};

// 8.3. ИЗМЕНЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ
export const updateUserRole = async (userId, role) => {
  const response = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ role })
  });
  return response.json();
};

// ============================================================
// 9. ЗАПРОСЫ НА РЕГИСТРАЦИЮ (АДМИНКА)
// ============================================================

// 9.1. ПОЛУЧЕНИЕ ЗАПРОСОВ
export const getRegistrationRequests = async () => {
  const response = await fetch(`${API_URL}/registration-requests`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// 9.2. ОДОБРЕНИЕ ЗАПРОСА
export const approveRegistration = async (userId) => {
  const response = await fetch(`${API_URL}/registration-requests/${userId}/approve`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// 9.3. ОТКЛОНЕНИЕ ЗАПРОСА
export const rejectRegistration = async (userId) => {
  const response = await fetch(`${API_URL}/registration-requests/${userId}/reject`, {
    method: 'PATCH',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 10. ЭКСПОРТ ВСЕГО ОДНИМ ОБЪЕКТОМ
// ============================================================

const api = {
  // Авторизация
  register,
  login,
  getMe,
  logout,
  
  // Профиль
  updateProfile,
  
  // Пользователи
  getProfiles,
  getParticipants,
  getClubs,
  getRegistrations,
  
  // Достижения
  getAchievements,
  addAchievement,
  deleteAchievement,
  
  // Обращения
  getAppeals,
  addAppeal,
  replyAppeal,
  closeAppeal,
  
  // Мероприятия
  getEvents,
  
  // Кружки
  getExtraActivities,
  addExtraActivity,
  updateExtraActivity,
  deleteExtraActivity,
  
  // Управление пользователями
  getUsers,
  createUser,
  updateUserRole,
  
  // Запросы на регистрацию
  getRegistrationRequests,
  approveRegistration,
  rejectRegistration
};

export default api;