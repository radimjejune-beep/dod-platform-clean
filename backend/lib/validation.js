// backend/lib/validation.js

import Joi from 'joi';

// ============================================================
// СХЕМЫ ВАЛИДАЦИИ
// ============================================================

// 1. ПОЛЬЗОВАТЕЛЬ
export const userSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'ФИО обязательно',
    'string.min': 'ФИО должно содержать минимум 2 символа',
    'string.max': 'ФИО не может превышать 100 символов',
    'any.required': 'ФИО обязательно'
  }),
  email: Joi.string().email().max(100).messages({
    'string.email': 'Некорректный email',
    'string.max': 'Email не может превышать 100 символов'
  }),
  phone: Joi.string().pattern(/^[\+\d\s\-\(\)]{10,20}$/).allow('').messages({
    'string.pattern.base': 'Некорректный номер телефона'
  }),
  role: Joi.string().valid('participant', 'parent', 'club_coordinator', 'tutor', 'movement_coordinator', 'admin', 'president', 'vice_president'),
  school: Joi.string().max(200).allow(''),
  class_name: Joi.string().max(50).allow(''),
  birth_date: Joi.date().allow(null),
  city: Joi.string().max(100).allow(''),
  interests: Joi.string().max(500).allow(''),
  bio: Joi.string().max(1000).allow(''),
  skills: Joi.string().max(500).allow(''),
  education: Joi.string().max(500).allow(''),
  achievements: Joi.string().max(500).allow(''),
  social_links: Joi.string().max(500).allow(''),
  telegram: Joi.string().max(100).allow(''),
  vk: Joi.string().max(200).allow(''),
  parent_full_name: Joi.string().max(100).allow(''),
  parent_phone: Joi.string().pattern(/^[\+\d\s\-\(\)]{10,20}$/).allow(''),
  parent_email: Joi.string().email().max(100).allow(''),
  club_id: Joi.string().uuid().allow(null),
  status: Joi.string().valid('active', 'inactive', 'pending')
});

// 2. СОБЫТИЕ
export const eventSchema = Joi.object({
  title: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Название обязательно',
    'string.min': 'Название должно содержать минимум 3 символа',
    'string.max': 'Название не может превышать 200 символов',
    'any.required': 'Название обязательно'
  }),
  description: Joi.string().max(2000).allow(''),
  location: Joi.string().max(200).allow(''),
  event_date: Joi.date().required().messages({
    'date.base': 'Неверный формат даты',
    'any.required': 'Дата обязательна'
  }),
  end_date: Joi.date().allow(null),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  type: Joi.string().valid('internal', 'outgoing', 'global_forum').default('internal'),
  capacity: Joi.number().integer().min(1).default(20),
  club_id: Joi.string().uuid().allow(null),
  form_url: Joi.string().uri().max(500).allow('').messages({
    'string.uri': 'Неверный URL'
  }),
  is_global: Joi.boolean().default(false),
  is_club_event: Joi.boolean().default(false),
  registration_deadline: Joi.date().allow(null),
  max_participants: Joi.number().integer().min(0).default(0),
  target_clubs: Joi.array().items(Joi.string().uuid()).default([])
});

// 3. РЕГИСТРАЦИЯ НА МЕРОПРИЯТИЕ
export const registrationSchema = Joi.object({
  event_id: Joi.string().uuid().required().messages({
    'string.empty': 'event_id обязателен',
    'string.uuid': 'Некорректный event_id',
    'any.required': 'event_id обязателен'
  }),
  user_id: Joi.string().uuid().required()
});

// 4. ОТЧЁТ
export const reportSchema = Joi.object({
  club_id: Joi.string().uuid().required(),
  report_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required().messages({
    'string.pattern.base': 'Неверный формат месяца. Используйте YYYY-MM',
    'any.required': 'Месяц обязателен'
  }),
  report_text: Joi.string().max(5000).allow(''),
  events_count: Joi.number().integer().min(0).default(0),
  participants_count: Joi.number().integer().min(0).default(0)
});

// 5. ДОСТИЖЕНИЕ
export const achievementSchema = Joi.object({
  participant_id: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Название достижения обязательно',
    'string.min': 'Название должно содержать минимум 3 символа',
    'string.max': 'Название не может превышать 200 символов',
    'any.required': 'Название достижения обязательно'
  }),
  description: Joi.string().max(1000).allow(''),
  achievement_date: Joi.date().allow(null)
});

// 6. ОБРАЩЕНИЕ
export const appealSchema = Joi.object({
  subject: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Тема обращения обязательна',
    'string.min': 'Тема должна содержать минимум 3 символа',
    'string.max': 'Тема не может превышать 200 символов',
    'any.required': 'Тема обращения обязательна'
  }),
  message: Joi.string().min(10).max(5000).required().messages({
    'string.empty': 'Текст обращения обязателен',
    'string.min': 'Текст должен содержать минимум 10 символов',
    'string.max': 'Текст не может превышать 5000 символов',
    'any.required': 'Текст обращения обязателен'
  }),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
});

// 7. ДОКУМЕНТ
export const documentSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.string().max(5000).allow(''),
  category: Joi.string().valid('general', 'instructions', 'templates', 'orders', 'other').default('general'),
  document_type: Joi.string().valid('pdf', 'doc', 'docx', 'xlsx', 'other').default('pdf'),
  is_public: Joi.boolean().default(true),
  club_id: Joi.string().uuid().allow(null),
  tags: Joi.array().items(Joi.string()).default([])
});

// 8. НОВОСТЬ
export const newsSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.string().min(10).max(10000).required(),
  image_url: Joi.string().uri().max(500).allow('')
});

// 9. ЦЕЛЬ (KPI)
export const goalSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(1000).allow(''),
  category: Joi.string().valid('general', 'participants', 'events', 'clubs', 'achievements').default('general'),
  target_value: Joi.number().integer().min(0).required(),
  current_value: Joi.number().integer().min(0).default(0),
  unit: Joi.string().valid('participants', 'events', 'clubs', 'achievements', 'percent').default('participants'),
  status: Joi.string().valid('active', 'completed', 'archived').default('active'),
  start_date: Joi.date().allow(null),
  end_date: Joi.date().allow(null),
  assigned_to: Joi.string().uuid().allow(null),
  club_id: Joi.string().uuid().allow(null)
});

// 10. ЗАДАЧА
export const taskSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').default('pending'),
  due_date: Joi.date().allow(null),
  category: Joi.string().valid('general', 'reports', 'events', 'communications', 'administration').default('general'),
  assigned_to: Joi.string().uuid().allow(null),
  recurrence: Joi.string().valid('none', 'daily', 'weekly', 'monthly').default('none'),
  recurrence_end: Joi.date().allow(null)
});

// 11. ЗАДАНИЕ ПРЕЗИДЕНТА
export const presidentTaskSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  deadline: Joi.date().allow(null),
  club_id: Joi.string().uuid().allow(null),
  assigned_to: Joi.string().uuid().allow(null),
  is_global: Joi.boolean().default(false)
});

// 12. МАССОВОЕ УВЕДОМЛЕНИЕ
export const massNotificationSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  message: Joi.string().min(10).max(5000).required(),
  recipients: Joi.string().valid('all', 'participants', 'coordinators', 'tutors', 'admins').required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  scheduled_at: Joi.date().allow(null)
});

// ============================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ВАЛИДАЦИИ
// ============================================================
export const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return { error: true, errors, value };
  }

  return { error: false, value };
};

export default {
  userSchema,
  eventSchema,
  registrationSchema,
  reportSchema,
  achievementSchema,
  appealSchema,
  documentSchema,
  newsSchema,
  goalSchema,
  taskSchema,
  presidentTaskSchema,
  massNotificationSchema,
  validate
};