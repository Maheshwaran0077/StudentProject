const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { createUserSchema, updateUserSchema, updateProfileSchema } = require('../utils/schemas');

const router = express.Router();

router.use(authenticate);

// Self profile update
router.patch('/profile', validate(updateProfileSchema), userController.updateMe);

// Admin-only routes
router.get('/', authorize('ADMIN'), userController.getUsers);
router.post('/', authorize('ADMIN'), validate(createUserSchema), userController.createUser);
router.get('/stats', authorize('ADMIN'), userController.getSystemStats);
router.get('/audit', authorize('ADMIN'), userController.getAuditLogs);
router.put('/:id', authorize('ADMIN'), validate(updateUserSchema), userController.updateUser);
router.patch('/:id/status', authorize('ADMIN'), userController.toggleUserStatus);

// Self/Shared details route
router.get('/:id', userController.getUser);

module.exports = router;
