const express = require('express');
const router = express.Router();
const transactionController = require('../controller/transaction_controller');


const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');




// All routes require authentication
router.use(authenticateToken);

// ✅ FIXED: Summary route should comFORE parameterized routes
// Get transactions summary/statistics
router.get('/summary', transactionController.getTransactionsSummary);

// Get recent transactions
router.get('/recent', transactionController.getRecentTransactions);

// Get transactions by date range
router.get('/date-range', transactionController.getTransactionsByDateRange);

// Get transactions by person name
router.get('/person/:personName', transactionController.getTransactionsByPerson);

// ✅ FIXED: Standard CRUD routes in correct order
// Create a new transaction
router.post('/', transactionController.createTransaction);

// Get all transactions with filtering and pagination
router.get('/', transactionController.getTransactions);

// Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Update transaction
router.put('/:id', transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;