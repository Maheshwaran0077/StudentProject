const express = require('express');
const departmentController = require('../controllers/department.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { createDepartmentSchema } = require('../utils/schemas');

const router = express.Router();

// Public list of departments (used on registration page)
router.get('/', departmentController.getDepartments);

// Admin-only management
router.use(authenticate);

// Admin-only management
router.post('/', authorize('ADMIN'), validate(createDepartmentSchema), departmentController.createDepartment);
router.put('/:id', authorize('ADMIN'), validate(createDepartmentSchema), departmentController.updateDepartment);
router.delete('/:id', authorize('ADMIN'), departmentController.deleteDepartment);

module.exports = router;
