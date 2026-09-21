const express = require('express');
const messageController = require('../controllers/message.controller');
const { authenticate, checkConversationAccess } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.use(authenticate);

// Messages inside conversations
router.get('/conversations/:conversationId/messages', checkConversationAccess, messageController.getMessages);
router.post('/conversations/:conversationId/messages', checkConversationAccess, upload.array('attachments', 5), messageController.sendMessage);

// Message-level marking read
router.patch('/messages/:id/read', async (req, res, next) => {
  try {
    const Message = require('../models/Message');
    const Conversation = require('../models/Conversation');
    
    const message = await Message.findById(req.params.id);
    if (!message) {
      const AppError = require('../utils/AppError');
      return next(new AppError('Message not found', 404));
    }

    // Verify conversation access
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      const AppError = require('../utils/AppError');
      return next(new AppError('Parent conversation not found', 404));
    }

    // Access check based on role
    const user = req.user;
    if (user.role === 'STUDENT' && conversation.studentId.toString() !== user._id.toString()) {
      const AppError = require('../utils/AppError');
      return next(new AppError('Access denied', 403));
    }
    if (user.role === 'FACULTY' && conversation.facultyId.toString() !== user._id.toString()) {
      const AppError = require('../utils/AppError');
      return next(new AppError('Access denied', 403));
    }

    message.isRead = true;
    await message.save();

    // Socket notification
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversationId}`).emit('message_read', {
        messageId: message._id,
        conversationId: message.conversationId,
        readBy: user._id
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
