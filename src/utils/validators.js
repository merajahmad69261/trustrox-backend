const Joi = require('joi');

// Regex rules
// Password: 8-16 chars, at least 1 uppercase, at least 1 special char
const passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;
const passwordMessage = 'Password must be 8-16 characters long, contain at least 1 uppercase letter and at least 1 special character.';

const nameSchema = Joi.string()
  .min(20)
  .max(60)
  .trim()
  .required()
  .messages({
    'string.min': 'Name must be at least 20 characters long.',
    'string.max': 'Name cannot exceed 60 characters.',
    'any.required': 'Name is required.',
  });

const addressSchema = Joi.string()
  .max(400)
  .trim()
  .required()
  .messages({
    'string.max': 'Address cannot exceed 400 characters.',
    'any.required': 'Address is required.',
  });

const emailSchema = Joi.string()
  .email()
  .trim()
  .lowercase()
  .required()
  .messages({
    'string.email': 'Must be a valid email address.',
    'any.required': 'Email is required.',
  });

const passwordSchema = Joi.string()
  .pattern(passwordPattern)
  .required()
  .messages({
    'string.pattern.base': passwordMessage,
    'any.required': 'Password is required.',
  });

// Schemas
const signupSchema = Joi.object({
  name: nameSchema,
  email: emailSchema,
  address: addressSchema,
  password: passwordSchema,
});

const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
});

const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': 'Current password is required.',
  }),
  newPassword: passwordSchema,
});

const addUserAdminSchema = Joi.object({
  name: nameSchema,
  email: emailSchema,
  address: addressSchema,
  password: passwordSchema,
  role: Joi.string().valid('admin', 'user', 'owner').required().messages({
    'any.only': 'Role must be one of: System Administrator (admin), Normal User (user), or Store Owner (owner).',
  }),
});

const addStoreSchema = Joi.object({
  name: nameSchema,
  email: emailSchema,
  address: addressSchema,
  ownerId: Joi.number().integer().optional().allow(null),
});

const submitRatingSchema = Joi.object({
  storeId: Joi.number().integer().required(),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1 star.',
    'number.max': 'Rating cannot exceed 5 stars.',
  }),
});

const updateRatingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1 star.',
    'number.max': 'Rating cannot exceed 5 stars.',
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
  updatePasswordSchema,
  addUserAdminSchema,
  addStoreSchema,
  submitRatingSchema,
  updateRatingSchema,
};
