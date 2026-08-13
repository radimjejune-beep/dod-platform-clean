// frontend/src/lib/api.js

// ===== АДРЕС БЭКЕНДА =====
const API_URL = 'https://dod-backend.relaxdev.ru/api';

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` })
});

// ===== 1. РЕГИСТРАЦИЯ =====
export const register = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// ===== 2. ВХОД =====
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

// ===== 3. ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
export const getMe = async () => {
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 4. ВЫХОД =====
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ===== 5. ПОЛУЧЕНИЕ ПРОФИЛЕЙ =====
export const getProfiles = async () => {
  const response = await fetch(`${API_URL}/profiles`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 6. ПОЛУЧЕНИЕ УЧАСТНИКОВ =====
export const getParticipants = async () => {
  const response = await fetch(`${API_URL}/participants`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 7. ПОЛУЧЕНИЕ КЛУБОВ =====
export const getClubs = async () => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 8. ПОЛУЧЕНИЕ РЕГИСТРАЦИЙ =====
export const getRegistrations = async () => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 9. ОБНОВЛЕНИЕ ПРОФИЛЯ =====
export const updateProfile = async (data) => {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ===== 10. ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ ПО ID =====
export const getUserById = async (id) => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 11. ОБНОВЛЕНИЕ СТАТУСА ПОЛЬЗОВАТЕЛЯ =====
export const updateUserStatus = async (id, status) => {
  const response = await fetch(`${API_URL}/users/${id}/status`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  return response.json();
};

// ===== 12. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ =====
export const getUsers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/users?${query}` : `${API_URL}/users`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== 13. ДОСТИЖЕНИЯ =====
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

// ===== 14. МЕРОПРИЯТИЯ =====
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

// ===== 15. ЭКСПОРТ ВСЕГО ОДНИМ ОБЪЕКТОМ =====
const api = {
  register,
  login,
  getMe,
  logout,
  getProfiles,
  getParticipants,
  getClubs,
  getRegistrations,
  updateProfile,
  getUserById,
  updateUserStatus,
  getUsers,
  getAchievements,
  getAchievementsByParticipant,
  addAchievement,
  deleteAchievement,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};

export default api;