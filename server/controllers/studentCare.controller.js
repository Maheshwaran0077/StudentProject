const StudentCareCase = require('../models/StudentCareCase');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit.service');

const createCase = async (req, res, next) => {
  try {
    const { category, subject, priority, description } = req.body;
    const studentId = req.user._id;

    if (req.user.role !== 'STUDENT') {
      return next(new AppError('Only students can create student care cases', 403));
    }

    // Upload files if any
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

    // 1. Create the associated Conversation
    const conversation = await Conversation.create({
      type: 'STUDENT_CARE',
      studentId,
      category,
      subject,
      status: 'PENDING',
      priority,
      lastMessage: description,
      lastMessageAt: new Date()
    });

    // 2. Create the StudentCareCase
    const newCase = await StudentCareCase.create({
      conversationId: conversation._id,
      studentId,
      category,
      priority,
      status: 'PENDING'
    });

    // 3. Create the initial student message containing description and attachments
    await Message.create({
      conversationId: conversation._id,
      senderId: studentId,
      senderRole: 'STUDENT',
      message: description,
      messageType: attachments.length > 0 ? 'FILE' : 'TEXT',
      attachments,
      isRead: false
    });

    // 4. Create system message in chat
    await Message.create({
      conversationId: conversation._id,
      senderId: studentId, // system message logged under sender or admin
      senderRole: 'STUDENT',
      message: `System: Case created with ID ${newCase.caseNumber}. Status: PENDING.`,
      messageType: 'SYSTEM'
    });

    await auditService.logAction({
      req,
      userId: studentId,
      action: 'CREATE_STUDENT_CARE_CASE',
      resourceType: 'studentCareCase',
      resourceId: newCase._id
    });

    // 5. Notify all Student Care Officers
    const officers = await User.find({ role: 'STUDENT_CARE_OFFICER', isActive: true });
    const io = req.app.get('io');
    
    for (const officer of officers) {
      const notification = await Notification.create({
        recipientId: officer._id,
        type: 'CASE_UPDATE',
        title: `New Case Submitted: ${newCase.caseNumber}`,
        message: `Category: ${category} - Subject: ${subject}`,
        conversationId: conversation._id,
        caseId: newCase._id
      });

      if (io) {
        io.to(`user:${officer._id}`).emit('new_notification', notification);
      }
    }

    res.status(201).json({
      status: 'success',
      data: {
        case: newCase,
        conversationId: conversation._id
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCases = async (req, res, next) => {
  try {
    const user = req.user;
    const query = {};

    if (user.role === 'STUDENT') {
      query.studentId = user._id;
    } else if (user.role === 'STUDENT_CARE_OFFICER') {
      const { category, priority, status, assignedOfficerId, search } = req.query;

      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (status) query.status = status;
      if (assignedOfficerId) {
        query.assignedOfficerId = assignedOfficerId === 'null' ? null : assignedOfficerId;
      }

      if (search) {
        // Try searching student name or caseNumber
        const studentUsers = await User.find({
          role: 'STUDENT',
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { registerNumber: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const studentIds = studentUsers.map(u => u._id);

        query.$or = [
          { caseNumber: { $regex: search, $options: 'i' } },
          { studentId: { $in: studentIds } }
        ];
      }
    } else if (user.role !== 'ADMIN') {
      return next(new AppError('Access denied', 403));
    }

    const cases = await StudentCareCase.find(query)
      .populate('studentId', 'name email profileImage registerNumber phone departmentId')
      .populate('assignedOfficerId', 'name email profileImage employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: cases.length,
      data: {
        cases
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCaseDetails = async (req, res, next) => {
  try {
    const sCase = await StudentCareCase.findById(req.params.id)
      .populate('studentId', 'name email profileImage registerNumber phone departmentId')
      .populate('assignedOfficerId', 'name email profileImage employeeId');

    if (!sCase) {
      return next(new AppError('Student Care case not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        case: sCase
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateCase = async (req, res, next) => {
  try {
    const { priority, status } = req.body;
    const sCase = req.case; // populated by checkCaseAccess

    if (priority) sCase.priority = priority;
    
    if (status && status !== sCase.status) {
      const oldStatus = sCase.status;
      sCase.status = status;

      // Update resolution date
      if (['RESOLVED', 'CLOSED'].includes(status)) {
        sCase.resolvedAt = new Date();
      }

      // Sync status to associated conversation
      await Conversation.findByIdAndUpdate(sCase.conversationId, { status, priority: sCase.priority });

      // Create a system message in conversation timeline
      await Message.create({
        conversationId: sCase.conversationId,
        senderId: req.user._id,
        senderRole: req.user.role,
        message: `System: Case status updated from ${oldStatus} to ${status}.`,
        messageType: 'SYSTEM'
      });

      // Write audit log
      await auditService.logAction({
        req,
        userId: req.user._id,
        action: `UPDATE_CASE_STATUS_${status}`,
        resourceType: 'studentCareCase',
        resourceId: sCase._id
      });

      // Notify Student
      const notification = await Notification.create({
        recipientId: sCase.studentId,
        type: 'CASE_UPDATE',
        title: `Case status update: ${sCase.caseNumber}`,
        message: `Your case status has been changed to ${status}.`,
        conversationId: sCase.conversationId,
        caseId: sCase._id
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${sCase.studentId}`).emit('new_notification', notification);
        io.to(`conversation:${sCase.conversationId}`).emit('conversation_status_changed', {
          conversationId: sCase.conversationId,
          status,
          updatedBy: req.user._id
        });
      }
    } else if (priority) {
      await Conversation.findByIdAndUpdate(sCase.conversationId, { priority: sCase.priority });
    }

    await sCase.save();

    res.status(200).json({
      status: 'success',
      data: {
        case: sCase
      }
    });
  } catch (error) {
    next(error);
  }
};

const assignCase = async (req, res, next) => {
  try {
    const sCase = req.case; // populated by checkCaseAccess
    const { officerId } = req.body;

    const officer = await User.findOne({ _id: officerId, role: 'STUDENT_CARE_OFFICER', isActive: true });
    if (!officer) {
      return next(new AppError('Target Student Care Officer is not found or inactive', 404));
    }

    const previousOfficerId = sCase.assignedOfficerId;
    sCase.assignedOfficerId = officer._id;

    // Automatically transition PENDING -> ASSIGNED
    if (sCase.status === 'PENDING') {
      sCase.status = 'ASSIGNED';
    }

    await sCase.save();

    // Sync to conversation
    await Conversation.findByIdAndUpdate(sCase.conversationId, {
      assignedOfficerId: officer._id,
      status: sCase.status
    });

    // Create system message
    await Message.create({
      conversationId: sCase.conversationId,
      senderId: req.user._id,
      senderRole: req.user.role,
      message: `System: Case assigned to Officer ${officer.name}.`,
      messageType: 'SYSTEM'
    });

    // Write audit logs
    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'ASSIGN_CASE',
      resourceType: 'studentCareCase',
      resourceId: sCase._id
    });

    // Notify Student
    const studentNotification = await Notification.create({
      recipientId: sCase.studentId,
      type: 'CASE_UPDATE',
      title: `Officer Assigned to Case ${sCase.caseNumber}`,
      message: `Officer ${officer.name} is now handling your case.`,
      conversationId: sCase.conversationId,
      caseId: sCase._id
    });

    // Notify Assigned Officer (if assigned by someone else)
    let officerNotification = null;
    if (req.user._id.toString() !== officer._id.toString()) {
      officerNotification = await Notification.create({
        recipientId: officer._id,
        type: 'CASE_ASSIGNMENT',
        title: `Case Assigned: ${sCase.caseNumber}`,
        message: `You have been assigned to case ${sCase.caseNumber} by ${req.user.name}`,
        conversationId: sCase.conversationId,
        caseId: sCase._id
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${sCase.studentId}`).emit('new_notification', studentNotification);
      if (officerNotification) {
        io.to(`user:${officer._id}`).emit('new_notification', officerNotification);
      }
      io.to(`conversation:${sCase.conversationId}`).emit('case_assigned', {
        caseId: sCase._id,
        assignedOfficerId: officer._id,
        assignedOfficerName: officer.name
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        case: sCase
      }
    });
  } catch (error) {
    next(error);
  }
};

const escalateCase = async (req, res, next) => {
  try {
    const sCase = req.case; // populated by checkCaseAccess

    sCase.status = 'ESCALATED';
    sCase.priority = 'CRITICAL';
    sCase.escalationLevel = (sCase.escalationLevel || 0) + 1;
    await sCase.save();

    // Sync to conversation
    await Conversation.findByIdAndUpdate(sCase.conversationId, {
      status: 'ESCALATED',
      priority: 'CRITICAL'
    });

    // Create system message
    await Message.create({
      conversationId: sCase.conversationId,
      senderId: req.user._id,
      senderRole: req.user.role,
      message: `System: Case escalated to Level ${sCase.escalationLevel}. Priority bumped to CRITICAL.`,
      messageType: 'SYSTEM'
    });

    // Write audit logs
    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'ESCALATE_CASE',
      resourceType: 'studentCareCase',
      resourceId: sCase._id
    });

    // Notify Student
    const studentNotification = await Notification.create({
      recipientId: sCase.studentId,
      type: 'CASE_UPDATE',
      title: `Case Escalated: ${sCase.caseNumber}`,
      message: `Your case has been escalated to Level ${sCase.escalationLevel}.`,
      conversationId: sCase.conversationId,
      caseId: sCase._id
    });

    // Notify all officers of escalated critical status
    const officers = await User.find({ role: 'STUDENT_CARE_OFFICER', isActive: true });
    const io = req.app.get('io');
    for (const officer of officers) {
      const officerNotification = await Notification.create({
        recipientId: officer._id,
        type: 'CASE_UPDATE',
        title: `🚨 CRITICAL ESCALATION: ${sCase.caseNumber}`,
        message: `Case escalated by ${req.user.name} to Level ${sCase.escalationLevel}`,
        conversationId: sCase.conversationId,
        caseId: sCase._id
      });
      if (io) {
        io.to(`user:${officer._id}`).emit('new_notification', officerNotification);
      }
    }

    if (io) {
      io.to(`user:${sCase.studentId}`).emit('new_notification', studentNotification);
      io.to(`conversation:${sCase.conversationId}`).emit('conversation_status_changed', {
        conversationId: sCase.conversationId,
        status: 'ESCALATED',
        priority: 'CRITICAL',
        updatedBy: req.user._id
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        case: sCase
      }
    });
  } catch (error) {
    next(error);
  }
};

const resolveCase = async (req, res, next) => {
  try {
    const sCase = req.case; // populated by checkCaseAccess

    sCase.status = 'RESOLVED';
    sCase.resolvedAt = new Date();
    await sCase.save();

    // Sync to conversation
    await Conversation.findByIdAndUpdate(sCase.conversationId, {
      status: 'RESOLVED'
    });

    // Create system message
    await Message.create({
      conversationId: sCase.conversationId,
      senderId: req.user._id,
      senderRole: req.user.role,
      message: `System: Case marked as RESOLVED by ${req.user.name}.`,
      messageType: 'SYSTEM'
    });

    // Write audit logs
    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'RESOLVE_CASE',
      resourceType: 'studentCareCase',
      resourceId: sCase._id
    });

    // Notify Student
    const studentNotification = await Notification.create({
      recipientId: sCase.studentId,
      type: 'CASE_UPDATE',
      title: `Case Resolved: ${sCase.caseNumber}`,
      message: `Your case has been marked as resolved.`,
      conversationId: sCase.conversationId,
      caseId: sCase._id
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${sCase.studentId}`).emit('new_notification', studentNotification);
      io.to(`conversation:${sCase.conversationId}`).emit('conversation_status_changed', {
        conversationId: sCase.conversationId,
        status: 'RESOLVED',
        updatedBy: req.user._id
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        case: sCase
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCase,
  getCases,
  getCaseDetails,
  updateCase,
  assignCase,
  escalateCase,
  resolveCase
};
