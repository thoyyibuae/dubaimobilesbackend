const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const BrandController = require('../controller/brand_controllers');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');


// All routes require authentication
router.use(authenticateToken);

// Create brand with icon upload
router.post('/', upload.single('icon_image'), BrandController.createBrand);

// Get all brands
router.get('/', BrandController.getAllBrands);

// Get single brand
router.get('/:id', BrandController.getBrand);

// Update brand with icon upload
router.put('/:id', upload.single('icon_image'), BrandController.updateBrand);

// Delete brand
router.delete('/:id', BrandController.deleteBrand);

module.exports = router;