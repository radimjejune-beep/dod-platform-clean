// backend/middleware/validate.js

import { validate } from '../lib/validation.js';

export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, errors, value } = validate(schema, req.body);

    if (error) {
      return res.status(400).json({
        error: 'Ошибка валидации данных',
        details: errors
      });
    }

    req.validatedBody = value;
    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, errors, value } = validate(schema, req.params);

    if (error) {
      return res.status(400).json({
        error: 'Ошибка валидации параметров',
        details: errors
      });
    }

    req.validatedParams = value;
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, errors, value } = validate(schema, req.query);

    if (error) {
      return res.status(400).json({
        error: 'Ошибка валидации параметров запроса',
        details: errors
      });
    }

    req.validatedQuery = value;
    next();
  };
};