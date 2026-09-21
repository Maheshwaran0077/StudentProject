const Department = require('../models/Department');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit.service');

const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.status(200).json({
      status: 'success',
      results: departments.length,
      data: {
        departments
      }
    });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;

    const existingDept = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
    if (existingDept) {
      return next(new AppError('Department name or code already exists', 400));
    }

    const newDept = await Department.create({
      name,
      code: code.toUpperCase()
    });

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'CREATE_DEPARTMENT',
      resourceType: 'department',
      resourceId: newDept._id
    });

    res.status(201).json({
      status: 'success',
      data: {
        department: newDept
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }

    if (name) department.name = name;
    if (code) department.code = code.toUpperCase();

    await department.save();

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'UPDATE_DEPARTMENT',
      resourceType: 'department',
      resourceId: department._id
    });

    res.status(200).json({
      status: 'success',
      data: {
        department
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }

    // Check if department has users linked
    const usersCount = await User.countDocuments({ departmentId: department._id });
    if (usersCount > 0) {
      return next(new AppError('Cannot delete department because it has linked users. Reassign or disable users first.', 400));
    }

    await Department.findByIdAndDelete(department._id);

    await auditService.logAction({
      req,
      userId: req.user._id,
      action: 'DELETE_DEPARTMENT',
      resourceType: 'department',
      resourceId: department._id
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
