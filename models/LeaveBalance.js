const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  leaveType: {
    type: String,
    enum: ['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'other'],
    required: true
  },
  totalAllocated: {
    type: Number,
    default: 0
  },
  used: {
    type: Number,
    default: 0
  },
  remaining: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for unique constraint
leaveBalanceSchema.index({ employee: 1, academicYear: 1, leaveType: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
