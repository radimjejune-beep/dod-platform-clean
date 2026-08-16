// frontend/src/lib/api.js

const API_URL = 'https://dod-backend.relaxdev.ru/api';

// ✅ ПРОСТОЙ ПОЛУЧЕНИЕ ТОКЕНА
const getToken = () => {
  return localStorage.getItem('token');
};

// ✅ ПРОСТЫЕ ЗАГОЛОВКИ
const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` })
});

// ============================================================
// 1. АУТЕНТИФИКАЦИЯ
// ============================================================
export const getMe = async () => {
  const token = getToken();
  if (!token) throw new Error('Нет токена');
  
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
  
  return response.json();
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

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ============================================================
// 2. БАЗОВЫЕ ЗАПРОСЫ
// ============================================================
export const getParticipants = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/participants`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

export const getClubs = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

export const getAchievements = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/achievements`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

export const getEvents = async () => {
  try {
    const token = getToken();
    if (!token) return [];
    
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

export const getAppeals = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

export const getTutorRequests = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/tutor-requests`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// ЭКСПОРТ
// ============================================================
const api = {
  login,
  logout,
  getMe,
  getParticipants,
  getClubs,
  getAchievements,
  getEvents,
  getAppeals,
  getTutorRequests,
};

export default api;