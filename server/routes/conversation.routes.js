const express = require('express');
const conversationController = require('../controllers/conversation.controller');
const { authenticate, checkConversationAccess } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { createAcademicConversationSchema } = require('../utils/schemas');

const router = express.Router();

router.use(authenticate);

// Academic conversations endpoints
router.post('/academic', validate(createAcademicConversationSchema), conversationController.createAcademicConversation);
router.get('/academic', conversationController.getAcademicConversations);

// General conversation retrieval and status updates
router.get('/:id', checkConversationAccess, conversationController.getConversationDetails);
router.patch('/:id/status', checkConversationAccess, conversationController.updateConversationStatus);

module.exports = router;
