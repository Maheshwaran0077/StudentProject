const express = require('express');
const facultyController = require('../controllers/faculty.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { createFacultySchema, updateFacultySchema } = require('../utils/schemas');

const router = express.Router();

router.use(authenticate);

// List faculty (Student/All)
router.get('/', facultyController.getFacultyList);
router.get('/:id', facultyController.getFacultyDetails);

// Modify faculty profiles (Admin or Faculty owner)
router.put('/:id', validate(updateFacultySchema), facultyController.updateFacultyDetails);

// Admin-only actions
router.post('/', authorize('ADMIN'), validate(createFacultySchema), facultyController.createFacultyMetadata);
router.patch('/:id/status', authorize('ADMIN'), facultyController.toggleFacultyStatus);

module.exports = router;
