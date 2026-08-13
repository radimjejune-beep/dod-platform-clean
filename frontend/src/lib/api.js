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

// ===== ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
export const getMe = async () => {
  const token = getToken();
  console.log('🔑 Токен для запроса:', token ? `${token.slice(0, 20)}...` : 'null');
  
  // Пробуем /api/me (с токеном)
  let response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('📥 Статус /me:', response.status);
  
  // Если /me не работает — пробуем /api/me2 (запасной)
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

// ===== ОБНОВЛЕНИЕ ПРОФИЛЯ =====
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

// ===== ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ =====
export const getUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== ПОЛУЧЕНИЕ ВСЕХ ПРОФИЛЕЙ =====
export const getProfiles = async () => {
  const response = await fetch(`${API_URL}/profiles`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== ПОЛУЧЕНИЕ УЧАСТНИКОВ =====
export const getParticipants = async () => {
  const response = await fetch(`${API_URL}/participants`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (для админов) =====
export const createUser = async (data) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ===== ОБНОВЛЕНИЕ РОЛИ =====
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

// ===== ПОЛУЧЕНИЕ КЛУБОВ =====
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

// ===== ПОЛУЧЕНИЕ ДОСТИЖЕНИЙ =====
export const getAchievements = async () => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== ДОБАВЛЕНИЕ ДОСТИЖЕНИЯ =====
export const addAchievement = async (data) => {
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ===== УДАЛЕНИЕ ДОСТИЖЕНИЯ =====
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

// ===== ПОЛУЧЕНИЕ СОБЫТИЙ =====
export const getEvents = async () => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== СОЗДАНИЕ СОБЫТИЯ =====
export const createEvent = async (data) => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ===== ОБНОВЛЕНИЕ СОБЫТИЯ =====
export const updateEvent = async (id, data) => {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ===== УДАЛЕНИЕ СОБЫТИЯ =====
export const deleteEvent = async (id) => {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 7. РЕГИСТРАЦИИ НА МЕРОПРИЯТИЯ
// ============================================================

// ===== ПОЛУЧЕНИЕ РЕГИСТРАЦИЙ =====
export const getRegistrations = async () => {
  const response = await fetch(`${API_URL}/registrations`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== ДОБАВЛЕНИЕ РЕГИСТРАЦИИ =====
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

// ===== ПОЛУЧЕНИЕ ОБРАЩЕНИЙ =====
export const getAppeals = async () => {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ===== ДОБАВЛЕНИЕ ОБРАЩЕНИЯ =====
export const addAppeal = async (data) => {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 9. РЕГИСТРАЦИЯ (ПУБЛИЧНАЯ)
// ============================================================

// ===== РЕГИСТРАЦИЯ =====
export const registerUser = async (data) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 10. ИМПОРТ УЧАСТНИКОВ
// ============================================================

// ===== ИМПОРТ УЧАСТНИКОВ (будет позже) =====
export const importParticipants = async (data) => {
  const response = await fetch(`${API_URL}/import-participants`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 11. ЭКСПОРТ API ОБЪЕКТА
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
  
  // Регистрация
  registerUser,
  
  // Импорт
  importParticipants
};

export default api;