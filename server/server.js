// Reload nodemon to load updated environment variables
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const facultyRoutes = require('./routes/faculty.routes');
const departmentRoutes = require('./routes/department.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes = require('./routes/message.routes');
const studentCareRoutes = require('./routes/studentCare.routes');
const notificationRoutes = require('./routes/notification.routes');

// Import socket handler
const { initSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Save io reference to app to use in controllers
app.set('io', io);

// Connect to MongoDB Atlas (or local fallback)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// 1) Security Headers
app.use(helmet());

// 2) CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL || '').split(',')
]
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new AppError('Origin is not allowed by CORS', 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 3) Rate Limiting
app.use('/api/', apiLimiter);

// 4) Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Socket.IO handler
initSocket(io);

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check / Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'College Communication & Student Support System API is running'
  });
});

// Mount REST API routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api', messageRoutes); // Mapped at /api to support /api/conversations/:id/messages and /api/messages/:id/read
app.use('/api/student-care', studentCareRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch-all for unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized error handler middleware
app.use(globalErrorHandler);

// Start Server listener only if executed directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

module.exports = { app, server };
