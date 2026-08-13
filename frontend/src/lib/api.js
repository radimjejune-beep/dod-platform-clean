// src/lib/api.js

// ===== АДРЕС БЭКЕНДА =====
const API_URL = import.meta.env.VITE_API_URL || 'https://dod-backend.relaxdev.ru/api';

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

// ===== ЭКСПОРТ ВСЕГО ОДНИМ ОБЪЕКТОМ =====
const api = {
  register,
  login,
  getMe,
  logout,
  getProfiles,
  getParticipants,
  getClubs,
  getRegistrations
};

export default api;