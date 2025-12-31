const express = require('express');
const router = express.Router();
const SupplierController = require('../controller/supplierController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');


// All routes require authentication
router.use(authenticateToken);

// Public routes (authenticated users can access)
router.get('/', SupplierController.getAllSuppliers);
router.get('/search', SupplierController.searchSuppliers);
router.get('/:id', SupplierController.getSupplierById);
router.get('/count', SupplierController.getSuppliersCount);
router.get('/export', SupplierController.exportSuppliers);


// Protected routes - require specific roles
router.get('/', SupplierController.getAllSuppliers);
router.post('/', SupplierController.createSupplier);
router.put('/:id', SupplierController.updateSupplier);
router.patch('/:id', SupplierController.partialUpdateSupplier);
router.delete('/:id', SupplierController.deleteSupplier);

module.exports = router;