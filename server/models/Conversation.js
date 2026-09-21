const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['ACADEMIC', 'STUDENT_CARE'],
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // required only if type is ACADEMIC
      required: function() {
        return this.type === 'ACADEMIC';
      }
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    category: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      required: function() {
        return this.type === 'STUDENT_CARE';
      }
    },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'],
      default: function() {
        return this.type === 'STUDENT_CARE' ? 'PENDING' : 'IN_PROGRESS';
      }
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster lookups
conversationSchema.index({ studentId: 1 });
conversationSchema.index({ facultyId: 1 });
conversationSchema.index({ assignedOfficerId: 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
