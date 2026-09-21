const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit.service');
const logger = require('../utils/logger');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretcollegecommunicationkey123456789!', {
    expiresIn: '24h'
  });
};

const sendTokenCookie = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax'
  };

  res.cookie('token', token, cookieOptions);

  // Remove password from output
  user.passwordHash = undefined;

  res.status(statusCode).json({
    status: 'success',
    token, // Send token in body as well for Socket handshake or authorization headers
    data: {
      user
    }
  });
};

const login = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Find user and request password explicitly
    const user = await User.findOne({ email }).select('+passwordHash').populate('departmentId');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account is inactive. Please contact your admin.', 403));
    }

    // 4) Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // 5) Log Audit action
    await auditService.logAction({
      req,
      userId: user._id,
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: user._id
    });

    // 6) Send token
    sendTokenCookie(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await auditService.logAction({
        req,
        userId: req.user._id,
        action: 'LOGOUT',
        resourceType: 'user',
        resourceId: req.user._id
      });
    }

    res.cookie('token', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      sameSite: 'lax'
    });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    // req.user is populated by authenticate middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    // Just re-issue token if the user is already authenticated
    sendTokenCookie(req.user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, registerNumber, employeeId, departmentId, phone, designation, yearOfStudy } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email is already registered', 400));
    }

    if (role === 'STUDENT' && !registerNumber) {
      return next(new AppError('Register number is required for students', 450));
    }
    if ((role === 'FACULTY' || role === 'STUDENT_CARE_OFFICER') && !employeeId) {
      return next(new AppError('Employee ID is required for faculty and officers', 450));
    }

    const newUser = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hashes it
      role,
      registerNumber: role === 'STUDENT' ? registerNumber : undefined,
      employeeId: role !== 'STUDENT' ? employeeId : undefined,
      departmentId: departmentId || undefined,
      designation: (role === 'FACULTY' || role === 'STUDENT_CARE_OFFICER') ? designation : undefined,
      yearOfStudy: role === 'STUDENT' ? yearOfStudy : undefined,
      phone,
      isActive: true
    });

    if (role === 'FACULTY') {
      await Faculty.create({
        userId: newUser._id,
        employeeId: newUser.employeeId,
        departmentId: newUser.departmentId,
        designation: newUser.designation || 'Assistant Professor',
        subjects: [],
        availability: 'Available during working hours'
      });
    }

    await auditService.logAction({
      req,
      userId: newUser._id,
      action: `USER_REGISTER_${role}`,
      resourceType: 'user',
      resourceId: newUser._id
    });

    newUser.passwordHash = undefined;

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! You can now log in.',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  refresh,
  register
};
