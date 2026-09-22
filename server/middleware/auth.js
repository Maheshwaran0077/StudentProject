const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const StudentCareCase = require('../models/StudentCareCase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    let token;

    // 1) Read token from Authorization header first, then cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          acc[key] = value;
        }
        return acc;
      }, {});
      if (cookies.token && cookies.token !== 'loggedout') {
        token = cookies.token;
      }
    }

    if (!token || token === 'loggedout') {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretcollegecommunicationkey123456789!');
    } catch (err) {
      return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id).populate('departmentId');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4) Check if user is active
    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact an administrator.', 403));
    }

    // Grant access
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

const checkConversationAccess = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.id || req.body.conversationId;
    if (!conversationId) {
      return next(new AppError('Conversation ID is required', 400));
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found', 404));
    }

    const user = req.user;

    // Admin can access all conversations
    if (user.role === 'ADMIN') {
      req.conversation = conversation;
      return next();
    }

    // Student can only access their own conversations
    if (user.role === 'STUDENT') {
      if (conversation.studentId.toString() !== user._id.toString()) {
        return next(new AppError('You are not authorized to access this conversation', 403));
      }
      req.conversation = conversation;
      return next();
    }

    // Faculty can only access ACADEMIC conversations assigned to them
    if (user.role === 'FACULTY') {
      if (conversation.type !== 'ACADEMIC') {
        return next(new AppError('Faculty is not authorized to access Student Care cases', 403));
      }
      if (conversation.facultyId.toString() !== user._id.toString()) {
        return next(new AppError('You are not authorized to access this conversation', 403));
      }
      req.conversation = conversation;
      return next();
    }

    // Student Care Officer can only access STUDENT_CARE conversations
    if (user.role === 'STUDENT_CARE_OFFICER') {
      if (conversation.type !== 'STUDENT_CARE') {
        return next(new AppError('Student Care Officers can only access Student Care conversations', 403));
      }
      req.conversation = conversation;
      return next();
    }

    return next(new AppError('You are not authorized to access this conversation', 403));
  } catch (error) {
    next(error);
  }
};

const checkCaseAccess = async (req, res, next) => {
  try {
    const caseId = req.params.id || req.body.caseId;
    if (!caseId) {
      return next(new AppError('Case ID is required', 400));
    }

    const sCase = await StudentCareCase.findById(caseId);
    if (!sCase) {
      return next(new AppError('Student Care case not found', 404));
    }

    const user = req.user;

    // Admin can access all cases
    if (user.role === 'ADMIN') {
      req.case = sCase;
      return next();
    }

    // Student can only access their own cases
    if (user.role === 'STUDENT') {
      if (sCase.studentId.toString() !== user._id.toString()) {
        return next(new AppError('You are not authorized to access this case', 403));
      }
      req.case = sCase;
      return next();
    }

    // Student Care Officer can access any case
    if (user.role === 'STUDENT_CARE_OFFICER') {
      req.case = sCase;
      return next();
    }

    // Faculty are blocked
    return next(new AppError('Faculty members are not authorized to access Student Care cases', 403));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  checkConversationAccess,
  checkCaseAccess
};
