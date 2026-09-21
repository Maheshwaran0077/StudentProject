const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    subjects: [
      {
        type: String,
        trim: true
      }
    ],
    availability: {
      type: String,
      trim: true,
      default: 'Available during working hours'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Faculty', facultySchema);
