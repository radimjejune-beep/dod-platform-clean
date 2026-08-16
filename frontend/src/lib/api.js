// frontend/src/lib/api.js

const API_URL = 'https://dod-backend.relaxdev.ru/api';

// ✅ ПРОСТОЙ ПОЛУЧЕНИЕ ТОКЕНА
const getToken = () => {
  return localStorage.getItem('token');
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
// 2. ПОЛЬЗОВАТЕЛИ
// ============================================================
export const getUsers = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

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

// ============================================================
// 3. КЛУБЫ
// ============================================================
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

// ============================================================
// 4. ДОСТИЖЕНИЯ
// ============================================================
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

// ============================================================
// 5. СОБЫТИЯ
// ============================================================
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

// ============================================================
// 6. ОБРАЩЕНИЯ
// ============================================================
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

// ============================================================
// 7. ЗАПРОСЫ НА ТЬЮТОРОВ
// ============================================================
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
// 8. ДОКУМЕНТЫ
// ============================================================
export const getDocuments = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/documents`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 9. ОТЧЁТЫ
// ============================================================
export const getReports = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/reports`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 10. НОВОСТИ
// ============================================================
export const getNews = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/news`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 11. УВЕДОМЛЕНИЯ
// ============================================================
export const getNotifications = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/notifications`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 12. СТАТИСТИКА
// ============================================================
export const getParticipantStats = async (userId) => {
  const token = getToken();
  if (!token) return null;
  
  const response = await fetch(`${API_URL}/participant-stats/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return null;
  return response.json();
};

// ============================================================
// 13. ПРЕЗИДЕНТ
// ============================================================
export const getPresidentTasks = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/president-tasks`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 14. АКТИВНОСТЬ
// ============================================================
export const getActivityLog = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/activity-log?${query}` : `${API_URL}/activity-log`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 15. СОГЛАСИЯ
// ============================================================
export const getConsentsStats = async (clubId = null) => {
  const token = getToken();
  if (!token) return null;
  
  const url = clubId ? `${API_URL}/consents-stats?club_id=${clubId}` : `${API_URL}/consents-stats`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return null;
  return response.json();
};

// ============================================================
// 16. МАССОВЫЕ УВЕДОМЛЕНИЯ
// ============================================================
export const getMassNotifications = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/mass-notifications`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 17. ТЬЮТОР ИНВАЙТЫ
// ============================================================
export const getTutorInvitations = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/tutor-invitations`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 18. ТЬЮТОР НАЗНАЧЕНИЯ
// ============================================================
export const getTutorAssignments = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/event-tutor-assignments`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 19. ЦЕЛИ И KPI
// ============================================================
export const getGoals = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/goals`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return [];
  return response.json();
};

// ============================================================
// 20. ЗАДАЧИ
// ============================================================
export const getTasks = async () => {
  const token = getToken();
  if (!token) return [];
  
  const response = await fetch(`${API_URL}/tasks`, {
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
  getUsers,
  getParticipants,
  getClubs,
  getAchievements,
  getEvents,
  getAppeals,
  getTutorRequests,
  getDocuments,
  getReports,
  getNews,
  getNotifications,
  getParticipantStats,
  getPresidentTasks,
  getActivityLog,
  getConsentsStats,
  getMassNotifications,
  getTutorInvitations,
  getTutorAssignments,
  getGoals,
  getTasks,
};

export default api;