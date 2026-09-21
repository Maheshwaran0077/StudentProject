const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const getMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Fetch messages sorted descending to get latest first, then we reverse for chat order
    const totalMessages = await Message.countDocuments({ conversationId });
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Reverse to chronological order (ascending)
    const chronologicalMessages = messages.reverse();

    res.status(200).json({
      status: 'success',
      page,
      pages: Math.ceil(totalMessages / limit),
      results: chronologicalMessages.length,
      total: totalMessages,
      data: {
        messages: chronologicalMessages
      }
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;
    const { message, messageType } = req.body;
    const sender = req.user;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found', 404));
    }

    // Process file uploads if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToCloudinary(file.buffer, file.originalname);
        attachments.push({
          url: uploadResult.url,
          filename: file.originalname,
          contentType: file.mimetype,
          size: file.size
        });
      }
    }

    // Ensure we have either text message or attachments
    if (!message && attachments.length === 0) {
      return next(new AppError('Cannot send empty message', 400));
    }

    // Create message
    const newMessage = await Message.create({
      conversationId,
      senderId: sender._id,
      senderRole: sender.role,
      message: message || '',
      messageType: attachments.length > 0 ? (messageType === 'IMAGE' || req.files[0].mimetype.startsWith('image/') ? 'IMAGE' : 'FILE') : 'TEXT',
      attachments,
      isRead: false
    });

    // Update conversation last message snippet
    let snippet = message || '';
    if (attachments.length > 0) {
      snippet = `Attachment: ${attachments[0].filename}`;
    }
    conversation.lastMessage = snippet;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Determine recipient
    let recipientId = null;
    let notifyTitle = 'New Message';
    let notifyMessage = `${sender.name}: ${snippet}`;

    if (sender.role === 'STUDENT') {
      if (conversation.type === 'ACADEMIC') {
        recipientId = conversation.facultyId;
        notifyTitle = `Academic message from ${sender.name}`;
      } else {
        // For Student Care, notify the assigned officer. If unassigned, notify all Student Care Officers
        recipientId = conversation.assignedOfficerId;
        notifyTitle = `Student Care case update: ${conversation.subject}`;
      }
    } else {
      // Sender is Faculty or Officer, notify the student
      recipientId = conversation.studentId;
      notifyTitle = conversation.type === 'ACADEMIC'
        ? `Academic response from ${sender.name}`
        : `Student Care response on case`;
    }

    // Save and send notifications
    if (recipientId) {
      // Single recipient notification
      const notification = await Notification.create({
        recipientId,
        type: 'CHAT_MESSAGE',
        title: notifyTitle,
        message: notifyMessage,
        conversationId: conversation._id,
        caseId: conversation.type === 'STUDENT_CARE' ? conversation._id : undefined
      });

      // Emit notification and message via socket
      const io = req.app.get('io');
      if (io) {
        // Emit to recipient's individual room
        io.to(`user:${recipientId}`).emit('new_notification', notification);
      }
    } else if (conversation.type === 'STUDENT_CARE' && !conversation.assignedOfficerId) {
      // Case is unassigned, notify all officers
      const officers = await User.find({ role: 'STUDENT_CARE_OFFICER', isActive: true });
      const io = req.app.get('io');

      for (const officer of officers) {
        const notification = await Notification.create({
          recipientId: officer._id,
          type: 'CHAT_MESSAGE',
          title: `New Student Care Case: ${conversation.subject}`,
          message: `New case submitted by ${sender.name}`,
          conversationId: conversation._id
        });

        if (io) {
          io.to(`user:${officer._id}`).emit('new_notification', notification);
        }
      }
    }

    // Broadcast message to conversation room
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('receive_message', newMessage);
    }

    res.status(201).json({
      status: 'success',
      data: {
        message: newMessage
      }
    });
  } catch (error) {
    next(error);
  }
};

const markMessagesAsRead = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;
    const user = req.user;

    // Update messages in this conversation where sender is NOT the current user
    const result = await Message.updateMany(
      { conversationId, senderId: { $ne: user._id }, isRead: false },
      { $set: { isRead: true } }
    );

    // Notify conversation room of read update
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        readBy: user._id
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        markedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesAsRead
};
