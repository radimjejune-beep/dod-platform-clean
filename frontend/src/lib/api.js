// frontend/src/lib/api.js

import { notifyApiFailure, labelForUrl } from './apiStatus';

const API_URL = 'https://dod-backend.relaxdev.ru/api';

// ============================================================
// ТОКЕН
// ============================================================
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

// Сессия кончилась — человека нужно отправить на вход, а не оставлять
// на экране с надписью «Не удалось загрузить данные». Раньше при
// отсутствии токена getMe просто бросал ошибку, каждый экран ловил её в
// свой catch и показывал что-то невнятное: на экране согласий,
// например, одновременно висели ошибка загрузки и бодрое «к вашему
// кабинету не привязан ни один ребёнок».
// Сервер ответил ошибкой. Вызывающий код по-прежнему получает пустое
// значение — иначе половина страниц упадёт белым экраном, — но об отказе
// теперь узнаёт общий канал, и человек видит внизу экрана, что список
// пуст не потому, что записей нет.
//
// 401 — это кончившаяся сессия, человека нужно отправить на вход.
// 403 — это отказ по правам: страница запросила то, на что у роли нет
// права. Полосу не показываем (тьютор увидел бы её на каждом экране),
// но в консоли след остаётся — такие вызовы надо убирать из страниц.
async function serverSaidNo(response, fallback) {
  if (response.status === 401) {
    goToLogin();
    return fallback;
  }

  let detail = '';
  try {
    const data = await response.clone().json();
    detail = typeof data?.error === 'string' ? data.error : '';
  } catch {
    // Тело не разобралось — обойдёмся кодом ответа
  }

  if (response.status === 403) {
    console.warn(`Нет прав на ${response.url} — страница не должна была это запрашивать`);
    return fallback;
  }

  notifyApiFailure({
    status: response.status,
    url: response.url,
    label: labelForUrl(response.url),
    detail
  });

  return fallback;
}

const goToLogin = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

export const getMe = async () => {
  const token = getToken();
  if (!token) {
    goToLogin();
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
    if (response.status === 401) goToLogin();
    throw new Error(`Ошибка ${response.status}`);
  }

  return response.json();
};

export const changePassword = async (data) => {
  const response = await fetch(`${API_URL}/change-password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// РАЗБОР ОШИБОК API
// ============================================================
// Сервер при ошибке валидации возвращает { error, details: [{field, message}] },
// но интерфейс показывал только error — то есть «Ошибка валидации данных»
// без единого намёка, какое поле не так.
// Сервер называет поля так, как они зовутся в базе: form_url,
// event_date, club_id. Человеку это ничего не говорит, а именно по
// этому сообщению он должен понять, что исправить.
const FIELD_LABELS = {
  title: 'Название',
  description: 'Описание',
  location: 'Место',
  event_date: 'Дата начала',
  end_date: 'Дата окончания',
  start_time: 'Время начала',
  end_time: 'Время окончания',
  type: 'Тип',
  capacity: 'Вместимость',
  club_id: 'Клуб',
  form_url: 'Ссылка на форму',
  registration_deadline: 'Срок регистрации',
  max_participants: 'Максимум участников',
  target_clubs: 'Приглашённые КЮДы',
  full_name: 'ФИО',
  email: 'Электронная почта',
  password: 'Пароль',
  phone: 'Телефон',
  role: 'Роль',
  birth_date: 'Дата рождения',
  school: 'Школа',
  class_name: 'Класс',
  report_month: 'Отчётный месяц',
  report_text: 'Текст отчёта',
  name: 'Название',
  city: 'Город',
  contact_email: 'Электронная почта',
  contact_phone: 'Телефон',
  session_date: 'Дата занятия',
  topic: 'Тема',
  // Обращения, документы, новости, цели, задачи, уведомления
  subject: 'Тема обращения',
  message: 'Текст',
  priority: 'Приоритет',
  content: 'Текст',
  image_url: 'Ссылка на изображение',
  category: 'Категория',
  document_type: 'Тип документа',
  is_public: 'Доступ',
  tags: 'Метки',
  target_value: 'Целевое значение',
  current_value: 'Текущее значение',
  unit: 'Единица измерения',
  status: 'Статус',
  start_date: 'Дата начала',
  assigned_to: 'Ответственный',
  due_date: 'Срок',
  recurrence: 'Повторение',
  recurrence_end: 'Окончание повторений',
  deadline: 'Срок',
  is_global: 'Для всего движения',
  recipients: 'Получатели',
  scheduled_at: 'Дата отправки',
  events_count: 'Количество мероприятий',
  participants_count: 'Количество участников',
  participant_id: 'Участник',
  achievement_date: 'Дата достижения',
  tutor_id: 'Тьютор',
  event_id: 'Мероприятие',
  user_id: 'Пользователь',
  responsibilities: 'Обязанности',
  icon: 'Значок',
  color: 'Цвет',
  points: 'Баллы',
  leader_name: 'Руководитель',
  interests: 'Интересы',
  bio: 'О себе',
  skills: 'Навыки',
  education: 'Образование',
  achievements: 'Достижения',
  social_links: 'Ссылки',
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  parent_full_name: 'ФИО родителя',
  parent_phone: 'Телефон родителя',
  parent_email: 'Почта родителя'
};

export const describeApiError = (result, fallback = 'Неизвестная ошибка') => {
  if (!result) return fallback;

  const details = Array.isArray(result.details)
    ? result.details
        .map((d) => {
          if (!d.field) return d.message;
          const label = FIELD_LABELS[d.field] || d.field;
          // Сообщения Joi приходят по-английски и с именем поля внутри
          const text = String(d.message || '')
            .replace(new RegExp(`"${d.field}"\\s*`, 'g'), '')
            .replace('is not allowed to be empty', 'не заполнено')
            .replace('is required', 'обязательно')
            .replace('must be a string', 'заполнено неверно')
            .replace('must be a number', 'должно быть числом')
            .replace('must be a valid date', 'неверная дата')
            .replace('must be a boolean', 'должно быть «да» или «нет»')
            .replace('must be an array', 'должно быть списком')
            .replace('must be a valid GUID', 'выбрано неверно')
            .replace('must be a valid uri', 'должно быть ссылкой вида https://…')
            .replace('must be a valid email', 'некорректный адрес почты')
            .replace('must be an integer', 'должно быть целым числом')
            .replace(/must be greater than or equal to (\S+)/, 'не может быть меньше $1')
            .replace(/must be less than or equal to (\S+)/, 'не может быть больше $1')
            .replace(/length must be at least (\S+) characters long/, 'слишком короткое (минимум $1 симв.)')
            .replace(/length must be less than or equal to (\S+) characters long/, 'слишком длинное (максимум $1 симв.)')
            .replace(/must be one of \[(.+)\]/, 'допустимые значения: $1')
            .replace('is not allowed', 'не поддерживается')
            .trim();
          return `${label} — ${text}`;
        })
        .join('; ')
    : '';

  if (details) return `${result.error || fallback}: ${details}`;
  return result.error || fallback;
};

// ============================================================
// СОПРОВОЖДАЮЩИЕ ВЗРОСЛЫЕ КЮДА
// ============================================================
export const getClubEscorts = async (clubId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/escorts`, { headers: headers() });
  return toArray(await response.json());
};

export const addClubEscort = async (clubId, data) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/escorts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const removeClubEscort = async (clubId, escortId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/escorts/${escortId}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// ПЕРЕПИСКА МЕЖДУ КЮДАМИ
// ============================================================
export const getClubThreads = async () => {
  const response = await fetch(`${API_URL}/club-threads`, { headers: headers() });
  return toArray(await response.json());
};

export const getClubThread = async (id) => {
  const response = await fetch(`${API_URL}/club-threads/${id}`, { headers: headers() });
  return response.json();
};

export const getClubRecipients = async (clubId) => {
  const response = await fetch(`${API_URL}/club-threads/recipients/${clubId}`, { headers: headers() });
  return toArray(await response.json());
};

export const createClubThread = async (data) => {
  const response = await fetch(`${API_URL}/club-threads`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const replyToClubThread = async (id, message) => {
  const response = await fetch(`${API_URL}/club-threads/${id}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ message })
  });
  return response.json();
};

export const setClubThreadStatus = async (id, status) => {
  const response = await fetch(`${API_URL}/club-threads/${id}/status`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  return response.json();
};

// ============================================================
// 2. ПОЛЬЗОВАТЕЛИ
// ============================================================
// ============================================================
// СПИСКИ ВСЕГДА ВОЗВРАЩАЮТ МАССИВ
// ============================================================
// Функции ниже обещали { data, pagination }, а сервер отдавал обычный
// массив. У массива нет свойства data, поэтому экраны, читавшие
// ответ.data, всегда получали пустоту: списки участников, мероприятий,
// достижений и отчётов ничего не показывали, вежливо сообщая «не
// найдено». Разбор формы ответа теперь в одном месте: и массив, и
// конверт { data } превращаются в массив.
const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const getUsers = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/users?${query}` : `${API_URL}/users`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

export const getParticipants = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/participants?${query}` : `${API_URL}/participants`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

export const createUser = async (data) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// Карточка одного человека. Прежде экраны грузили весь список
// пользователей и искали в нём нужного — список закрыт для руководителя
// КЮДа и тьютора, и они видели «Участник не найден».
export const getUser = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    headers: headers()
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

export const assignUserToClub = async (userId, clubId) => {
  const response = await fetch(`${API_URL}/users/${userId}/assign-club`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ club_id: clubId })
  });
  return response.json();
};

export const updateProfile = async (data) => {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 3. КЛУБЫ
// ============================================================
export const getClubs = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/clubs?${query}` : `${API_URL}/clubs`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

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
// 4. ДОСТИЖЕНИЯ
// ============================================================
export const getAchievements = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/achievements?${query}` : `${API_URL}/achievements`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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

export const getAchievementCategories = async () => {
  const response = await fetch(`${API_URL}/achievement-categories`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const createAchievementCategory = async (data) => {
  const response = await fetch(`${API_URL}/achievement-categories`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateAchievementCategory = async (id, data) => {
  const response = await fetch(`${API_URL}/achievement-categories/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteAchievementCategory = async (id) => {
  const response = await fetch(`${API_URL}/achievement-categories/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 5. СОБЫТИЯ (С ПАГИНАЦИЕЙ)
// ============================================================
export const getEvents = async (params = {}) => {
  try {
    const token = getToken();
    if (!token) return [];
    
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/events?${query}` : `${API_URL}/events`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers()
    });
    
    if (!response.ok) {
      console.error('❌ Ошибка получения событий:', response.status);
      return [];
    }
    
    return toArray(await response.json());
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
// 6. РЕГИСТРАЦИИ
// ============================================================
export const getRegistrations = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/registrations?${query}` : `${API_URL}/registrations`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 7. ОБРАЩЕНИЯ
// ============================================================
export const getAppeals = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/appeals?${query}` : `${API_URL}/appeals`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 8. ОТЧЁТЫ (С ПАГИНАЦИЕЙ)
// ============================================================
export const getReports = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/reports?${query}` : `${API_URL}/reports`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 9. ДОКУМЕНТЫ
// ============================================================
export const getDocuments = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/documents?${query}` : `${API_URL}/documents`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 10. НОВОСТИ
// ============================================================
export const getNews = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/news?${query}` : `${API_URL}/news`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 11. УВЕДОМЛЕНИЯ
// ============================================================
export const getNotifications = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/notifications?${query}` : `${API_URL}/notifications`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 12. СТАТИСТИКА
// ============================================================
export const getParticipantStats = async (userId) => {
  const token = getToken();
  if (!token) return null;
  
  const response = await fetch(`${API_URL}/participant-stats/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, null);
  return response.json();
};

export const getParticipantEvents = async (userId) => {
  const response = await fetch(`${API_URL}/participant-events/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 13. ПРЕЗИДЕНТ
// ============================================================
export const getPresidentTasks = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/president-tasks?${query}` : `${API_URL}/president-tasks`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 14. ЗАПРОСЫ НА ТЬЮТОРОВ
// ============================================================
export const getTutorRequests = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/tutor-requests?${query}` : `${API_URL}/tutor-requests`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
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
// 15. ТЬЮТОР НАЗНАЧЕНИЯ
// ============================================================
export const getTutorAssignments = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/event-tutor-assignments?${query}` : `${API_URL}/event-tutor-assignments`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

export const createTutorAssignment = async (data) => {
  const response = await fetch(`${API_URL}/event-tutor-assignments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteTutorAssignment = async (assignmentId) => {
  const response = await fetch(`${API_URL}/event-tutor-assignments/${assignmentId}`, {
    method: 'DELETE',
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
// 16. ТЬЮТОР ИНВАЙТЫ
// ============================================================
export const getTutorInvitations = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/tutor-invitations?${query}` : `${API_URL}/tutor-invitations`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);

  return toArray(await response.json());
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
// 17. МАССОВЫЕ УВЕДОМЛЕНИЯ
// ============================================================
export const getMassNotifications = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/mass-notifications?${query}` : `${API_URL}/mass-notifications`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

export const createMassNotification = async (data) => {
  const response = await fetch(`${API_URL}/mass-notifications`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteMassNotification = async (id) => {
  const response = await fetch(`${API_URL}/mass-notifications/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 18. ЦЕЛИ И KPI
// ============================================================
export const getGoals = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/goals?${query}` : `${API_URL}/goals`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

export const createGoal = async (data) => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateGoal = async (id, data) => {
  const response = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteGoal = async (id) => {
  const response = await fetch(`${API_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 19. ЗАДАЧИ
// ============================================================
export const getTasks = async (params = {}) => {
  const token = getToken();
  if (!token) return [];

  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/tasks?${query}` : `${API_URL}/tasks`;

  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });

  // Раньше при ошибке возвращался объект с полем data, а при успехе —
  // массив. Страница делала .map() и падала ровно тогда, когда что-то
  // пошло не так. Сервер отдаёт массив — возвращаем массив всегда.
  if (!response.ok) return serverSaidNo(response, []);

  return response.json();
};

export const createTask = async (data) => {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateTask = async (id, data) => {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteTask = async (id) => {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 20. АКТИВНОСТЬ
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
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

// ============================================================
// 21. СОГЛАСИЯ
// ============================================================
export const getConsentsStats = async (clubId = null) => {
  const token = getToken();
  if (!token) return null;
  
  const url = clubId ? `${API_URL}/consents-stats?club_id=${clubId}` : `${API_URL}/consents-stats`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, null);
  return response.json();
};

export const getConsentsMissing = async (clubId = null) => {
  const token = getToken();
  if (!token) return [];
  
  const url = clubId ? `${API_URL}/consents-missing?club_id=${clubId}` : `${API_URL}/consents-missing`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

// ============================================================
// 21a. СОГЛАСИЯ (152-ФЗ)
// ============================================================
// Согласие за несовершеннолетнего даёт только законный представитель.
// Участник видит своё состояние согласий, но подтвердить их не может.
export const getConsentDocuments = async () => {
  const response = await fetch(`${API_URL}/consent-documents`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const getUserConsents = async (userId) => {
  const response = await fetch(`${API_URL}/consents/${userId}`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { current: [], history: [] });
  return response.json();
};

export const giveConsent = async (subjectId, code) => {
  const response = await fetch(`${API_URL}/consents`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject_id: subjectId, code })
  });
  return response.json();
};

// Напоминание уходит уведомлением внутрь платформы: родителю, если он
// привязан, иначе руководителю КЮДа — потому что оформлять согласие
// пока некому и сначала нужно пригласить родителя.
export const remindAboutConsents = async (participantIds) => {
  const response = await fetch(`${API_URL}/consents/remind`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ participant_ids: participantIds })
  });
  return response.json();
};

export const revokeConsent = async (subjectId, code, reason) => {
  const response = await fetch(`${API_URL}/consents/revoke`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject_id: subjectId, code, reason })
  });
  return response.json();
};

// ============================================================
// 21b. СОТРУДНИКИ КЮДА
// ============================================================
export const getMyClubs = async () => {
  const response = await fetch(`${API_URL}/my-clubs`, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, { movement_wide: false, clubs: [] });
  return response.json();
};

export const getStaffCandidates = async (clubId, q) => {
  const response = await fetch(
    `${API_URL}/clubs/${clubId}/staff-candidates?q=${encodeURIComponent(q)}`,
    { method: 'GET', headers: headers() }
  );
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const getClubStaff = async (clubId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/staff`, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const addClubStaff = async (clubId, data) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/staff`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const updateClubStaff = async (clubId, userId, position) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/staff/${userId}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ position })
  });
  return response.json();
};

export const removeClubStaff = async (clubId, userId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/staff/${userId}`, {
    method: 'DELETE', headers: headers()
  });
  return response.json();
};

export const transferClubHead = async (clubId, data) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/transfer-head`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 21c. КОМАНДЫ НА ФОРУМЫ И ВЫЕЗДЫ
// ============================================================
export const getMyClubInvitations = async () => {
  const response = await fetch(`${API_URL}/my-club-invitations`, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const inviteClubsToEvent = async (eventId, data) => {
  const response = await fetch(`${API_URL}/events/${eventId}/invite-clubs`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const createTeamSubmission = async (eventId, clubId) => {
  const response = await fetch(`${API_URL}/team-submissions`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ event_id: eventId, club_id: clubId })
  });
  return response.json();
};

export const getTeamSubmission = async (id) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}`, { method: 'GET', headers: headers() });
  return response.json();
};

export const addTeamMember = async (id, data) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/members`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const updateTeamMember = async (id, memberId, data) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/members/${memberId}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteTeamMember = async (id, memberId) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/members/${memberId}`, {
    method: 'DELETE', headers: headers()
  });
  return response.json();
};

export const submitTeam = async (id) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/submit`, {
    method: 'POST', headers: headers()
  });
  return response.json();
};

export const reviewTeam = async (id, decision, comment) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/review`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ decision, comment })
  });
  return response.json();
};

export const getEventTeams = async (eventId) => {
  const response = await fetch(`${API_URL}/events/${eventId}/teams`, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, { clubs: [] });
  return response.json();
};

export const saveTeamMemberDocument = async (id, memberId, data) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/members/${memberId}/document`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

// Данные документа запрашиваются отдельно и только теми, кому положено
export const getTeamMemberDocument = async (id, memberId) => {
  const response = await fetch(`${API_URL}/team-submissions/${id}/members/${memberId}/document`, {
    method: 'GET', headers: headers()
  });
  return response.json();
};

// Выгрузка идёт файлом, поэтому не через response.json()
export const exportEventTeams = async (eventId, withDocuments = false) => {
  const url = `${API_URL}/events/${eventId}/teams/export${withDocuments ? '?documents=true' : ''}`;
  const response = await fetch(url, { method: 'GET', headers: headers() });
  if (!response.ok) throw new Error('Не удалось выгрузить список');
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `komandy_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

// ============================================================
// 19b. ПОИСК
// ============================================================
export const search = async (query) => {
  const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
    method: 'GET', headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { query, groups: [] });
  return response.json();
};

// ============================================================
// 19c. ДВИЖЕНИЕ ЦЕЛИКОМ
// ============================================================
export const getClubsHealth = async () => {
  const response = await fetch(`${API_URL}/movement/clubs-health`, {
    method: 'GET', headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { clubs: [], summary: {}, total: 0 });
  return response.json();
};

export const getMovementYearly = async (period, year) => {
  const response = await fetch(
    `${API_URL}/movement/yearly?period=${period}&year=${year}`,
    { method: 'GET', headers: headers() }
  );
  if (!response.ok) return serverSaidNo(response, null);
  return response.json();
};

export const getMovementStaff = async () => {
  const response = await fetch(`${API_URL}/movement/staff`, {
    method: 'GET', headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

// ============================================================
// 20. ПОДГОТОВКА К ВЫЕЗДУ
// ============================================================
export const getTripChecklist = async (eventId, clubId) => {
  const q = clubId ? `?club_id=${clubId}` : '';
  const response = await fetch(`${API_URL}/events/${eventId}/checklist${q}`, {
    method: 'GET', headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const addTripChecklistItem = async (eventId, data) => {
  const response = await fetch(`${API_URL}/events/${eventId}/checklist`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const removeTripChecklistItem = async (id) => {
  const response = await fetch(`${API_URL}/checklist-items/${id}`, {
    method: 'DELETE', headers: headers()
  });
  return response.json();
};

// Выезды участника или его ребёнка — только утверждённые команды
export const getMyTrips = async () => {
  const response = await fetch(`${API_URL}/my-trips`, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const setTripProgress = async (data) => {
  const response = await fetch(`${API_URL}/trip-progress`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const saveTripTravel = async (data) => {
  const response = await fetch(`${API_URL}/trip-travel`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

export const getMyDelegations = async () => {
  const response = await fetch(`${API_URL}/my-delegations`, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

export const getDelegation = async (submissionId) => {
  const response = await fetch(`${API_URL}/delegations/${submissionId}`, {
    method: 'GET', headers: headers()
  });
  return response.json();
};

export const setDelegationLeader = async (submissionId, data) => {
  const response = await fetch(`${API_URL}/team-submissions/${submissionId}/leader`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data)
  });
  return response.json();
};

// ============================================================
// 20a. ВЛОЖЕНИЯ
// ============================================================
// owner_type: 'document' | 'appeal' | 'appeal_reply'
export const getAttachments = async (ownerType, ownerId) => {
  const response = await fetch(
    `${API_URL}/attachments?owner_type=${ownerType}&owner_id=${ownerId}`,
    { method: 'GET', headers: headers() }
  );
  if (!response.ok) return serverSaidNo(response, []);
  return response.json();
};

// Файл уходит сырыми байтами: base64 раздул бы его на треть,
// а имя и привязка едут в адресе запроса
export const uploadAttachment = async (ownerType, ownerId, file) => {
  const url = `${API_URL}/attachments?owner_type=${ownerType}&owner_id=${ownerId}`
    + `&name=${encodeURIComponent(file.name)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...(getToken() && { Authorization: `Bearer ${getToken()}` })
    },
    body: file
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(describeApiError(data) || 'Не удалось загрузить файл');
  return data;
};

export const deleteAttachment = async (id) => {
  const response = await fetch(`${API_URL}/attachments/${id}`, {
    method: 'DELETE', headers: headers()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(describeApiError(data) || 'Не удалось удалить файл');
  return data;
};

// Скачивание идёт с токеном, поэтому не простой ссылкой, а через blob
export const downloadAttachment = async (id, fileName) => {
  const response = await fetch(`${API_URL}/attachments/${id}/download`, {
    method: 'GET', headers: headers()
  });
  if (!response.ok) throw new Error('Не удалось скачать файл');
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName || 'файл';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

// ============================================================
// 20b. УПРАВЛЕНИЕ КЮДАМИ
// ============================================================
// Удаления нет: на клуб ссылаются участники, мероприятия и отчёты,
// поэтому клуб уходит в архив и пропадает из списков, а история остаётся.
export const createClub = async (data) => {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateClub = async (id, data) => {
  const response = await fetch(`${API_URL}/clubs/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const archiveClub = async (id, { force = false } = {}) => {
  const response = await fetch(`${API_URL}/clubs/${id}${force ? '?force=true' : ''}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

export const restoreClub = async (id) => {
  const response = await fetch(`${API_URL}/clubs/${id}/restore`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

// ============================================================
// 21d. ЗАНЯТИЯ КЛУБА И ПОСЕЩАЕМОСТЬ
// ============================================================
export const getClubSessions = async (clubId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/clubs/${clubId}/sessions${query ? '?' + query : ''}`;
  const response = await fetch(url, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, []);
  return toArray(await response.json());
};

export const createClubSession = async (clubId, data) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateSession = async (sessionId, data) => {
  const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteSession = async (sessionId) => {
  const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: headers()
  });
  return response.json();
};

// Возвращает весь состав клуба, а не только отмеченных: иначе
// новенького на экране отметки просто не будет видно.
export const getSessionAttendance = async (sessionId) => {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/attendance`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { session: null, attendance: [] });
  return response.json();
};

export const saveSessionAttendance = async (sessionId, attendance) => {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/attendance`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ attendance })
  });
  return response.json();
};

export const getParticipantAttendance = async (participantId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/participants/${participantId}/attendance${query ? '?' + query : ''}`;
  const response = await fetch(url, { method: 'GET', headers: headers() });
  if (!response.ok) return serverSaidNo(response, { sessions: [], summary: { held: 0, visited: 0, percentage: null } });
  return response.json();
};

// Заготовка отчёта: ничего не сохраняет, только считает по базе.
// Что писать в отчёте — решает человек, но вспоминать числа по памяти
// ему больше не нужно.
// Сводка «что сломается ближайшим, если не вмешаться».
export const getAttention = async () => {
  const response = await fetch(`${API_URL}/attention`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { sections: [], all_clear: false });
  return response.json();
};

export const getReportDraft = async (clubId, month) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/report-draft?month=${encodeURIComponent(month)}`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, null);
  return response.json();
};

export const getClubAttendanceSummary = async (clubId, month) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/attendance-summary?month=${encodeURIComponent(month)}`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, null);
  return response.json();
};

// ============================================================
// 21c. МАССОВАЯ ВЫДАЧА ВРЕМЕННЫХ ПАРОЛЕЙ
// ============================================================
// Пароли приходят в ответе один раз и нигде не сохраняются: в базе лежит
// только хеш. Экран сразу предлагает выгрузить их в файл.
export const issueCredentials = async (userIds) => {
  const response = await fetch(`${API_URL}/users/issue-credentials`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ user_ids: userIds })
  });
  return response.json();
};

// ============================================================
// 21b. ПРИГЛАШЕНИЯ РОДИТЕЛЕЙ
// ============================================================
// Пароль ребёнка в этих вызовах не участвует. Ссылку собираем из адреса,
// на котором открыт фронтенд, — сервер не знает, где он опубликован.
export const createParentInvitation = async (participantId) => {
  const response = await fetch(`${API_URL}/participants/${participantId}/parent-invitation`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

// Приглашения сразу по всему КЮДу: по одному на участника — это два
// десятка ссылок руками в каждом клубе.
export const createClubParentInvitations = async (clubId) => {
  const response = await fetch(`${API_URL}/clubs/${clubId}/parent-invitations`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

export const getParentInvitations = async (participantId) => {
  const response = await fetch(`${API_URL}/participants/${participantId}/parent-invitations`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { invitations: [], parents: [] });
  return response.json();
};

export const revokeParentInvitation = async (invitationId) => {
  const response = await fetch(`${API_URL}/parent-invitations/${invitationId}/revoke`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

// Код, который участник передаёт родителю голосом или в сообщении
export const createMyParentCode = async () => {
  const response = await fetch(`${API_URL}/my-parent-code`, {
    method: 'POST',
    headers: headers()
  });
  return response.json();
};

export const getMyParentCode = async () => {
  const response = await fetch(`${API_URL}/my-parent-code`, {
    method: 'GET',
    headers: headers()
  });
  if (!response.ok) return serverSaidNo(response, { active: null, parent_name: null });
  return response.json();
};

// Проверка приглашения до регистрации — без токена авторизации
export const checkParentInvitation = async (token) => {
  const response = await fetch(`${API_URL}/parent-invitations/check?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};

export const acceptParentInvitation = async (payload) => {
  const response = await fetch(`${API_URL}/parent-invitations/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  // Сервер сразу отдаёт токен — родителю не нужно входить повторно
  if (response.ok && data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
};

// Родитель уже в системе и добавляет второго ребёнка
export const claimParentInvitation = async (token) => {
  const response = await fetch(`${API_URL}/parent-invitations/claim`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ token })
  });
  return response.json();
};

// ============================================================
// 22. ДЕТИ РОДИТЕЛЯ
// ============================================================
export const getParentChildren = async (params = {}) => {
  const token = getToken();
  if (!token) return [];
  
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/parent-children?${query}` : `${API_URL}/parent-children`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers()
  });
  
  if (!response.ok) return serverSaidNo(response, []);
  
  return toArray(await response.json());
};

// ============================================================
// 23. АВАТАР
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
// ЭКСПОРТ
// ============================================================
const api = {
  // Разбор ошибок
  describeApiError,

  // Аутентификация
  login,
  logout,
  getMe,
  changePassword,
  
  // Пользователи
  getUsers,
  getParticipants,
  createUser,
  getClubEscorts,
  addClubEscort,
  removeClubEscort,

  getClubThreads,
  getClubThread,
  getClubRecipients,
  createClubThread,
  replyToClubThread,
  setClubThreadStatus,

  getUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  assignUserToClub,
  updateProfile,
  
  // Клубы
  getClubs,
  setClubPresident,
  getClubPresident,
  
  // Достижения
  getAchievements,
  addAchievement,
  deleteAchievement,
  getAchievementCategories,
  createAchievementCategory,
  updateAchievementCategory,
  deleteAchievementCategory,
  
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
  
  // Статистика
  getParticipantStats,
  getParticipantEvents,
  
  // Президент
  getPresidentTasks,
  createPresidentTask,
  respondToPresidentTask,
  
  // Тьюторы
  getTutorRequests,
  createTutorRequest,
  updateTutorRequest,
  getTutorAssignments,
  createTutorAssignment,
  deleteTutorAssignment,
  respondToAssignment,
  getTutorInvitations,
  createTutorInvitation,
  respondToTutorInvitation,
  cancelTutorInvitation,
  
  // Массовые уведомления
  getMassNotifications,
  createMassNotification,
  deleteMassNotification,
  
  // Цели и KPI
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  
  // Задачи
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  
  // Активность
  getActivityLog,
  
  // Сотрудники КЮДа
  getMyClubs,
  getStaffCandidates,
  search,
  getClubsHealth,
  getMovementYearly,
  getMovementStaff,
  getTripChecklist,
  addTripChecklistItem,
  removeTripChecklistItem,
  getMyTrips,
  setTripProgress,
  saveTripTravel,
  getMyDelegations,
  getDelegation,
  setDelegationLeader,
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
  getClubStaff,
  addClubStaff,
  updateClubStaff,
  removeClubStaff,
  transferClubHead,

  // Команды на форумы
  getMyClubInvitations,
  inviteClubsToEvent,
  createTeamSubmission,
  getTeamSubmission,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  submitTeam,
  reviewTeam,
  getEventTeams,
  getTeamMemberDocument,
  saveTeamMemberDocument,
  exportEventTeams,

  // Согласия
  getConsentsStats,
  getConsentsMissing,
  getConsentDocuments,
  getUserConsents,
  giveConsent,
  revokeConsent,
  remindAboutConsents,
  
  // Дети
  createClub,
  updateClub,
  archiveClub,
  restoreClub,
  getClubSessions,
  createClubSession,
  updateSession,
  deleteSession,
  getSessionAttendance,
  saveSessionAttendance,
  getParticipantAttendance,
  getClubAttendanceSummary,
  getReportDraft,
  getAttention,
  issueCredentials,
  createParentInvitation,
  createClubParentInvitations,
  getParentInvitations,
  revokeParentInvitation,
  createMyParentCode,
  getMyParentCode,
  checkParentInvitation,
  acceptParentInvitation,
  claimParentInvitation,
  getParentChildren,
  
  // Аватар
  uploadAvatar,
};

export default api;