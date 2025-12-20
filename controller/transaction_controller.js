const Transaction = require("../models/transaction_model");

// Validation helper
const validateTransaction = (data, isUpdate = false) => {
    const errors = [];

    if (!isUpdate || data.from_person !== undefined) {
        if (!data.from_person || data.from_person.trim() === '') {
            errors.push({ field: 'from_person', message: 'From person is required' });
        } else if (data.from_person.length > 255) {
            errors.push({ field: 'from_person', message: 'From person must be less than 255 characters' });
        }
    }

    if (!isUpdate || data.to_person !== undefined) {
        if (!data.to_person || data.to_person.trim() === '') {
            errors.push({ field: 'to_person', message: 'To person is required' });
        } else if (data.to_person.length > 255) {
            errors.push({ field: 'to_person', message: 'To person must be less than 255 characters' });
        }
    }

    if (!isUpdate || data.amount !== undefined) {
        if (data.amount === undefined || data.amount === null) {
            errors.push({ field: 'amount', message: 'Amount is required' });
        } else {
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                errors.push({ field: 'amount', message: 'Amount must be a positive number' });
            }
        }
    }

    if (!isUpdate || data.type !== undefined) {
        const validTypes = ['CREDIT', 'DEBIT', 'TRANSFER'];
        if (!data.type || !validTypes.includes(data.type.toUpperCase())) {
            errors.push({ 
                field: 'type', 
                message: `Type must be one of: ${validTypes.join(', ')}` 
            });
        } else if (data.type.toUpperCase() === 'TRANSFER' && 
                   data.from_person && data.to_person && 
                   data.from_person.trim() === data.to_person.trim()) {
            errors.push({ 
                field: 'type', 
                message: 'For TRANSFER type, from_person and to_person must be different' 
            });
        }
    }

    if (data.purpose && data.purpose.length > 500) {
        errors.push({ field: 'purpose', message: 'Purpose must be less than 500 characters' });
    }

    return errors;
};

// Create transaction
exports.createTransaction = async (req, res) => {
    try {
        const transactionData = req.body;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        // Validate input
        const validationErrors = validateTransaction(transactionData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Format data with created_by
        const formattedData = {
            from_person: transactionData.from_person.trim(),
            to_person: transactionData.to_person.trim(),
            amount: parseFloat(transactionData.amount),
            purpose: transactionData.purpose ? transactionData.purpose.trim() : null,
            type: transactionData.type.toUpperCase(),
            created_by: userId
        };

        // Create transaction
        const transaction = await Transaction.create(formattedData);

        res.status(201).json({
            status: true,
            message: "Transaction created successfully",
            data: transaction,
        });

    } catch (error) {
        console.error("Create transaction error:", error);
        
        // Handle database errors
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                status: false,
                message: "Transaction already exists",
                error: error.detail
            });
        }

        res.status(500).json({
            status: false,
            message: "Failed to create transaction",
            error: error.message
        });
    }
};

// Get all transactions with filters and pagination
exports.getTransactions = async (req, res) => {
    try {
        // Extract query parameters
        const {
            page = 1,
            limit = 20,
            search,
            type,
            fromPerson,
            toPerson,
            minAmount,
            maxAmount,
            startDate,
            endDate,
            sortBy = 'timestamp',
            sortOrder = 'DESC'
        } = req.query;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        // Validate pagination parameters
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                status: false,
                message: "Page must be a positive integer"
            });
        }

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                status: false,
                message: "Limit must be between 1 and 100"
            });
        }

        // Validate date formats if provided
        if (startDate && isNaN(Date.parse(startDate))) {
            return res.status(400).json({
                status: false,
                message: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)"
            });
        }

        if (endDate && isNaN(Date.parse(endDate))) {
            return res.status(400).json({
                status: false,
                message: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)"
            });
        }

        // Validate amount filters
        if (minAmount && (isNaN(parseFloat(minAmount)) || parseFloat(minAmount) < 0)) {
            return res.status(400).json({
                status: false,
                message: "minAmount must be a positive number"
            });
        }

        if (maxAmount && (isNaN(parseFloat(maxAmount)) || parseFloat(maxAmount) < 0)) {
            return res.status(400).json({
                status: false,
                message: "maxAmount must be a positive number"
            });
        }

        if (minAmount && maxAmount && parseFloat(minAmount) > parseFloat(maxAmount)) {
            return res.status(400).json({
                status: false,
                message: "minAmount cannot be greater than maxAmount"
            });
        }

        // Prepare filters WITH USER ID
        const filters = {
            userId,
            search,
            type,
            fromPerson,
            toPerson,
            minAmount: minAmount ? parseFloat(minAmount) : null,
            maxAmount: maxAmount ? parseFloat(maxAmount) : null,
            startDate,
            endDate,
            sortBy,
            sortOrder: sortOrder.toUpperCase(),
            offset,
            limit: limitNum
        };

        // Get transactions for this user only
        const result = await Transaction.getAll(filters);

        res.status(200).json({
            status: true,
            message: "Transactions fetched successfully",
            data: result.data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: result.total,
                totalPages: result.totalPages,
                hasNextPage: pageNum < result.totalPages,
                hasPrevPage: pageNum > 1
            },
            filters: {
                search: search || null,
                type: type || null,
                fromPerson: fromPerson || null,
                toPerson: toPerson || null,
                minAmount: minAmount ? parseFloat(minAmount) : null,
                maxAmount: maxAmount ? parseFloat(maxAmount) : null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            },
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Get transactions error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to fetch transactions",
            error: error.message
        });
    }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
    try {
        const transactionId = req.params.id;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        if (!transactionId || isNaN(parseInt(transactionId))) {
            return res.status(400).json({
                status: false,
                message: "Invalid transaction ID"
            });
        }

        // Get transaction for this user only
        const transaction = await Transaction.getById(transactionId, userId);

        if (!transaction) {
            return res.status(404).json({
                status: false,
                message: "Transaction not found"
            });
        }

        res.status(200).json({
            status: true,
            message: "Transaction fetched successfully",
            data: transaction,
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Get transaction by ID error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to fetch transaction",
            error: error.message
        });
    }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
    try {
        const transactionId = req.params.id;
        const updateData = req.body;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        if (!transactionId || isNaN(parseInt(transactionId))) {
            return res.status(400).json({
                status: false,
                message: "Invalid transaction ID"
            });
        }

        // Check if transaction exists and belongs to user
        const existingTransaction = await Transaction.getById(transactionId, userId);
        if (!existingTransaction) {
            return res.status(404).json({
                status: false,
                message: "Transaction not found"
            });
        }

        // Validate update data
        const validationErrors = validateTransaction(updateData, true);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Prepare update data (only include provided fields)
        const formattedData = {};
        if (updateData.from_person !== undefined) {
            formattedData.from_person = updateData.from_person.trim();
        }
        if (updateData.to_person !== undefined) {
            formattedData.to_person = updateData.to_person.trim();
        }
        if (updateData.amount !== undefined) {
            formattedData.amount = parseFloat(updateData.amount);
        }
        if (updateData.purpose !== undefined) {
            formattedData.purpose = updateData.purpose ? updateData.purpose.trim() : null;
        }
        if (updateData.type !== undefined) {
            formattedData.type = updateData.type.toUpperCase();
        }

        // Validate TRANSFER type constraint
        if (formattedData.type === 'TRANSFER' || 
            (updateData.type === undefined && existingTransaction.type === 'TRANSFER')) {
            
            const fromPerson = formattedData.from_person || existingTransaction.from_person;
            const toPerson = formattedData.to_person || existingTransaction.to_person;
            
            if (fromPerson === toPerson) {
                return res.status(400).json({
                    status: false,
                    message: "For TRANSFER type, from_person and to_person must be different"
                });
            }
        }

        // Update transaction for this user only
        const updatedTransaction = await Transaction.update(transactionId, formattedData, userId);

        if (!updatedTransaction) {
            return res.status(404).json({
                status: false,
                message: "Failed to update transaction"
            });
        }

        res.status(200).json({
            status: true,
            message: "Transaction updated successfully",
            data: updatedTransaction,
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Update transaction error:", error);
        
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                status: false,
                message: "Transaction update conflict",
                error: error.detail
            });
        }

        res.status(500).json({
            status: false,
            message: "Failed to update transaction",
            error: error.message
        });
    }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
    try {
        const transactionId = req.params.id;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        if (!transactionId || isNaN(parseInt(transactionId))) {
            return res.status(400).json({
                status: false,
                message: "Invalid transaction ID"
            });
        }

        // Delete transaction for this user only
        const result = await Transaction.delete(transactionId, userId);

        if (!result) {
            return res.status(404).json({
                status: false,
                message: "Transaction not found"
            });
        }

        res.status(200).json({
            status: true,
            message: result.message,
            data: result.transaction,
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Delete transaction error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to delete transaction",
            error: error.message
        });
    }
};

// Get transactions summary/statistics
exports.getTransactionsSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        // Validate date formats if provided
        if (startDate && isNaN(Date.parse(startDate))) {
            return res.status(400).json({
                status: false,
                message: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)"
            });
        }

        if (endDate && isNaN(Date.parse(endDate))) {
            return res.status(400).json({
                status: false,
                message: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)"
            });
        }

        const filters = { 
            userId,
            startDate, 
            endDate 
        };
        
        const summary = await Transaction.getSummary(filters);

        res.status(200).json({
            status: true,
            message: "Transactions summary fetched successfully",
            data: summary,
         user:req.user.userId

        });

    } catch (error) {
        console.error("Get transactions summary error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to fetch transactions summary",
            error: error.message
        });
    }
};

// Get transactions by person
exports.getTransactionsByPerson = async (req, res) => {
    try {
        const personName = req.params.personName;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        const {
            page = 1,
            limit = 20,
            type,
            minAmount,
            maxAmount,
            startDate,
            endDate,
            sortBy = 'timestamp',
            sortOrder = 'DESC'
        } = req.query;

        if (!personName || personName.trim() === '') {
            return res.status(400).json({
                status: false,
                message: "Person name is required"
            });
        }

        // Validate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                status: false,
                message: "Page must be a positive integer"
            });
        }

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                status: false,
                message: "Limit must be between 1 and 100"
            });
        }

        // Prepare filters
        const filters = {
            type,
            minAmount: minAmount ? parseFloat(minAmount) : null,
            maxAmount: maxAmount ? parseFloat(maxAmount) : null,
            startDate,
            endDate,
            sortBy,
            sortOrder: sortOrder.toUpperCase(),
            offset,
            limit: limitNum
        };

        // Get transactions by person for this user only
        const result = await Transaction.getByPerson(personName, filters, userId);

        res.status(200).json({
            status: true,
            message: "Transactions by person fetched successfully",
            data: result.data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: result.total,
                totalPages: result.totalPages,
                hasNextPage: pageNum < result.totalPages,
                hasPrevPage: pageNum > 1
            },
            person: personName,
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Get transactions by person error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to fetch transactions by person",
            error: error.message
        });
    }
};

// Get recent transactions
exports.getRecentTransactions = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        if (isNaN(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({
                status: false,
                message: "Limit must be between 1 and 50"
            });
        }

        const transactions = await Transaction.getRecent(limit, userId);

        res.status(200).json({
            status: true,
            message: "Recent transactions fetched successfully",
            data: transactions,
            count: transactions.length,
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Get recent transactions error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to fetch recent transactions",
            error: error.message
        });
    }
};

// Get transactions by date range
exports.getTransactionsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, type, fromPerson, toPerson } = req.query;
        
        // Get user ID from authentication middleware
        const userId = req.user?.userId || req.user?.id || req.user?._id || 1;

        // Validate required parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                status: false,
                message: "startDate and endDate are required"
            });
        }

        // Validate date formats
        if (isNaN(Date.parse(startDate))) {
            return res.status(400).json({
                status: false,
                message: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)"
            });
        }

        if (isNaN(Date.parse(endDate))) {
            return res.status(400).json({
                status: false,
                message: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return res.status(400).json({
                status: false,
                message: "startDate cannot be after endDate"
            });
        }

        const filters = { type, fromPerson, toPerson };
        const transactions = await Transaction.getByDateRange(startDate, endDate, filters, userId);

        res.status(200).json({
            status: true,
            message: "Transactions by date range fetched successfully",
            data: transactions,
            count: transactions.length,
            dateRange: {
                startDate: startDate,
                endDate: endDate,
                days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
            },
                        user:req.user.userId

        });

    } catch (error) {
        console.error("Get transactions by date range error:", error);
        res.status(500).json({
            status: false,
            message: "Failed to fetch transactions by date range",
            error: error.message
        });
    }
};


