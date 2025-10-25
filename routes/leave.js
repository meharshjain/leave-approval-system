const express = require('express');
const { body, validationResult } = require('express-validator');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendEmailNotification } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/leave/request
// @desc    Create a new leave request
// @access  Private
router.post('/request', auth, [
  body('leaveType').isIn(['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'other']).withMessage('Invalid leave type'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { leaveType, startDate, endDate, reason, academicYear } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    if (start < new Date()) {
      return res.status(400).json({ message: 'Cannot request leave for past dates' });
    }

    // Calculate total days
    const timeDiff = end.getTime() - start.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Get current academic year if not provided
    const currentYear = academicYear || new Date().getFullYear().toString();

    // Check leave balance
    const leaveBalance = await LeaveBalance.findOne({
      employee: req.userId,
      academicYear: currentYear,
      leaveType
    });

    if (leaveBalance && leaveBalance.remaining < totalDays) {
      return res.status(400).json({ 
        message: `Insufficient leave balance. Available: ${leaveBalance.remaining} days, Requested: ${totalDays} days` 
      });
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employee: req.userId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      academicYear: currentYear
    });

    await leaveRequest.save();
    await leaveRequest.populate('employee', 'name email employeeId department');

    // Send email notification to manager
    const employee = await User.findById(req.userId).populate('manager', 'name email');
    if (employee.manager) {
      await sendEmailNotification({
        to: employee.manager.email,
        subject: 'New Leave Request',
        template: 'leave_request',
        data: {
          employeeName: employee.name,
          managerName: employee.manager.name,
          leaveType,
          startDate: start.toDateString(),
          endDate: end.toDateString(),
          totalDays,
          reason
        }
      });
    }

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ message: 'Server error during leave request submission' });
  }
});

// @route   GET /api/leave/my-requests
// @desc    Get current user's leave requests
// @access  Private
router.get('/my-requests', auth, async (req, res) => {
  try {
    const { academicYear, status, page = 1, limit = 10 } = req.query;
    
    const query = { employee: req.userId };
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;

    const leaveRequests = await LeaveRequest.find(query)
      .populate('employee', 'name email employeeId')
      .populate('managerApproval.approvedBy', 'name email')
      .populate('coordinatorApproval.approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      leaveRequests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/leave/pending-approvals
// @desc    Get pending approvals for managers/coordinators
// @access  Private (Manager/Coordinator)
router.get('/pending-approvals', auth, authorize('manager', 'coordinator', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    let query = {};

    if (user.role === 'manager') {
      query = {
        $or: [
          { 'managerApproval.status': 'pending' },
          { 'coordinatorApproval.status': 'pending' }
        ]
      };
    } else if (user.role === 'coordinator') {
      query = { 'coordinatorApproval.status': 'pending' };
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('employee', 'name email employeeId department')
      .populate('managerApproval.approvedBy', 'name email')
      .populate('coordinatorApproval.approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/leave/approve/:id
// @desc    Approve/reject leave request
// @access  Private (Manager/Coordinator)
router.put('/approve/:id', auth, authorize('manager', 'coordinator', 'admin'), [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('comments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, comments } = req.body;
    const user = await User.findById(req.userId);
    
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'name email');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Update approval based on role
    if (user.role === 'manager' || user.role === 'admin') {
      leaveRequest.managerApproval = {
        status,
        approvedBy: req.userId,
        approvedAt: new Date(),
        comments
      };
    }

    if (user.role === 'coordinator' || user.role === 'admin') {
      leaveRequest.coordinatorApproval = {
        status,
        approvedBy: req.userId,
        approvedAt: new Date(),
        comments
      };
    }

    // Update overall status
    if (status === 'rejected') {
      leaveRequest.status = 'rejected';
    } else if (leaveRequest.managerApproval.status === 'approved' && 
               leaveRequest.coordinatorApproval.status === 'approved') {
      leaveRequest.status = 'approved';
    }

    await leaveRequest.save();

    // Send email notification to employee
    await sendEmailNotification({
      to: leaveRequest.employee.email,
      subject: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      template: 'leave_approval',
      data: {
        employeeName: leaveRequest.employee.name,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate.toDateString(),
        endDate: leaveRequest.endDate.toDateString(),
        status,
        comments,
        approvedBy: user.name
      }
    });

    res.json({
      message: `Leave request ${status} successfully`,
      leaveRequest
    });
  } catch (error) {
    console.error('Leave approval error:', error);
    res.status(500).json({ message: 'Server error during approval' });
  }
});

// @route   GET /api/leave/balance
// @desc    Get leave balance for current user
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const currentYear = academicYear || new Date().getFullYear().toString();

    const leaveBalances = await LeaveBalance.find({
      employee: req.userId,
      academicYear: currentYear
    });

    res.json(leaveBalances);
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/leave/records/:academicYear
// @desc    Get leave records for academic year
// @access  Private
router.get('/records/:academicYear', auth, async (req, res) => {
  try {
    const { academicYear } = req.params;
    const { employeeId } = req.query;

    let query = { academicYear };
    
    // If employeeId is provided and user is manager/coordinator/admin, get that employee's records
    if (employeeId && (req.user.role === 'manager' || req.user.role === 'coordinator' || req.user.role === 'admin')) {
      const employee = await User.findOne({ employeeId });
      if (employee) {
        query.employee = employee._id;
      }
    } else {
      // Otherwise, get current user's records
      query.employee = req.userId;
    }

    const leaveRecords = await LeaveRequest.find(query)
      .populate('employee', 'name email employeeId')
      .populate('managerApproval.approvedBy', 'name email')
      .populate('coordinatorApproval.approvedBy', 'name email')
      .sort({ startDate: -1 });

    res.json(leaveRecords);
  } catch (error) {
    console.error('Get leave records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/leave/cancel/:id
// @desc    Cancel leave request
// @access  Private
router.put('/cancel/:id', auth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOne({
      _id: req.params.id,
      employee: req.userId,
      status: 'pending'
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found or cannot be cancelled' });
    }

    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    res.json({
      message: 'Leave request cancelled successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({ message: 'Server error during cancellation' });
  }
});

module.exports = router;
