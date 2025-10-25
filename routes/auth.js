const express = require('express');
const User = require('../models/User');
const Department = require('../models/Department');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /register
// @desc    Register a new user
// @access  Public (Admin only in production)
router.post('/register', /* [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('role').isIn(['employee', 'manager', 'coordinator', 'admin']).withMessage('Invalid role')
], */ async (req, res) => {
  try {/* 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } */

    const { name, email, password, employeeId, department, role, manager, phone, position } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or employee ID already exists' 
      });
    }

    // Check if department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      employeeId,
      department,
      role,
      manager,
      phone,
      position
    });

    await user.save();

    // Populate department and manager details
    await user.populate('department', 'name');
    if (manager) {
      await user.populate('manager', 'name email');
    }

    // Create session
    req.session.userId = user._id;

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role,
        manager: user.manager
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /login
// @desc    Login user
// @access  Public
router.post('/login', /* [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], */ async (req, res) => {
  try {
    /* const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } */

    const { email, password } = req.body;

    // Find user and populate department
    const user = await User.findOne({ email, isActive: true })
      .populate('department', 'name')
      .populate('manager', 'name email');

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    /* // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    } */

    // Create session
    req.session.userId = user._id;

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role,
        manager: user.manager,
        position: user.position
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('department', 'name')
      .populate('manager', 'name email')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, /* [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
], */ async (req, res) => {
  try {
    /* const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } */

    const { name, phone, position } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (position) updateData.position = position;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).populate('department', 'name').populate('manager', 'name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role,
        manager: user.manager,
        phone: user.phone,
        position: user.position
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @route   POST /logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

module.exports = router;
