const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Department = require('../models/Department');
const { auth, authorize } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin/Manager/Coordinator)
// @access  Private
router.get('/', auth, authorize('admin', 'manager', 'coordinator'), async (req, res) => {
  try {
    const { department, role, page = 1, limit = 10 } = req.query;
    
    const query = { isActive: true };
    if (department) query.department = department;
    if (role) query.role = role;

    const users = await User.find(query)
      .populate('department', 'name')
      .populate('manager', 'name email')
      .select('-password')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('department', 'name')
      .populate('manager', 'name email')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can view this profile
    if (req.userId !== req.params.id && 
        !['admin', 'manager', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin/Manager)
router.put('/:id', auth, authorize('admin', 'manager'), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['employee', 'manager', 'coordinator', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, department, manager, phone, position, isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if manager can update this user
    if (req.user.role === 'manager' && user.role === 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (department) updateData.department = department;
    if (manager !== undefined) updateData.manager = manager;
    if (phone) updateData.phone = phone;
    if (position) updateData.position = position;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('department', 'name').populate('manager', 'name email');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error during user update' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Deactivate user
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error during user deactivation' });
  }
});

// @route   GET /api/users/department/:departmentId
// @desc    Get users by department
// @access  Private
router.get('/department/:departmentId', auth, async (req, res) => {
  try {
    const users = await User.find({ 
      department: req.params.departmentId,
      isActive: true 
    })
    .populate('department', 'name')
    .populate('manager', 'name email')
    .select('-password')
    .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get department users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/managers
// @desc    Get all managers
// @access  Private
router.get('/managers', auth, async (req, res) => {
  try {
    const managers = await User.find({ 
      role: { $in: ['manager', 'coordinator', 'admin'] },
      isActive: true 
    })
    .populate('department', 'name')
    .select('-password')
    .sort({ name: 1 });

    res.json(managers);
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
