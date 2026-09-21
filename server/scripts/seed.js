require('dotenv').config();
const mongoose = require('mongoose');

const Department = require('../models/Department');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const StudentCareCase = require('../models/StudentCareCase');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const departmentsData = [
  { name: 'Artificial Intelligence & Machine Learning', code: 'AI-ML' },
  { name: 'Computer Science & Engineering', code: 'CSE' },
  { name: 'Information Technology', code: 'IT' },
  { name: 'Electronics & Communication Engineering', code: 'ECE' },
  { name: 'Mechanical Engineering', code: 'ME' }
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/college_db';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Database connected. Purging existing collections...');

    // Drop current data
    await User.deleteMany({});
    await Faculty.deleteMany({});
    await Department.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await StudentCareCase.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});

    console.log('Inserting departments...');
    const insertedDepts = await Department.insertMany(departmentsData);
    const cse = insertedDepts.find(d => d.code === 'CSE');
    const it = insertedDepts.find(d => d.code === 'IT');
    const aiml = insertedDepts.find(d => d.code === 'AI-ML');
    console.log(`Seeded ${insertedDepts.length} departments.`);

    // 1. Create Admin
    console.log('Creating Admin user...');
    await User.create({
      name: 'System Admin',
      email: 'admin@rec.edu',
      passwordHash: 'Admin@1234',
      role: 'ADMIN',
      employeeId: 'EMP-ADM-01',
      phone: '9876543210',
      isActive: true,
    });

    // 2. Create Faculty users
    console.log('Creating Faculty users...');
    const faculty1 = await User.create({
      name: 'Dr. Ramesh Kumar',
      email: 'faculty@rec.edu',
      passwordHash: 'Faculty@1234',
      role: 'FACULTY',
      employeeId: 'EMP-FAC-01',
      departmentId: cse._id,
      designation: 'Associate Professor',
      phone: '9876543211',
      isActive: true,
    });

    const faculty2 = await User.create({
      name: 'Prof. Meena Suresh',
      email: 'faculty2@rec.edu',
      passwordHash: 'Faculty@1234',
      role: 'FACULTY',
      employeeId: 'EMP-FAC-02',
      departmentId: it._id,
      designation: 'Assistant Professor',
      phone: '9876543212',
      isActive: true,
    });

    // 3. Create Student Care Officer
    console.log('Creating Student Care Officer...');
    await User.create({
      name: 'Ms. Priya Nair',
      email: 'officer@rec.edu',
      passwordHash: 'Officer@1234',
      role: 'STUDENT_CARE_OFFICER',
      employeeId: 'EMP-SCO-01',
      departmentId: cse._id,
      designation: 'Student Care Officer',
      phone: '9876543213',
      isActive: true,
    });

    // 4. Create Students
    console.log('Creating Student users...');
    await User.create({
      name: 'Arjun Sharma',
      email: 'student@rec.edu',
      passwordHash: 'Student@1234',
      role: 'STUDENT',
      registerNumber: 'REG2021CSE001',
      departmentId: cse._id,
      yearOfStudy: '3rd Year',
      phone: '9876543214',
      isActive: true,
    });

    await User.create({
      name: 'Divya Krishnan',
      email: 'student2@rec.edu',
      passwordHash: 'Student@1234',
      role: 'STUDENT',
      registerNumber: 'REG2021AIML002',
      departmentId: aiml._id,
      yearOfStudy: '2nd Year',
      phone: '9876543215',
      isActive: true,
    });

    // 5. Create Faculty profiles
    console.log('Creating Faculty profiles...');
    await Faculty.create({
      userId: faculty1._id,
      employeeId: faculty1.employeeId,
      departmentId: cse._id,
      designation: 'Associate Professor',
      subjects: ['Data Structures', 'Algorithm Design', 'Database Management'],
      availability: 'Mon-Fri 9am-5pm'
    });

    await Faculty.create({
      userId: faculty2._id,
      employeeId: faculty2.employeeId,
      departmentId: it._id,
      designation: 'Assistant Professor',
      subjects: ['Web Technologies', 'Cloud Computing', 'Operating Systems'],
      availability: 'Mon-Fri 10am-4pm'
    });

    console.log('\n========================================');
    console.log('✅  DB SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\nTest Login Credentials:');
    console.log('  ADMIN   → admin@rec.edu       / Admin@1234');
    console.log('  FACULTY → faculty@rec.edu     / Faculty@1234');
    console.log('  OFFICER → officer@rec.edu     / Officer@1234');
    console.log('  STUDENT → student@rec.edu     / Student@1234');
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seed();
