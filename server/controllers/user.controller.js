const User = require('../models/User');
const Faculty = require('../models/Faculty');
const StudentCareCase = require('../models/StudentCareCase');
const Conversation = require('../models/Conversation');
const AuditLog = require('../models/AuditLog');
const Department = require('../models/Department');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit.service');

const getUsers = async (req, res, next) => {
  try {
    const { role, departmentId, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (departmentId) query.departmentId = departmentId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).populate('departmentId', 'name code').sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('departmentId', 'name code');
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    let facultyDetails = null;
    if (user.role === 'FACULTY') {
      facultyDetails = await Faculty.findOne({ userId: user._id });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        facultyDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, registerNumber, employeeId, departmentId, phone, profileImage } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email is already registered', 400));
    }

    if (role === 'STUDENT' && !registerNumber) {
      return next(new AppError('Register number is required for students', 400));
    }
    if ((role === 'FACULTY' || role === 'STUDENT_CARE_OFFICER') && !employeeId) {
      return next(new AppError('Employee ID is required for faculty and officers', 400));
    }

    const newUser = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook will hash it
      role,
      registerNumber: role === 'STUDENT' ? registerNumber : undefined,
      employeeId: role !== 'STUDENT' ? employeeId : undefined,
      departmentId: departmentId || undefined,
      phone,
      profileImage: profileImage || '',
      isActive: true
    });

    // If role is FACULTY, automatically create an empty Faculty record
    if (role === 'FACULTY') {
      await Faculty.create({
        userId: newUser._id,
        employeeId: newUser.employeeId,
        departmentId: newUser.departmentId,
        designation: 'Lecturer', // Default designation
        subjects: [],
        availability: 'Available during working hours'
      });
    }

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: `CREATE_USER_${role}`,
      resourceType: 'user',
      resourceId: newUser._id
    });

    newUser.passwordHash = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    const updates = req.body;

    // Remove password updates from here for safety
    delete updates.password;
    delete updates.passwordHash;
    delete updates.role; // Role cannot be changed on user update directly

    Object.assign(user, updates);
    await user.save();

    // If departmentId is updated on Faculty User, sync it to Faculty model
    if (user.role === 'FACULTY' && updates.departmentId) {
      await Faculty.findOneAndUpdate(
        { userId: user._id },
        { departmentId: updates.departmentId }
      );
    }

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'UPDATE_USER',
      resourceType: 'user',
      resourceId: user._id
    });

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('You cannot deactivate your own admin account', 400));
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      resourceType: 'user',
      resourceId: user._id
    });

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSystemStats = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'STUDENT' });
    const totalFaculty = await User.countDocuments({ role: 'FACULTY' });
    const totalOfficers = await User.countDocuments({ role: 'STUDENT_CARE_OFFICER' });
    const totalDepartments = await Department.countDocuments({});

    const totalCases = await StudentCareCase.countDocuments({});
    const pendingCases = await StudentCareCase.countDocuments({ status: 'PENDING' });
    const activeCases = await StudentCareCase.countDocuments({ status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } });
    const escalatedCases = await StudentCareCase.countDocuments({ status: 'ESCALATED' });
    const resolvedCases = await StudentCareCase.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] } });

    const totalConversations = await Conversation.countDocuments({ type: 'ACADEMIC' });

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          students: totalStudents,
          faculty: totalFaculty,
          officers: totalOfficers,
          departments: totalDepartments
        },
        cases: {
          total: totalCases,
          pending: pendingCases,
          active: activeCases,
          escalated: escalatedCases,
          resolved: resolvedCases
        },
        academicConversationsCount: totalConversations
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const totalLogs = await AuditLog.countDocuments({});
    const logs = await AuditLog.find({})
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 'success',
      page,
      pages: Math.ceil(totalLogs / limit),
      results: logs.length,
      total: totalLogs,
      data: {
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    const { currentPassword, newPassword, phone, designation, yearOfStudy } = req.body;

    // 1) Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return next(new AppError('Please provide your current password to change it', 400));
      }

      const userWithPassword = await User.findById(req.user._id).select('+passwordHash');
      if (!(await userWithPassword.comparePassword(currentPassword))) {
        return next(new AppError('Incorrect current password', 401));
      }

      user.passwordHash = newPassword; // pre-save hook will hash it
    }

    // 2) Update phone
    if (phone !== undefined) {
      user.phone = phone;
    }

    // 3) Update Student specific fields
    if (user.role === 'STUDENT') {
      if (yearOfStudy !== undefined) {
        user.yearOfStudy = yearOfStudy;
      }
    }

    // 4) Update Faculty & SCO specific fields
    if (user.role === 'FACULTY' || user.role === 'STUDENT_CARE_OFFICER') {
      if (designation !== undefined) {
        user.designation = designation;

        // If user is Faculty, sync with secondary Faculty model as well
        if (user.role === 'FACULTY') {
          await Faculty.findOneAndUpdate(
            { userId: user._id },
            { designation }
          );
        }
      }
    }

    await user.save();

    await auditService.logAction({
      req,
      userId: user._id,
      action: 'UPDATE_PROFILE',
      resourceType: 'user',
      resourceId: user._id
    });

    user.passwordHash = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserStatus,
  getSystemStats,
  getAuditLogs,
  updateMe
};
