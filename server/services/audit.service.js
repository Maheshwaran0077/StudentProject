const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const logAction = async ({ req, userId, action, resourceType, resourceId }) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'system';
    const userAgent = req ? req.headers['user-agent'] : 'system';

    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent
    });
  } catch (error) {
    logger.error(`Failed to write audit log: ${error.message}`);
  }
};

module.exports = {
  logAction
};
