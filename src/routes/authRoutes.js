const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { signupSchema, loginSchema, updatePasswordSchema } = require('../utils/validators');

// Public endpoints
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);

// Authenticated endpoint (Normal Users, Store Owners, Admin)
router.patch('/update-password', authenticateToken, validate(updatePasswordSchema), authController.updatePassword);

module.exports = router;
