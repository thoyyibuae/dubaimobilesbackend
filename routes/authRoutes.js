const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user_model');
const pool = require('../config/database');
const { 
  authenticateToken, 
  authorizeAdmin, 
  authorizeRoles,
  authorizeAny 

} = require('../middleware/authMiddleware');

// =============== PUBLIC ROUTES (No authentication required) ===============

// Register User (Only 'user' role allowed for self-registration)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    console.log("name"+name);
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Role validation - users can only register as 'user' by default
    const validRoles = ['user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'New users can only register with "user" role' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user (always as 'user' role for registration)
    const user = await User.create(name, email, password, role);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error registering user' 
    });
  }
});

// Login User (All roles)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error logging in' 
    });
  }
});

// =============== USER PROFILE ROUTES (All authenticated users) ===============

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Remove password from response
    delete user.password;
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching profile' 
    });
  }
});

// Update own profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'Name is required' 
      });
    }

    const query = `
      UPDATE users 
      SET name = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, email, role, created_at, updated_at
    `;
    
    const result = await pool.query(query, [name, req.user.userId]);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error updating profile' 
    });
  }
});

// Change own password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'New password must be at least 6 characters long' 
      });
    }

    // Get current user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const query = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, email
    `;
    
    await pool.query(query, [hashedPassword, req.user.userId]);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error changing password' 
    });
  }
});

// =============== ADMIN-ONLY USER MANAGEMENT ROUTES ===============

// Get all users (Admin only)
router.get('/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    
    // Remove passwords from response
    const safeUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json({
      success: true,
      data: safeUsers,
      count: safeUsers.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching users' 
    });
  }
});

// Create user with specific role (Admin only)
router.post('/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email, and password are required' 
      });
    }

    const validRoles = ['user', 'admin', 'manager', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role specified' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }

    const user = await User.create(name, email, password, role);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creating user' 
    });
  }
});

// Update user role (Admin only)
router.patch('/users/:id/role', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['user', 'admin', 'manager', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role specified' 
      });
    }

    // Prevent admin from changing their own role
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot change your own role' 
      });
    }

    const updatedUser = await User.updateRole(id, role);
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error updating user role' 
    });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete your own account' 
      });
    }

    const deletedUser = await User.delete(id);
    if (!deletedUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting user' 
    });
  }
});

// =============== ROLE-BASED DASHBOARDS ===============

// Admin dashboard
router.get('/admin/dashboard', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Get statistics for admin dashboard
    const userStats = await User.getStatistics();
    const branchStatsQuery = `
      SELECT 
        COUNT(*) as total_branches,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_branches
      FROM branches
    `;
    
    const deptStatsQuery = `
      SELECT 
        COUNT(*) as total_departments,
        SUM(staff_count) as total_staff
      FROM departments
    `;
    
    const [branchStats, deptStats] = await Promise.all([
      pool.query(branchStatsQuery),
      pool.query(deptStatsQuery)
    ]);

    const dashboardData = {
      user: req.user,
      statistics: {
        users: userStats,
        branches: branchStats.rows[0],
        departments: deptStats.rows[0]
      },
      recentActivity: await getRecentActivity(),
      quickActions: [
        { label: 'Manage Branches', path: '/api/branches', icon: 'business' },
        { label: 'Manage Departments', path: '/api/departments', icon: 'groups' },
        { label: 'User Management', path: '/api/auth/users', icon: 'people' },
        { label: 'View Reports', path: '/api/admin/reports', icon: 'assessment' }
      ]
    };

    res.json({
      success: true,
      message: 'Admin dashboard loaded successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load admin dashboard' 
    });
  }
});

// Manager dashboard
router.get('/manager/dashboard', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const dashboardData = {
      user: req.user,
      features: ['View branches', 'Manage departments', 'View reports', 'Assign tasks'],
      quickStats: {
        managedBranches: 5, // You would query this from DB
        managedDepartments: 12,
        totalStaff: 85
      }
    };

    res.json({
      success: true,
      message: 'Manager dashboard loaded successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load manager dashboard' 
    });
  }
});

// Staff dashboard
router.get('/staff/dashboard', authenticateToken, authorizeRoles('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const dashboardData = {
      user: req.user,
      features: ['View tasks', 'Update status', 'View schedule', 'Access resources'],
      recentTasks: [
        { id: 1, title: 'Customer support', status: 'in-progress' },
        { id: 2, title: 'Inventory check', status: 'pending' }
      ]
    };

    res.json({
      success: true,
      message: 'Staff dashboard loaded successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load staff dashboard' 
    });
  }
});

// User dashboard
router.get('/user/dashboard', authenticateToken, async (req, res) => {
  try {
    const dashboardData = {
      user: req.user,
      features: ['View profile', 'Update information', 'View history', 'Contact support'],
      welcomeMessage: `Welcome back, ${req.user.name || 'User'}!`
    };

    res.json({
      success: true,
      message: 'User dashboard loaded successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load user dashboard' 
    });
  }
});

// =============== HELPER FUNCTIONS ===============

async function getRecentActivity() {
  try {
    const queries = [
      `SELECT 'user_registered' as type, name as description, created_at as timestamp 
       FROM users ORDER BY created_at DESC LIMIT 5`,
      `SELECT 'branch_created' as type, name as description, created_at as timestamp 
       FROM branches ORDER BY created_at DESC LIMIT 5`
    ];
    
    const results = await Promise.all(queries.map(query => pool.query(query)));
    
    let activities = [];
    results.forEach(result => {
      if (result.rows.length > 0) {
        activities = activities.concat(result.rows);
      }
    });
    
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities.slice(0, 10);
  } catch (error) {
    console.log('Recent activity error:', error.message);
    return [];
  }
}

module.exports = router;