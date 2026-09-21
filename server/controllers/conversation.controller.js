const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit.service');

const createAcademicConversation = async (req, res, next) => {
  try {
    const { facultyId } = req.body;
    const studentId = req.user._id;

    if (req.user.role !== 'STUDENT') {
      return next(new AppError('Only students can initiate academic conversations with faculty', 403));
    }

    // Verify faculty exists and has FACULTY role
    const facultyUser = await User.findOne({ _id: facultyId, role: 'FACULTY', isActive: true });
    if (!facultyUser) {
      return next(new AppError('Selected faculty member not found or inactive', 404));
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      type: 'ACADEMIC',
      studentId,
      facultyId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'ACADEMIC',
        studentId,
        facultyId,
        status: 'IN_PROGRESS',
        lastMessage: 'Conversation initiated',
        lastMessageAt: new Date()
      });

      await auditService.logAction({
        req,
        userId: req.user._id,
        action: 'INITIATE_ACADEMIC_CHAT',
        resourceType: 'conversation',
        resourceId: conversation._id
      });
    }

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('studentId', 'name email profileImage phone')
      .populate('facultyId', 'name email profileImage phone');

    res.status(201).json({
      status: 'success',
      data: {
        conversation: populatedConversation
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAcademicConversations = async (req, res, next) => {
  try {
    const user = req.user;
    let query = { type: 'ACADEMIC' };

    if (user.role === 'STUDENT') {
      query.studentId = user._id;
    } else if (user.role === 'FACULTY') {
      query.facultyId = user._id;
    } else if (user.role !== 'ADMIN') {
      // Officers or unprivileged accounts cannot query academic chats
      return next(new AppError('Access denied', 403));
    }

    const conversations = await Conversation.find(query)
      .populate('studentId', 'name email profileImage registerNumber phone')
      .populate('facultyId', 'name email profileImage employeeId phone')
      .sort({ lastMessageAt: -1 });

    res.status(200).json({
      status: 'success',
      results: conversations.length,
      data: {
        conversations
      }
    });
  } catch (error) {
    next(error);
  }
};

const getConversationDetails = async (req, res, next) => {
  try {
    // req.conversation is populated by checkConversationAccess middleware
    const conversation = await Conversation.findById(req.conversation._id)
      .populate('studentId', 'name email role profileImage registerNumber phone')
      .populate('facultyId', 'name email role profileImage employeeId phone')
      .populate('assignedOfficerId', 'name email role profileImage employeeId phone');

    res.status(200).json({
      status: 'success',
      data: {
        conversation
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateConversationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const conversation = req.conversation; // from checkConversationAccess

    if (!['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return next(new AppError('Invalid status update for Academic chat', 400));
    }

    const oldStatus = conversation.status;
    conversation.status = status;
    await conversation.save();

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: `CONVERSATION_STATUS_${status}`,
      resourceType: 'conversation',
      resourceId: conversation._id
    });

    // Notify the other party about status change
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversation._id}`).emit('conversation_status_changed', {
        conversationId: conversation._id,
        status,
        updatedBy: req.user._id
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        conversation
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAcademicConversation,
  getAcademicConversations,
  getConversationDetails,
  updateConversationStatus
};
