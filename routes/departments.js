const express = require('express');
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('coordinator', 'name email')
      .sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('coordinator', 'name email');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/departments
// @desc    Create new department
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), /* [
  body('name').notEmpty().withMessage('Department name is required'),
  body('description').optional().isString(),
  body('coordinator').optional().isMongoId().withMessage('Invalid coordinator ID')
], */ async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, coordinator } = req.body;

    // Check if department already exists
    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department with this name already exists' });
    }

    // Validate coordinator if provided
    if (coordinator) {
      const coordinatorUser = await User.findById(coordinator);
      if (!coordinatorUser) {
        return res.status(400).json({ message: 'Coordinator not found' });
      }
    }

    const department = new Department({
      name,
      description,
      coordinator
    });

    await department.save();
    await department.populate('coordinator', 'name email');

    res.status(201).json({
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error during department creation' });
  }
});

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), /* [
  body('name').optional().notEmpty().withMessage('Department name cannot be empty'),
  body('description').optional().isString(),
  body('coordinator').optional().isMongoId().withMessage('Invalid coordinator ID')
], */ async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, coordinator } = req.body;
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== department.name) {
      const existingDepartment = await Department.findOne({ name });
      if (existingDepartment) {
        return res.status(400).json({ message: 'Department with this name already exists' });
      }
    }

    // Validate coordinator if provided
    if (coordinator) {
      const coordinatorUser = await User.findById(coordinator);
      if (!coordinatorUser) {
        return res.status(400).json({ message: 'Coordinator not found' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (coordinator !== undefined) updateData.coordinator = coordinator;

    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('coordinator', 'name email');

    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error during department update' });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Deactivate department
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has active users
    const activeUsers = await User.countDocuments({ 
      department: req.params.id, 
      isActive: true 
    });
    
    if (activeUsers > 0) {
      return res.status(400).json({ 
        message: 'Cannot deactivate department with active users' 
      });
    }

    department.isActive = false;
    await department.save();

    res.json({ message: 'Department deactivated successfully' });
  } catch (error) {
    console.error('Deactivate department error:', error);
    res.status(500).json({ message: 'Server error during department deactivation' });
  }
});

// @route   GET /api/departments/:id/users
// @desc    Get users in department
// @access  Private
router.get('/:id/users', auth, async (req, res) => {
  try {
    const users = await User.find({ 
      department: req.params.id,
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

module.exports = router;
