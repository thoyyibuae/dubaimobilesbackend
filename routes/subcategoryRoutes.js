// const express = require('express');
// const router = express.Router();
// const subcategoryController = require('../controllers/subcategoryController');

// // Create a new subcategory
// router.post('/', subcategoryController.createSubcategory);

// // Get all subcategories with pagination
// router.get('/', subcategoryController.getAllSubcategories);

// // Get subcategories by category ID
// router.get('/category/:maincategoryId', subcategoryController.getSubcategoriesByCategory);

// // Get single subcategory
// router.get('/:id', subcategoryController.getSubcategoryById);

// // Update subcategory
// router.put('/:id', subcategoryController.updateSubcategory);

// // Delete subcategory
// router.delete('/:id', subcategoryController.deleteSubcategory);

// module.exports = router;





const express = require('express');
const router = express.Router();
const subcategoryController = require('../controller/subcategory_controller');
const upload = require('../config/multer');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Middleware to handle both single and multiple file uploads
const handleUpload = (req, res, next) => {
  upload.single('icon_image')(req, res, (err) => {
    if (err) {
      // Try multiple upload if single fails
      upload.fields([{ name: 'icon_image', maxCount: 1 }])(req, res, (err2) => {
        if (err2) {
          return res.status(400).json({
            success: false,
            error: err2.message || 'Error uploading file'
          });
        }
        next();
      });
    } else {
      next();
    }
  });
};


// Create subcategory - requires authentication and admin roles
router.post('/', 
  authenticateToken, 
  authorizeRoles('admin', 'superadmin'), 
  handleUpload, 
  subcategoryController.createSubcategory
);

// Get all subcategories with pagination - public access
router.get('/', authenticateToken,  subcategoryController.getAllSubcategories);

// Get subcategories by category - public access
router.get('/category/:maincategoryId', authenticateToken,  subcategoryController.getSubcategoriesByCategory);

// Get single subcategory - public access
router.get('/:id',  authenticateToken, 
  authorizeRoles('admin', 'superadmin'),  subcategoryController.getSubcategoryById);

// Update subcategory - requires authentication and admin roles
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('admin', 'superadmin'), 
  handleUpload, 
  subcategoryController.updateSubcategory
);

// Delete subcategory - requires authentication and admin roles
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('admin', 'superadmin'), 
  subcategoryController.deleteSubcategory
);

module.exports = router;