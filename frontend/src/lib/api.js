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

// ===== 1. ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (ТЕПЕРЬ /api/me С ТОКЕНОМ) =====
export const getMe = async () => {
  const token = getToken();
  console.log('🔑 Токен для запроса:', token ? `${token.slice(0, 20)}...` : 'null');
  
  // ===== ИСПОЛЬЗУЕМ /api/me С ТОКЕНОМ =====
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`  // <--- ОТПРАВЛЯЕМ ТОКЕН
    }
  });
  
  console.log('📥 Статус /me:', response.status);
  
  if (!response.ok) {
    console.log('❌ Ошибка /me, пробуем /api/me2 как запасной...');
    // Если /me не работает — пробуем /api/me2
    const fallbackResponse = await fetch(`${API_URL}/me2`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const fallbackData = await fallbackResponse.json();
    console.log('📥 Ответ /me2 (запасной):', fallbackData);
    return fallbackData;
  }
  
  const data = await response.json();
  console.log('📥 Ответ /me (основной):', data);
  return data;
};

// ===== 2. ОСТАЛЬНЫЕ ФУНКЦИИ =====
export const getClubs = async () => {
  const response = await fetch(`${API_URL}/clubs`, {
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

export const getUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

export const getEvents = async () => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

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

export const createUser = async (data) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
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

const api = {
  getMe,
  getClubs,
  getProfiles,
  getParticipants,
  getUsers,
  getEvents,
  getAchievements,
  addAchievement,
  deleteAchievement,
  createEvent,
  updateEvent,
  deleteEvent,
  createUser,
  updateUserRole,
  getAppeals,
  addAppeal
};

export default api;