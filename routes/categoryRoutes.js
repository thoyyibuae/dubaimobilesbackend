const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const CategoryController = require('../controller/category_controller');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');


// All routes require authentication
router.use(authenticateToken);


// Create category with icon upload
router.post('/', upload.single('icon_image'), CategoryController.createCategory);

// Get all categories
router.get('/', CategoryController.getAllCategories);

// Get single category
router.get('/:id', CategoryController.getCategory);

// Update category with icon upload
router.put('/:id', upload.single('icon_image'), CategoryController.updateCategory);

// Delete category
router.delete('/:id', CategoryController.deleteCategory);

module.exports = router;