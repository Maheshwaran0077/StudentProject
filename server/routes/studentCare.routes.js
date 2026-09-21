const express = require('express');
const studentCareController = require('../controllers/studentCare.controller');
const { authenticate, authorize, checkCaseAccess } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const validate = require('../middleware/validator');
const { createCaseSchema, updateCaseSchema } = require('../utils/schemas');

const router = express.Router();

router.use(authenticate);

// List/Create cases
router.get('/cases', studentCareController.getCases);
router.post('/cases', upload.array('attachments', 5), validate(createCaseSchema), studentCareController.createCase);

// Specific case management
router.get('/cases/:id', checkCaseAccess, studentCareController.getCaseDetails);
router.patch('/cases/:id', checkCaseAccess, validate(updateCaseSchema), studentCareController.updateCase);

// Specific case actions
router.post('/cases/:id/assign', checkCaseAccess, studentCareController.assignCase);
router.post('/cases/:id/escalate', checkCaseAccess, studentCareController.escalateCase);
router.post('/cases/:id/resolve', checkCaseAccess, studentCareController.resolveCase);

module.exports = router;
