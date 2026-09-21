const Faculty = require('../models/Faculty');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit.service');

const getFacultyList = async (req, res, next) => {
  try {
    const { departmentId, search } = req.query;

    const query = {};

    if (departmentId) {
      query.departmentId = departmentId;
    }

    // First find all active faculty users in the User collection
    const userQuery = { role: 'FACULTY', isActive: true };
    if (search) {
      userQuery.name = { $regex: search, $options: 'i' };
    }

    const activeFacultyUsers = await User.find(userQuery).select('_id');
    const activeFacultyUserIds = activeFacultyUsers.map(u => u._id);

    // Filter faculty records that belong to these active users
    query.userId = { $in: activeFacultyUserIds };

    const faculty = await Faculty.find(query)
      .populate('userId', 'name email phone profileImage isActive')
      .populate('departmentId', 'name code')
      .sort({ createdAt: 1 });

    res.status(200).json({
      status: 'success',
      results: faculty.length,
      data: {
        faculty
      }
    });
  } catch (error) {
    next(error);
  }
};

const getFacultyDetails = async (req, res, next) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.params.id })
      .populate('userId', 'name email phone profileImage isActive')
      .populate('departmentId', 'name code');

    if (!faculty) {
      // Fallback: check if we can query by faculty DB _id instead of userId
      const facultyByDbId = await Faculty.findById(req.params.id)
        .populate('userId', 'name email phone profileImage isActive')
        .populate('departmentId', 'name code');

      if (!facultyByDbId) {
        return next(new AppError('No faculty record found with that ID', 404));
      }

      return res.status(200).json({
        status: 'success',
        data: {
          faculty: facultyByDbId
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        faculty
      }
    });
  } catch (error) {
    next(error);
  }
};

const createFacultyMetadata = async (req, res, next) => {
  try {
    const { userId, employeeId, departmentId, designation, subjects, availability } = req.body;

    const existingFaculty = await Faculty.findOne({ $or: [{ userId }, { employeeId }] });
    if (existingFaculty) {
      return next(new AppError('Faculty record with this User ID or Employee ID already exists', 400));
    }

    const newFaculty = await Faculty.create({
      userId,
      employeeId,
      departmentId,
      designation,
      subjects: subjects || [],
      availability: availability || 'Available'
    });

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'CREATE_FACULTY_METADATA',
      resourceType: 'faculty',
      resourceId: newFaculty._id
    });

    res.status(201).json({
      status: 'success',
      data: {
        faculty: newFaculty
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateFacultyDetails = async (req, res, next) => {
  try {
    // A faculty member can only update their own profile, Admins can update any
    const isOwner = req.user.role === 'FACULTY' && req.user._id.toString() === req.params.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new AppError('You are not authorized to update this faculty profile', 403));
    }

    let faculty = await Faculty.findOne({ userId: req.params.id });
    if (!faculty) {
      faculty = await Faculty.findById(req.params.id);
      if (!faculty) {
        return next(new AppError('No faculty record found', 404));
      }
    }

    const { designation, subjects, availability, departmentId } = req.body;

    if (designation) faculty.designation = designation;
    if (subjects) faculty.subjects = subjects;
    if (availability) faculty.availability = availability;
    if (departmentId && isAdmin) {
      faculty.departmentId = departmentId;
      // sync to user table
      await User.findByIdAndUpdate(faculty.userId, { departmentId });
    }

    await faculty.save();

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'UPDATE_FACULTY_DETAILS',
      resourceType: 'faculty',
      resourceId: faculty._id
    });

    const populatedFaculty = await Faculty.findById(faculty._id)
      .populate('userId', 'name email phone profileImage isActive')
      .populate('departmentId', 'name code');

    res.status(200).json({
      status: 'success',
      data: {
        faculty: populatedFaculty
      }
    });
  } catch (error) {
    next(error);
  }
};

const toggleFacultyStatus = async (req, res, next) => {
  try {
    let faculty = await Faculty.findOne({ userId: req.params.id });
    if (!faculty) {
      faculty = await Faculty.findById(req.params.id);
      if (!faculty) {
        return next(new AppError('No faculty record found', 404));
      }
    }

    const user = await User.findById(faculty.userId);
    if (!user) {
      return next(new AppError('Linked user account not found', 404));
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: user.isActive ? 'ACTIVATE_FACULTY' : 'DEACTIVATE_FACULTY',
      resourceType: 'user',
      resourceId: user._id
    });

    res.status(200).json({
      status: 'success',
      data: {
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacultyList,
  getFacultyDetails,
  createFacultyMetadata,
  updateFacultyDetails,
  toggleFacultyStatus
};
