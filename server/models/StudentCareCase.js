const mongoose = require('mongoose');

const studentCareCaseSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    caseNumber: {
      type: String,
      unique: true,
      trim: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Ragging',
        'Harassment',
        'Bullying',
        'Safety concerns',
        'Discrimination',
        'Personal concerns',
        'Academic grievance',
        'Other issues'
      ]
    },
    priority: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'],
      default: 'PENDING'
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalationLevel: {
      type: Number,
      default: 0
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate case number
studentCareCaseSchema.pre('save', async function(next) {
  if (!this.caseNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    this.caseNumber = `SCC-${year}-${random}`;
  }
  next();
});

// Indexes
studentCareCaseSchema.index({ studentId: 1 });
studentCareCaseSchema.index({ status: 1 });
studentCareCaseSchema.index({ priority: 1 });
studentCareCaseSchema.index({ assignedOfficerId: 1 });

module.exports = mongoose.model('StudentCareCase', studentCareCaseSchema);
