const express = require('express');
const router = express.Router();
const NormalUserController = require('../controller/normal_user_controller');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES ====================
// (Add these if you want public access, otherwise remove)

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication
router.use(authenticateToken);

// Create new normal user (Admin/Manager only)
router.post('/', 
    // authorizeRoles('admin', 'branch_admin', 'department_manager'), 
    NormalUserController.create
);


// Get all users with pagination and filters
router.get('/', 
    authorizeRoles('admin', 'branch_admin', 'department_manager', 'staff'), 
    NormalUserController.getAll
);

// Search users
router.get('/search', 
    authorizeRoles('admin', 'branch_admin', 'department_manager', 'staff'), 
    NormalUserController.search
);

// Get user statistics
router.get('/stats', 
    authorizeRoles('admin', 'branch_admin', 'department_manager'), 
    NormalUserController.getStats
);

// Get user by ID
router.get('/:id', 
    authorizeRoles('admin', 'branch_admin', 'department_manager', 'staff'), 
    NormalUserController.getById
);

// Update user
router.put('/:id', 
    authorizeRoles('admin', 'branch_admin', 'department_manager'), 
    NormalUserController.update
);

// Delete user
router.delete('/:id', 
    authorizeRoles('admin'), 
    NormalUserController.delete
);

// ==================== SELF-MANAGEMENT ROUTES ====================

// Get own profile (any authenticated user)
router.get('/profile/me', (req, res) => {
    req.params = { id: req.user.id };
    NormalUserController.getById(req, res);
});

// Update own profile
router.put('/profile/me', async (req, res) => {
    req.params = { id: req.user.id };
    await NormalUserController.update(req, res);
});

// Get own stats
router.get('/profile/stats', 
    NormalUserController.getStats
);

module.exports = router;