const pool = require("../config/database");

module.exports = {
    // Create a new transaction
    async create(transaction) {
        const query = `
            INSERT INTO transactions (
                from_person, to_person, amount, purpose, type
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const values = [
            transaction.from_person,
            transaction.to_person,
            transaction.amount,
            transaction.purpose,
            transaction.type
        ];

        try {
            const result = await pool.query(query, values);
            return this.formatTransaction(result.rows[0]);
        } catch (error) {
            console.error("Create transaction error:", error);
            throw error;
        }
    },

    // Get all transactions with filtering, pagination, and sorting
    async getAll(filters = {}) {
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
            const validSortFields = ['id', 'from_person', 'to_person', 'amount', 'timestamp', 'created_at', 'type'];
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

    // Get transaction by ID
    async getById(id) {
        try {
            const query = `
                SELECT * FROM transactions 
                WHERE id = $1
            `;
            
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

    // Update transaction
    async update(id, transaction) {
        const query = `
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

        const values = [
            transaction.from_person,
            transaction.to_person,
            transaction.amount,
            transaction.purpose,
            transaction.type,
            id
        ];

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

    // Delete transaction
    async delete(id) {
        try {
            const query = `DELETE FROM transactions WHERE id = $1 RETURNING *`;
            const result = await pool.query(query, [id]);
            
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

    // Format transaction object
    formatTransaction(row) {
        return {
            id: row.id.toString(),
            from_person: row.from_person,
            to_person: row.to_person,
            amount: parseFloat(row.amount),
            purpose: row.purpose,
            timestamp: row.timestamp,
            type: row.type,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    },

    // Get comprehensive transactions summary/statistics with clear credit/debit difference

    // ... (keep all existing methods: create, getAll, getById, update, delete, formatTransaction) ...

    // Get comprehensive transactions summary/statistics with clear credit/debit difference
   
    async getSummary(filters = {}) {
        try {
            // Build WHERE conditions
            const whereConditions = [];
            const params = [];
            
            const { startDate, endDate } = filters;

        if (startDate) {
            whereConditions.push(`timestamp >= $${params.length + 1}`);
            params.push(new Date(startDate));
        }

        if (endDate) {
            whereConditions.push(`timestamp <= $${params.length + 1}`);
            params.push(new Date(endDate));
        }

        // FIX: Build WHERE clause properly
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

        // Query 2: Get summary by type with percentages - FIXED subquery
        const byTypeQuery = `
            SELECT 
                type,
                COUNT(*) as count,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount,
                (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions ${whereClause})) as percentage_count,
                (SUM(amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM transactions ${whereClause}), 0)) as percentage_amount
            FROM transactions
            ${whereClause}
            GROUP BY type
            ORDER BY total_amount DESC
        `;

        const byTypeResult = await pool.query(byTypeQuery, params);

        // Query 3: Get daily summary (last 30 days) with balance - FIXED WHERE clause
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

        // Query 4: Get top persons (both from and to) with balance - FIXED WHERE clause
        const topPersonsQuery = `
            WITH person_transactions AS (
                SELECT from_person as person, amount, type, timestamp FROM transactions
                UNION ALL
                SELECT to_person as person, amount, type, timestamp FROM transactions
            )
            SELECT 
                person,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount_involved,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credit_received,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debit_given,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as person_balance
            FROM person_transactions
            ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
            GROUP BY person
            ORDER BY total_amount_involved DESC
            LIMIT 5
        `;

        const topPersonsResult = await pool.query(topPersonsQuery, params);

        // Query 5: Get recent activity (last 7 days) with balance - FIXED WHERE clause
        const recentActivityQuery = `
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as transaction_count,
                SUM(amount) as daily_amount,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as daily_credit,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_debit,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_balance
            FROM transactions
            WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
            ${whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : ''}
            GROUP BY DATE(timestamp)
            ORDER BY date
        `;

        const recentActivityResult = await pool.query(recentActivityQuery, params);

        // Query 6: Get amount distribution with credit/debit breakdown - FIXED subquery
        const amountDistributionQuery = `
            SELECT 
                CASE
                    WHEN amount <= 100 THEN '0-100'
                    WHEN amount <= 500 THEN '101-500'
                    WHEN amount <= 1000 THEN '501-1000'
                    WHEN amount <= 5000 THEN '1001-5000'
                    ELSE '5000+'
                END as amount_range,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as credit_amount,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as debit_amount,
                (COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM transactions ${whereClause}), 0)) as percentage
            FROM transactions
            ${whereClause}
            GROUP BY 
                CASE
                    WHEN amount <= 100 THEN '0-100'
                    WHEN amount <= 500 THEN '101-500'
                    WHEN amount <= 1000 THEN '501-1000'
                    WHEN amount <= 5000 THEN '1001-5000'
                    ELSE '5000+'
                END
            ORDER BY MIN(amount)
        `;

        const amountDistributionResult = await pool.query(amountDistributionQuery, params);

        // Query 7: Get hourly distribution with credit/debit breakdown
        const hourlyDistributionQuery = `
            SELECT 
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as credit_amount,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as debit_amount
            FROM transactions
            ${whereClause}
            GROUP BY EXTRACT(HOUR FROM timestamp)
            ORDER BY hour
        `;

        const hourlyDistributionResult = await pool.query(hourlyDistributionQuery, params);

        // Query 8: Get trend analysis (credit vs debit over time)
        const trendAnalysisQuery = `
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as daily_credit,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_debit,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_net_balance
            FROM transactions
            ${whereClause}
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 15
        `;

        const trendAnalysisResult = await pool.query(trendAnalysisQuery, params);

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
            })),

            // Recent activity with balance
            recent_activity: recentActivityResult.rows.map(row => ({
                date: row.date,
                transaction_count: parseInt(row.transaction_count || 0),
                daily_amount: parseFloat(row.daily_amount || 0),
                daily_credit: parseFloat(row.daily_credit || 0),
                daily_debit: parseFloat(row.daily_debit || 0),
                daily_balance: parseFloat(row.daily_balance || 0)
            })),

            // Amount distribution with credit/debit breakdown
            amount_distribution: amountDistributionResult.rows.map(row => ({
                amount_range: row.amount_range,
                transaction_count: parseInt(row.transaction_count || 0),
                total_amount: parseFloat(row.total_amount || 0),
                credit_amount: parseFloat(row.credit_amount || 0),
                debit_amount: parseFloat(row.debit_amount || 0),
                percentage: parseFloat(row.percentage || 0) || 0,
                credit_debit_ratio: parseFloat(row.debit_amount || 0) > 0 ? 
                    (parseFloat(row.credit_amount || 0) / parseFloat(row.debit_amount || 0)).toFixed(2) : "N/A"
            })),

            // Hourly distribution with credit/debit breakdown
            hourly_distribution: hourlyDistributionResult.rows.map(row => ({
                hour: parseInt(row.hour || 0),
                transaction_count: parseInt(row.transaction_count || 0),
                total_amount: parseFloat(row.total_amount || 0),
                credit_amount: parseFloat(row.credit_amount || 0),
                debit_amount: parseFloat(row.debit_amount || 0),
                hourly_balance: (parseFloat(row.credit_amount || 0) - parseFloat(row.debit_amount || 0)).toFixed(2)
            })),

            // Trend analysis
            trend_analysis: trendAnalysisResult.rows.map(row => ({
                date: row.date,
                transaction_count: parseInt(row.transaction_count || 0),
                daily_credit: parseFloat(row.daily_credit || 0),
                daily_debit: parseFloat(row.daily_debit || 0),
                daily_net_balance: parseFloat(row.daily_net_balance || 0),
                day_status: parseFloat(row.daily_net_balance || 0) > 0 ? 'CREDIT_DAY' : 
                          parseFloat(row.daily_net_balance || 0) < 0 ? 'DEBIT_DAY' : 'BALANCED_DAY'
            })),

            // Summary highlights (quick insights)
            summary_highlights: {
                // Main comparison
                main_comparison: {
                    total_credit_formatted: `₹${totalCredit.toFixed(2)}`,
                    total_debit_formatted: `₹${totalDebit.toFixed(2)}`,
                    difference_formatted: `₹${absoluteDifference.toFixed(2)}`,
                    status: statusMessage,
                    detailed_message: higherMessage,
                    percentage_difference: `${parseFloat(overall?.credit_percentage_of_total || 0).toFixed(2)}% Credit vs ${parseFloat(overall?.debit_percentage_of_total || 0).toFixed(2)}% Debit`
                },
                
                // Key metrics
                key_metrics: [
                    {
                        metric: "Total Credit Amount",
                        value: `₹${totalCredit.toFixed(2)}`,
                        description: "Sum of all CREDIT transactions"
                    },
                    {
                        metric: "Total Debit Amount",
                        value: `₹${totalDebit.toFixed(2)}`,
                        description: "Sum of all DEBIT transactions"
                    },
                    {
                        metric: "Net Balance",
                        value: `₹${(totalCredit - totalDebit).toFixed(2)}`,
                        description: totalCredit > totalDebit ? "Credit surplus" : "Debit surplus"
                    },
                    {
                        metric: "Credit Transactions",
                        value: `${parseInt(overall?.credit_count || 0)} transactions`,
                        description: "Number of CREDIT entries"
                    },
                    {
                        metric: "Debit Transactions",
                        value: `${parseInt(overall?.debit_count || 0)} transactions`,
                        description: "Number of DEBIT entries"
                    },
                    {
                        metric: "Average Credit",
                        value: parseInt(overall?.credit_count || 0) > 0 ? `₹${(totalCredit / parseInt(overall?.credit_count || 0)).toFixed(2)}` : "₹0.00",
                        description: "Average amount per CREDIT"
                    },
                    {
                        metric: "Average Debit",
                        value: parseInt(overall?.debit_count || 0) > 0 ? `₹${(totalDebit / parseInt(overall?.debit_count || 0)).toFixed(2)}` : "₹0.00",
                        description: "Average amount per DEBIT"
                    }
                ]
            },

            // Metadata
            metadata: {
                date_range: {
                    start_date: startDate || 'Not specified',
                    end_date: endDate || 'Not specified',
                    days_covered: startDate && endDate ? 
                        Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) : 'All time'
                },
                generated_at: new Date().toISOString(),
                filters_applied: Object.keys(filters).filter(key => filters[key]),
                summary_version: '3.2',
                calculation_notes: [
                    "Net Balance = Total Credit - Total Debit",
                    "Positive Balance = More Credit than Debit",
                    "Negative Balance = More Debit than Credit",
                    "Balance indicates financial position"
                ]
            }
        };

    } catch (error) {
        console.error("Get transactions summary error:", error);
        throw error;
    }
}



};