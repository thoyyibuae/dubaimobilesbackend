const express = require('express');
const router = express.Router();
const transactionController = require('../controller/transaction_controller');

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

// Get transactions summary/statistics
router.get('/summary/summary', transactionController.getTransactionsSummary);

// Get transactions by person name
router.get('/person/:personName', transactionController.getTransactionsByPerson);

// Get recent transactions
router.get('/recent/recent', transactionController.getRecentTransactions);

// Get transactions by date range
router.get('/date-range/range', transactionController.getTransactionsByDateRange);

module.exports = router;