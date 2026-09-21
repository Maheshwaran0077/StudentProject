const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
});

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'STUDENT_CARE_OFFICER', 'ADMIN'],
      required: true
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    messageType: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'],
      default: 'TEXT'
    },
    attachments: [attachmentSchema],
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
