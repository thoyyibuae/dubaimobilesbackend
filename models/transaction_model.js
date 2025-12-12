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

    // Get transactions summary/statistics
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

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Query 1: Get overall summary
            const overallQuery = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount
                FROM transactions
                ${whereClause}
            `;

            const overallResult = await pool.query(overallQuery, params);

            // Query 2: Get summary by type
            const byTypeQuery = `
                SELECT 
                    type,
                    COUNT(*) as count,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount
                FROM transactions
                ${whereClause}
                GROUP BY type
                ORDER BY type
            `;

            const byTypeResult = await pool.query(byTypeQuery, params);

            return {
                summary: byTypeResult.rows.map(row => ({
                    type: row.type,
                    count: parseInt(row.count || 0),
                    total_amount: parseFloat(row.total_amount || 0),
                    average_amount: parseFloat(row.average_amount || 0),
                    min_amount: parseFloat(row.min_amount || 0),
                    max_amount: parseFloat(row.max_amount || 0)
                })),
                overall: {
                    total_transactions: parseInt(overallResult.rows[0]?.total_transactions || 0),
                    total_amount: parseFloat(overallResult.rows[0]?.total_amount || 0),
                    average_amount: parseFloat(overallResult.rows[0]?.average_amount || 0),
                    min_amount: parseFloat(overallResult.rows[0]?.min_amount || 0),
                    max_amount: parseFloat(overallResult.rows[0]?.max_amount || 0)
                }
            };

        } catch (error) {
            console.error("Get transactions summary error:", error);
            throw error;
        }
    }
};