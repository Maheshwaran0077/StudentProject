const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Map of userId -> Set of socketId (handles multiple tabs)
const onlineUsers = new Map();

const initSocket = (io) => {
  // Middleware to authenticate socket connection
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token || socket.handshake.query.token;

      // Extract token from Cookie if present in handshakes
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
          const parts = cookie.split('=');
          if (parts.length >= 2) {
            acc[parts[0].trim()] = parts.slice(1).join('=').trim();
          }
          return acc;
        }, {});
        token = cookies.token;
      }

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretcollegecommunicationkey123456789!');
      const user = await User.findById(decoded.id).select('_id role name isActive');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Authentication error: User deactivated'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.error(`Socket auth failure: ${err.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    logger.debug(`Socket connected: ${socket.id} (User: ${socket.user.name}, Role: ${socket.user.role})`);

    // 1. Join user individual room to receive individual notifications
    socket.join(`user:${userId}`);

    // 2. Manage online state
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // If first socket connection, broadcast user is online
    if (onlineUsers.get(userId).size === 1) {
      io.emit('user_online', { userId });
    }

    // Return list of currently online users to the newly connected client
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));

    // 3. Conversation Rooms
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        logger.debug(`Socket ${socket.id} joined conversation:${conversationId}`);
      }
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        logger.debug(`Socket ${socket.id} left conversation:${conversationId}`);
      }
    });

    // 4. Typing Indicators
    socket.on('typing_start', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing_start', {
          conversationId,
          userId,
          name: socket.user.name
        });
      }
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing_stop', {
          conversationId,
          userId
        });
      }
    });

    // 5. Cleanup on Disconnect
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
      
      const userConnections = onlineUsers.get(userId);
      if (userConnections) {
        userConnections.delete(socket.id);
        
        if (userConnections.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast that user went offline
          io.emit('user_offline', { userId });
        }
      }
    });
  });
};

module.exports = {
  initSocket,
  onlineUsers
};
