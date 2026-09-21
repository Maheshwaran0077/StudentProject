require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { app } = require('../server');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const StudentCareCase = require('../models/StudentCareCase');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretcollegecommunicationkey123456789!';

describe('Security & Authorization Integration Tests', () => {
  let studentA, studentB, faculty, admin, officer;
  let tokenStudentA, tokenStudentB, tokenFaculty, tokenAdmin;
  let conversationStudentA;
  let careCaseStudentA;

  beforeAll(async () => {
    // Connect to test database
    let testMongoUri = 'mongodb://localhost:27017/college_test';
    if (process.env.MONGO_URI) {
      testMongoUri = process.env.MONGO_URI.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, '/$1_test$2');
    }
    await mongoose.disconnect(); // disconnect first if already connected
    await mongoose.connect(testMongoUri);

    // Clear test collections
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await StudentCareCase.deleteMany({});

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Create seed users
    studentA = await User.create({
      name: 'Student A',
      email: 'studenta@college.edu',
      passwordHash,
      role: 'STUDENT',
      registerNumber: 'REG-TEST-0A',
      phone: '9000000001',
      isActive: true
    });

    studentB = await User.create({
      name: 'Student B',
      email: 'studentb@college.edu',
      passwordHash,
      role: 'STUDENT',
      registerNumber: 'REG-TEST-0B',
      phone: '9000000002',
      isActive: true
    });

    faculty = await User.create({
      name: 'Faculty X',
      email: 'facultyx@college.edu',
      passwordHash,
      role: 'FACULTY',
      employeeId: 'EMP-TEST-FX',
      phone: '9000000003',
      isActive: true
    });

    admin = await User.create({
      name: 'Admin User',
      email: 'admintest@college.edu',
      passwordHash,
      role: 'ADMIN',
      employeeId: 'EMP-TEST-AD',
      phone: '9000000004',
      isActive: true
    });

    officer = await User.create({
      name: 'Officer User',
      email: 'officertest@college.edu',
      passwordHash,
      role: 'STUDENT_CARE_OFFICER',
      employeeId: 'EMP-TEST-OC',
      phone: '9000000005',
      isActive: true
    });

    // Create JWT tokens
    tokenStudentA = jwt.sign({ id: studentA._id }, JWT_SECRET, { expiresIn: '1h' });
    tokenStudentB = jwt.sign({ id: studentB._id }, JWT_SECRET, { expiresIn: '1h' });
    tokenFaculty = jwt.sign({ id: faculty._id }, JWT_SECRET, { expiresIn: '1h' });
    tokenAdmin = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1h' });

    // Create Academic Conversation for Student A
    conversationStudentA = await Conversation.create({
      type: 'ACADEMIC',
      studentId: studentA._id,
      facultyId: faculty._id,
      status: 'IN_PROGRESS',
      lastMessage: 'Hi',
      lastMessageAt: new Date()
    });

    // Create Student Care Case for Student A
    const careConv = await Conversation.create({
      type: 'STUDENT_CARE',
      studentId: studentA._id,
      assignedOfficerId: officer._id,
      category: 'Ragging',
      subject: 'Bullying at canteen',
      status: 'PENDING',
      lastMessage: 'Please help',
      lastMessageAt: new Date()
    });

    careCaseStudentA = await StudentCareCase.create({
      conversationId: careConv._id,
      studentId: studentA._id,
      category: 'Ragging',
      priority: 'HIGH',
      status: 'PENDING',
      assignedOfficerId: officer._id
    });
  });

  afterAll(async () => {
    // Cleanup and close db connection
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await StudentCareCase.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Authentication Gates', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .expect(401);
      expect(res.body.status).toBe('fail');
    });

    it('should reject requests with invalid signature JWT token', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', 'Bearer invalid_signature_token')
        .expect(401);
      expect(res.body.status).toBe('fail');
    });

    it('should reject requests with expired token structures', async () => {
      const expiredToken = jwt.sign({ id: studentA._id }, JWT_SECRET, { expiresIn: '0s' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
      expect(res.body.message).toContain('expired');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should prevent student from accessing admin statistics endpoint', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${tokenStudentA}`)
        .expect(403);
      expect(res.body.message).toContain('permission');
    });

    it('should prevent student from creating another user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenStudentA}`)
        .send({
          name: 'Hacker',
          email: 'hack@college.edu',
          password: 'password123',
          role: 'ADMIN',
          phone: '9000000000'
        })
        .expect(403);
    });

    it('should allow admin to retrieve stats successfully', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Academic Conversation Security Isolation', () => {
    it('should prevent Student B from reading Student A academic conversation', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationStudentA._id}`)
        .set('Authorization', `Bearer ${tokenStudentB}`)
        .expect(403);
      expect(res.body.message).toContain('authorized');
    });

    it('should allow Student A to read their own academic conversation details', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationStudentA._id}`)
        .set('Authorization', `Bearer ${tokenStudentA}`)
        .expect(200);
      expect(res.body.status).toBe('success');
    });

    it('should allow assigned Faculty X to read Student A conversation details', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationStudentA._id}`)
        .set('Authorization', `Bearer ${tokenFaculty}`)
        .expect(200);
    });

    it('should prevent Faculty X from modifying or reading a conversation they are not assigned to', async () => {
      const studentBConv = await Conversation.create({
        type: 'ACADEMIC',
        studentId: studentB._id,
        facultyId: admin._id, // different faculty
        status: 'IN_PROGRESS',
        lastMessage: 'Yo',
        lastMessageAt: new Date()
      });

      await request(app)
        .get(`/api/conversations/${studentBConv._id}`)
        .set('Authorization', `Bearer ${tokenFaculty}`)
        .expect(403);
    });
  });

  describe('Student Care Cases Privacy Controls', () => {
    it('should block faculty members from listing Student Care Cases', async () => {
      const res = await request(app)
        .get('/api/student-care/cases')
        .set('Authorization', `Bearer ${tokenFaculty}`)
        .expect(403);
    });

    it('should block faculty members from getting details of a Student Care case', async () => {
      const res = await request(app)
        .get(`/api/student-care/cases/${careCaseStudentA._id}`)
        .set('Authorization', `Bearer ${tokenFaculty}`)
        .expect(403);
    });

    it('should prevent Student B from fetching Student A Student Care Case details', async () => {
      const res = await request(app)
        .get(`/api/student-care/cases/${careCaseStudentA._id}`)
        .set('Authorization', `Bearer ${tokenStudentB}`)
        .expect(403);
    });
  });
});
