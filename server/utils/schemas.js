const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'FACULTY', 'STUDENT_CARE_OFFICER', 'ADMIN']),
  registerNumber: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  profileImage: z.string().optional(),
  designation: z.string().optional(),
  yearOfStudy: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  registerNumber: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID').optional().nullable(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  profileImage: z.string().optional(),
  designation: z.string().optional(),
  yearOfStudy: z.string().optional()
});

const updateProfileSchema = z.object({
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  designation: z.string().optional(),
  yearOfStudy: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional()
});

const createFacultySchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID'),
  designation: z.string().min(1, 'Designation is required'),
  subjects: z.array(z.string()).optional(),
  availability: z.string().optional()
});

const updateFacultySchema = z.object({
  designation: z.string().min(1, 'Designation is required').optional(),
  subjects: z.array(z.string()).optional(),
  availability: z.string().optional(),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID').optional()
});

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  code: z.string().min(2, 'Department code must be at least 2 characters').toUpperCase()
});

const createAcademicConversationSchema = z.object({
  facultyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Faculty User ID')
});

const createMessageSchema = z.object({
  message: z.string().optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT'),
  attachments: z.array(z.object({
    url: z.string().url('Invalid attachment URL'),
    filename: z.string(),
    contentType: z.string(),
    size: z.number().positive()
  })).optional()
});

const createCaseSchema = z.object({
  category: z.enum([
    'Ragging',
    'Harassment',
    'Bullying',
    'Safety concerns',
    'Discrimination',
    'Personal concerns',
    'Academic grievance',
    'Other issues'
  ]),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number()
  })).optional()
});

const updateCaseSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  assignedOfficerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Officer ID').optional().nullable()
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  createFacultySchema,
  updateFacultySchema,
  createDepartmentSchema,
  createAcademicConversationSchema,
  createMessageSchema,
  createCaseSchema,
  updateCaseSchema,
  updateProfileSchema
};
