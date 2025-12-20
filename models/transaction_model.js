const pool = require("../config/database");

module.exports = {
    // Create a new transaction with created_by
    async create(transaction) {
        const query = `
            INSERT INTO transactions (
                from_person, to_person, amount, purpose, type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const values = [
            transaction.from_person,
            transaction.to_person,
            transaction.amount,
            transaction.purpose,
            transaction.type,
            transaction.created_by || 1  // Default to user 1 if not provided
        ];

        try {
            const result = await pool.query(query, values);
            return this.formatTransaction(result.rows[0]);
        } catch (error) {
            console.error("Create transaction error:", error);
            throw error;
        }
    },

    // Get all transactions with filtering, pagination, and sorting (USER-SPECIFIC)
    async getAll(filters = {}) {
        try {
            // Build WHERE clause
            const whereConditions = [];
            const params = [];
            
            const {
                userId,  // User ID for filtering
                search,
                type,
                fromPerson,
                toPerson,
                minAmount,
                maxAmount,
                startDate,
                endDate,
                sortBy = 'timestamp',
                sortOrder = 'DESC',
                offset = 0,
                limit = 20
            } = filters;

            // USER FILTER: Only show transactions created by this user
            if (userId) {
                whereConditions.push(`created_by = $${params.length + 1}`);
                params.push(userId);
            }

            // Search filter
            if (search && search.trim() !== "") {
                whereConditions.push(`(
                    from_person ILIKE $${params.length + 1} OR
                    to_person ILIKE $${params.length + 1} OR
                    purpose ILIKE $${params.length + 1}
                )`);
                params.push(`%${search.trim()}%`);
            }

            // Type filter
            if (type && ['CREDIT', 'DEBIT', 'TRANSFER'].includes(type.toUpperCase())) {
                whereConditions.push(`type = $${params.length + 1}`);
                params.push(type.toUpperCase());
            }

            // From person filter
            if (fromPerson && fromPerson.trim() !== "") {
                whereConditions.push(`from_person ILIKE $${params.length + 1}`);
                params.push(`%${fromPerson.trim()}%`);
            }

            // To person filter
            if (toPerson && toPerson.trim() !== "") {
                whereConditions.push(`to_person ILIKE $${params.length + 1}`);
                params.push(`%${toPerson.trim()}%`);
            }

            // Amount range filters
            if (minAmount !== undefined && minAmount !== null) {
                whereConditions.push(`amount >= $${params.length + 1}`);
                params.push(parseFloat(minAmount));
            }

            if (maxAmount !== undefined && maxAmount !== null) {
                whereConditions.push(`amount <= $${params.length + 1}`);
                params.push(parseFloat(maxAmount));
            }

            // Date range filters
            if (startDate) {
                whereConditions.push(`timestamp >= $${params.length + 1}`);
                params.push(new Date(startDate));
            }

            if (endDate) {
                whereConditions.push(`timestamp <= $${params.length + 1}`);
                params.push(new Date(endDate));
            }

            // Build WHERE clause string
            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Build count query
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM transactions 
                ${whereClause}
            `;
            
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total, 10);

            // Validate sort field
            const validSortFields = ['id', 'from_person', 'to_person', 'amount', 'timestamp', 'created_at', 'type', 'created_by'];
            const sortField = validSortFields.includes(sortBy.toLowerCase()) ? sortBy : 'timestamp';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Build main query
            const mainQuery = `
                SELECT * FROM transactions 
                ${whereClause}
                ORDER BY ${sortField} ${order}
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;

            // Add pagination params
            const queryParams = [...params, limit, offset];

            // Fetch data
            const dataResult = await pool.query(mainQuery, queryParams);
            const data = dataResult.rows.map(row => this.formatTransaction(row));

            return {
                data,
                total,
                page: Math.floor(offset / limit) + 1,
                limit,
                totalPages: Math.ceil(total / limit)
            };

        } catch (error) {
            console.error("Get all transactions error:", error);
            throw error;
        }
    },

    // Get transaction by ID (USER-SPECIFIC)
    async getById(id, userId = null) {
        try {
            let query = `SELECT * FROM transactions WHERE id = $1`;
            let params = [id];
            
            // USER FILTER: Only return if transaction belongs to this user
            if (userId) {
                query += ` AND created_by = $2`;
                params.push(userId);
            }
            
            const result = await pool.query(query, params);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatTransaction(result.rows[0]);
        } catch (error) {
            console.error("Get transaction by ID error:", error);
            throw error;
        }
    },

    // Get transaction by ID without user filter (for admin/internal use)
    async getByIdInternal(id) {
        try {
            const query = `SELECT * FROM transactions WHERE id = $1`;
            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatTransaction(result.rows[0]);
        } catch (error) {
            console.error("Get transaction by ID error:", error);
            throw error;
        }
    },

    // Update transaction (USER-SPECIFIC)
    async update(id, transaction, userId = null) {
        let query, values;
        
        // USER FILTER: Only update if transaction belongs to this user
        if (userId) {
            query = `
                UPDATE transactions SET
                    from_person = $1,
                    to_person = $2,
                    amount = $3,
                    purpose = $4,
                    type = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6 AND created_by = $7
                RETURNING *;
            `;
            values = [
                transaction.from_person,
                transaction.to_person,
                transaction.amount,
                transaction.purpose,
                transaction.type,
                id,
                userId
            ];
        } else {
            query = `
                UPDATE transactions SET
                    from_person = $1,
                    to_person = $2,
                    amount = $3,
                    purpose = $4,
                    type = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *;
            `;
            values = [
                transaction.from_person,
                transaction.to_person,
                transaction.amount,
                transaction.purpose,
                transaction.type,
                id
            ];
        }

        try {
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatTransaction(result.rows[0]);
        } catch (error) {
            console.error("Update transaction error:", error);
            throw error;
        }
    },

    // Delete transaction (USER-SPECIFIC)
    async delete(id, userId = null) {
        let query, params;
        
        // USER FILTER: Only delete if transaction belongs to this user
        if (userId) {
            query = `DELETE FROM transactions WHERE id = $1 AND created_by = $2 RETURNING *`;
            params = [id, userId];
        } else {
            query = `DELETE FROM transactions WHERE id = $1 RETURNING *`;
            params = [id];
        }
        
        try {
            const result = await pool.query(query, params);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return {
                message: "Transaction deleted successfully",
                transaction: this.formatTransaction(result.rows[0])
            };
        } catch (error) {
            console.error("Delete transaction error:", error);
            throw error;
        }
    },

    // Format transaction object (INCLUDES created_by)
    formatTransaction(row) {
        return {
            id: row.id.toString(),
            from_person: row.from_person,
            to_person: row.to_person,
            amount: parseFloat(row.amount),
            purpose: row.purpose,
            timestamp: row.timestamp,
            type: row.type,
            created_by: row.created_by,  // Include created_by in response
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    },

    // Get all transactions without user filter (for admin/internal use)
    async getAllWithoutUserFilter(filters = {}) {
        try {
            // Build WHERE clause
            const whereConditions = [];
            const params = [];
            
            const {
                search,
                type,
                fromPerson,
                toPerson,
                minAmount,
                maxAmount,
                startDate,
                endDate,
                sortBy = 'timestamp',
                sortOrder = 'DESC',
                offset = 0,
                limit = 20
            } = filters;

            // Search filter
            if (search && search.trim() !== "") {
                whereConditions.push(`(
                    from_person ILIKE $${params.length + 1} OR
                    to_person ILIKE $${params.length + 1} OR
                    purpose ILIKE $${params.length + 1}
                )`);
                params.push(`%${search.trim()}%`);
            }

            // Type filter
            if (type && ['CREDIT', 'DEBIT', 'TRANSFER'].includes(type.toUpperCase())) {
                whereConditions.push(`type = $${params.length + 1}`);
                params.push(type.toUpperCase());
            }

            // From person filter
            if (fromPerson && fromPerson.trim() !== "") {
                whereConditions.push(`from_person ILIKE $${params.length + 1}`);
                params.push(`%${fromPerson.trim()}%`);
            }

            // To person filter
            if (toPerson && toPerson.trim() !== "") {
                whereConditions.push(`to_person ILIKE $${params.length + 1}`);
                params.push(`%${toPerson.trim()}%`);
            }

            // Amount range filters
            if (minAmount !== undefined && minAmount !== null) {
                whereConditions.push(`amount >= $${params.length + 1}`);
                params.push(parseFloat(minAmount));
            }

            if (maxAmount !== undefined && maxAmount !== null) {
                whereConditions.push(`amount <= $${params.length + 1}`);
                params.push(parseFloat(maxAmount));
            }

            // Date range filters
            if (startDate) {
                whereConditions.push(`timestamp >= $${params.length + 1}`);
                params.push(new Date(startDate));
            }

            if (endDate) {
                whereConditions.push(`timestamp <= $${params.length + 1}`);
                params.push(new Date(endDate));
            }

            // Build WHERE clause string
            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Build count query
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM transactions 
                ${whereClause}
            `;
            
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total, 10);

            // Validate sort field
            const validSortFields = ['id', 'from_person', 'to_person', 'amount', 'timestamp', 'created_at', 'type', 'created_by'];
            const sortField = validSortFields.includes(sortBy.toLowerCase()) ? sortBy : 'timestamp';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Build main query
            const mainQuery = `
                SELECT * FROM transactions 
                ${whereClause}
                ORDER BY ${sortField} ${order}
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;

            // Add pagination params
            const queryParams = [...params, limit, offset];

            // Fetch data
            const dataResult = await pool.query(mainQuery, queryParams);
            const data = dataResult.rows.map(row => this.formatTransaction(row));

            return {
                data,
                total,
                page: Math.floor(offset / limit) + 1,
                limit,
                totalPages: Math.ceil(total / limit)
            };

        } catch (error) {
            console.error("Get all transactions without user filter error:", error);
            throw error;
        }
    },

    // Get comprehensive transactions summary/statistics (WITH USER FILTER)
    async getSummary(filters = {}) {
        try {
            // Build WHERE conditions
            const whereConditions = [];
            const params = [];
            
            const { 
                userId,  // User ID for filtering
                startDate, 
                endDate 
            } = filters;

            // USER FILTER: Only include transactions created by this user
            if (userId) {
                whereConditions.push(`created_by = $${params.length + 1}`);
                params.push(userId);
            }

            if (startDate) {
                whereConditions.push(`timestamp >= $${params.length + 1}`);
                params.push(new Date(startDate));
            }

            if (endDate) {
                whereConditions.push(`timestamp <= $${params.length + 1}`);
                params.push(new Date(endDate));
            }

            // Build WHERE clause properly
            let whereClause = '';
            let subWhereClause = '';
            
            if (whereConditions.length > 0) {
                whereClause = `WHERE ${whereConditions.join(' AND ')}`;
                subWhereClause = `AND ${whereConditions.join(' AND ')}`;
            }

            // Query 1: Get overall summary with enhanced credit/debit comparison
            const overallQuery = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount,
                    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credit,
                    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debit,
                    COUNT(CASE WHEN type = 'CREDIT' THEN 1 END) as credit_count,
                    COUNT(CASE WHEN type = 'DEBIT' THEN 1 END) as debit_count,
                    STDDEV(amount) as amount_stddev,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) as median_amount,
                    
                    -- Enhanced credit/debit comparison
                    CASE 
                        WHEN SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) > SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) 
                        THEN 'CREDIT_HIGHER' 
                        WHEN SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) < SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) 
                        THEN 'DEBIT_HIGHER' 
                        ELSE 'EQUAL' 
                    END as comparison_status,
                    
                    -- Absolute difference
                    ABS(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END)) as absolute_difference,
                    
                    -- Which is more and by how much
                    CASE 
                        WHEN SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) > SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) 
                        THEN SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END)
                        ELSE SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END)
                    END as difference_amount,
                    
                    -- Percentage of total
                    CASE 
                        WHEN SUM(amount) > 0 
                        THEN (SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) * 100.0 / SUM(amount))
                        ELSE 0 
                    END as credit_percentage_of_total,
                    
                    CASE 
                        WHEN SUM(amount) > 0 
                        THEN (SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) * 100.0 / SUM(amount))
                        ELSE 0 
                    END as debit_percentage_of_total
                FROM transactions
                ${whereClause}
            `;

            const overallResult = await pool.query(overallQuery, params);
            const overall = overallResult.rows[0];

            // Calculate derived values
            const totalCredit = parseFloat(overall?.total_credit || 0);
            const totalDebit = parseFloat(overall?.total_debit || 0);
            const totalAmount = parseFloat(overall?.total_amount || 0);
            const totalTransactions = parseInt(overall?.total_transactions || 0);
            const comparisonStatus = overall?.comparison_status || 'EQUAL';
            const absoluteDifference = parseFloat(overall?.absolute_difference || 0);
            const differenceAmount = parseFloat(overall?.difference_amount || 0);
            
            // Determine which is higher and create clear messages
            let higherType = '';
            let higherByAmount = 0;
            let higherMessage = '';
            let statusMessage = '';
            
            if (comparisonStatus === 'CREDIT_HIGHER') {
                higherType = 'CREDIT';
                higherByAmount = totalCredit - totalDebit;
                higherMessage = `Credit is ₹${higherByAmount.toFixed(2)} more than Debit`;
                statusMessage = 'Credit Amount is Higher';
            } else if (comparisonStatus === 'DEBIT_HIGHER') {
                higherType = 'DEBIT';
                higherByAmount = totalDebit - totalCredit;
                higherMessage = `Debit is ₹${higherByAmount.toFixed(2)} more than Credit`;
                statusMessage = 'Debit Amount is Higher';
            } else {
                higherType = 'EQUAL';
                higherByAmount = 0;
                higherMessage = 'Credit and Debit are equal';
                statusMessage = 'Credit and Debit are Equal';
            }

            // Query 2: Get summary by type with percentages
            const byTypeQuery = `
                SELECT 
                    type,
                    COUNT(*) as count,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount,
                    (COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM transactions ${whereClause}), 0)) as percentage_count,
                    (SUM(amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM transactions ${whereClause}), 0)) as percentage_amount
                FROM transactions
                ${whereClause}
                GROUP BY type
                ORDER BY total_amount DESC
            `;

            const byTypeResult = await pool.query(byTypeQuery, params);

            // Query 3: Get daily summary (last 30 days) with balance
            const dailySummaryQuery = `
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as transaction_count,
                    SUM(amount) as daily_amount,
                    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as daily_credit,
                    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_debit,
                    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_balance
                FROM transactions
                WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
                ${whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : ''}
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
                LIMIT 30
            `;

            const dailySummaryResult = await pool.query(dailySummaryQuery, params);

            // Query 4: Get top persons (both from and to) with balance
            const topPersonsQuery = `
                WITH person_transactions AS (
                    SELECT from_person as person, amount, type, timestamp FROM transactions
                    ${whereClause}
                    UNION ALL
                    SELECT to_person as person, amount, type, timestamp FROM transactions
                    ${whereClause}
                )
                SELECT 
                    person,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount_involved,
                    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credit_received,
                    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debit_given,
                    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as person_balance
                FROM person_transactions
                GROUP BY person
                ORDER BY total_amount_involved DESC
                LIMIT 5
            `;

            const topPersonsResult = await pool.query(topPersonsQuery, params);

            return {
                // Enhanced overall statistics with clear credit/debit comparison
                overall: {
                    // Basic statistics
                    total_transactions: totalTransactions,
                    total_amount: totalAmount,
                    average_amount: parseFloat(overall?.average_amount || 0),
                    min_amount: parseFloat(overall?.min_amount || 0),
                    max_amount: parseFloat(overall?.max_amount || 0),
                    median_amount: parseFloat(overall?.median_amount || 0),
                    amount_stddev: parseFloat(overall?.amount_stddev || 0),
                    
                    // Credit/Debit detailed breakdown
                    credit_details: {
                        total_amount: totalCredit,
                        transaction_count: parseInt(overall?.credit_count || 0),
                        average_amount: parseInt(overall?.credit_count || 0) > 0 ? (totalCredit / parseInt(overall?.credit_count || 0)).toFixed(2) : "0.00",
                        percentage_of_total: parseFloat(overall?.credit_percentage_of_total || 0).toFixed(2)
                    },
                    
                    debit_details: {
                        total_amount: totalDebit,
                        transaction_count: parseInt(overall?.debit_count || 0),
                        average_amount: parseInt(overall?.debit_count || 0) > 0 ? (totalDebit / parseInt(overall?.debit_count || 0)).toFixed(2) : "0.00",
                        percentage_of_total: parseFloat(overall?.debit_percentage_of_total || 0).toFixed(2)
                    },
                    
                    // Clear comparison results
                    comparison: {
                        status: comparisonStatus,
                        higher_type: higherType,
                        status_message: statusMessage,
                        difference_message: higherMessage,
                        
                        // Amount differences
                        credit_minus_debit: (totalCredit - totalDebit).toFixed(2),
                        absolute_difference: absoluteDifference.toFixed(2),
                        higher_by_amount: higherByAmount.toFixed(2),
                        
                        // Percentages
                        credit_percentage: totalAmount > 0 ? ((totalCredit / totalAmount) * 100).toFixed(2) : "0.00",
                        debit_percentage: totalAmount > 0 ? ((totalDebit / totalAmount) * 100).toFixed(2) : "0.00",
                        difference_percentage: Math.max(totalCredit, totalDebit) > 0 ? 
                            (absoluteDifference / Math.max(totalCredit, totalDebit) * 100).toFixed(2) : "0.00"
                    },
                    
                    // Financial summary
                    financial_summary: {
                        net_balance: (totalCredit - totalDebit).toFixed(2),
                        balance_status: totalCredit > totalDebit ? 'POSITIVE (More Credit)' : 
                                      totalDebit > totalCredit ? 'NEGATIVE (More Debit)' : 'BALANCED',
                        credit_to_debit_ratio: totalDebit > 0 ? (totalCredit / totalDebit).toFixed(2) : "N/A",
                        debit_to_credit_ratio: totalCredit > 0 ? (totalDebit / totalCredit).toFixed(2) : "N/A"
                    },
                    
                    // Daily averages
                    daily_averages: {
                        avg_transactions_per_day: totalTransactions > 0 ? (totalTransactions / 30).toFixed(2) : "0.00",
                        avg_amount_per_day: totalAmount > 0 ? (totalAmount / 30).toFixed(2) : "0.00",
                        avg_credit_per_day: totalCredit > 0 ? (totalCredit / 30).toFixed(2) : "0.00",
                        avg_debit_per_day: totalDebit > 0 ? (totalDebit / 30).toFixed(2) : "0.00"
                    }
                },

                // Breakdown by type
                by_type: byTypeResult.rows.map(row => ({
                    type: row.type,
                    count: parseInt(row.count || 0),
                    total_amount: parseFloat(row.total_amount || 0),
                    average_amount: parseFloat(row.average_amount || 0),
                    min_amount: parseFloat(row.min_amount || 0),
                    max_amount: parseFloat(row.max_amount || 0),
                    percentage_count: parseFloat(row.percentage_count || 0) || 0,
                    percentage_amount: parseFloat(row.percentage_amount || 0) || 0,
                    formatted_amount: `₹${parseFloat(row.total_amount || 0).toFixed(2)}`
                })),

                // Daily trends with balance
                daily_summary: dailySummaryResult.rows.map(row => ({
                    date: row.date,
                    transaction_count: parseInt(row.transaction_count || 0),
                    daily_amount: parseFloat(row.daily_amount || 0),
                    daily_credit: parseFloat(row.daily_credit || 0),
                    daily_debit: parseFloat(row.daily_debit || 0),
                    daily_balance: parseFloat(row.daily_balance || 0),
                    balance_status: parseFloat(row.daily_balance || 0) > 0 ? 'CREDIT_HIGHER' : 
                                  parseFloat(row.daily_balance || 0) < 0 ? 'DEBIT_HIGHER' : 'BALANCED'
                })),

                // Top persons involved with balance
                top_persons: topPersonsResult.rows.map(row => ({
                    person: row.person,
                    transaction_count: parseInt(row.transaction_count || 0),
                    total_amount_involved: parseFloat(row.total_amount_involved || 0),
                    total_credit_received: parseFloat(row.total_credit_received || 0),
                    total_debit_given: parseFloat(row.total_debit_given || 0),
                    person_balance: parseFloat(row.person_balance || 0),
                    balance_status: parseFloat(row.person_balance || 0) > 0 ? 'NET_CREDIT' : 
                                  parseFloat(row.person_balance || 0) < 0 ? 'NET_DEBIT' : 'BALANCED'
                }))
            };

        } catch (error) {
            console.error("Get transactions summary error:", error);
            throw error;
        }
    },

    // Get transactions by person for specific user
    async getByPerson(personName, filters = {}, userId = null) {
        try {
            // Build WHERE conditions
            const whereConditions = [];
            const params = [];
            
            const { 
                type,
                minAmount,
                maxAmount,
                startDate,
                endDate,
                sortBy = 'timestamp',
                sortOrder = 'DESC',
                offset = 0,
                limit = 20
            } = filters;

            // Filter by created_by
            if (userId) {
                whereConditions.push(`created_by = $${params.length + 1}`);
                params.push(userId);
            }

            // Filter by person (either from_person or to_person)
            whereConditions.push(`(from_person ILIKE $${params.length + 1} OR to_person ILIKE $${params.length + 1})`);
            params.push(`%${personName}%`);

            // Type filter
            if (type && ['CREDIT', 'DEBIT', 'TRANSFER'].includes(type.toUpperCase())) {
                whereConditions.push(`type = $${params.length + 1}`);
                params.push(type.toUpperCase());
            }

            // Amount range filters
            if (minAmount !== undefined && minAmount !== null) {
                whereConditions.push(`amount >= $${params.length + 1}`);
                params.push(parseFloat(minAmount));
            }

            if (maxAmount !== undefined && maxAmount !== null) {
                whereConditions.push(`amount <= $${params.length + 1}`);
                params.push(parseFloat(maxAmount));
            }

            // Date range filters
            if (startDate) {
                whereConditions.push(`timestamp >= $${params.length + 1}`);
                params.push(new Date(startDate));
            }

            if (endDate) {
                whereConditions.push(`timestamp <= $${params.length + 1}`);
                params.push(new Date(endDate));
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM transactions ${whereClause}`;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total, 10);

            // Validate sort field
            const validSortFields = ['id', 'from_person', 'to_person', 'amount', 'timestamp', 'created_at', 'type'];
            const sortField = validSortFields.includes(sortBy.toLowerCase()) ? sortBy : 'timestamp';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Get data
            const dataQuery = `
                SELECT * FROM transactions 
                ${whereClause}
                ORDER BY ${sortField} ${order}
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;

            const queryParams = [...params, limit, offset];
            const dataResult = await pool.query(dataQuery, queryParams);
            const data = dataResult.rows.map(row => this.formatTransaction(row));

            return {
                data,
                total,
                page: Math.floor(offset / limit) + 1,
                limit,
                totalPages: Math.ceil(total / limit)
            };

        } catch (error) {
            console.error("Get transactions by person error:", error);
            throw error;
        }
    },

    // Get recent transactions for specific user
    async getRecent(limit = 10, userId = null) {
        try {
            let query, params;
            
            if (userId) {
                query = `
                    SELECT * FROM transactions 
                    WHERE created_by = $1
                    ORDER BY timestamp DESC 
                    LIMIT $2
                `;
                params = [userId, limit];
            } else {
                query = `
                    SELECT * FROM transactions 
                    ORDER BY timestamp DESC 
                    LIMIT $1
                `;
                params = [limit];
            }

            const result = await pool.query(query, params);
            return result.rows.map(row => this.formatTransaction(row));
        } catch (error) {
            console.error("Get recent transactions error:", error);
            throw error;
        }
    },

    // Get transactions by date range for specific user
    async getByDateRange(startDate, endDate, filters = {}, userId = null) {
        try {
            // Build WHERE conditions
            const whereConditions = [];
            const params = [];
            
            const { 
                type,
                fromPerson,
                toPerson
            } = filters;

            // Validate dates
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                throw new Error("startDate cannot be after endDate");
            }

            // Filter by created_by
            if (userId) {
                whereConditions.push(`created_by = $${params.length + 1}`);
                params.push(userId);
            }

            // Date range filter
            whereConditions.push(`timestamp >= $${params.length + 1} AND timestamp <= $${params.length + 2}`);
            params.push(start, end);

            // Type filter
            if (type && ['CREDIT', 'DEBIT', 'TRANSFER'].includes(type.toUpperCase())) {
                whereConditions.push(`type = $${params.length + 1}`);
                params.push(type.toUpperCase());
            }

            // From person filter
            if (fromPerson && fromPerson.trim() !== "") {
                whereConditions.push(`from_person ILIKE $${params.length + 1}`);
                params.push(`%${fromPerson.trim()}%`);
            }

            // To person filter
            if (toPerson && toPerson.trim() !== "") {
                whereConditions.push(`to_person ILIKE $${params.length + 1}`);
                params.push(`%${toPerson.trim()}%`);
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            const query = `
                SELECT * FROM transactions 
                ${whereClause}
                ORDER BY timestamp DESC
            `;

            const result = await pool.query(query, params);
            return result.rows.map(row => this.formatTransaction(row));
        } catch (error) {
            console.error("Get transactions by date range error:", error);
            throw error;
        }
    }
};
