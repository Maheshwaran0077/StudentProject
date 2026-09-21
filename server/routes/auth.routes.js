const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validator');
const { loginSchema, createUserSchema } = require('../utils/schemas');

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/register', validate(createUserSchema), authController.register);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/refresh', authenticate, authController.refresh);

module.exports = router;
