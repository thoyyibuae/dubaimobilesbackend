const pool = require('../config/database');

class Supplier {
    /**
     * Create a new supplier
     */
    
    static async create(supplierData) {
        const { name, address, phone_number, created_by } = supplierData;
        const query = `
            INSERT INTO suppliers (name, address, phone_number, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [name, address, phone_number, created_by];
        const result = await pool.query(query, values);
        return result.rows[0];
    }



    /**
     * Find all suppliers with pagination and filters
     */
    static async findAllWithFilters(filters = {}) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            sortOrder = 'DESC',
            search = '',
            phoneNumber = '',
            createdBy = null
        } = filters;

        const offset = (page - 1) * limit;
        
        // Build WHERE clause dynamically
        const whereConditions = [];
        const queryParams = [];
        let paramCount = 1;

        // Always add created_by filter if provided
        if (createdBy !== null) {
            whereConditions.push(`created_by = $${paramCount}`);
            queryParams.push(createdBy);
            paramCount++;
        }

        if (search) {
            whereConditions.push(`(name ILIKE $${paramCount} OR address ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        if (phoneNumber) {
            whereConditions.push(`phone_number ILIKE $${paramCount}`);
            queryParams.push(`%${phoneNumber}%`);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        // Validate sortBy to prevent SQL injection
        const validSortColumns = ['id', 'name', 'address', 'phone_number', 'created_at', 'updated_at', 'created_by'];
        const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) FROM suppliers 
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].count);

        // Get paginated data - include created_by in SELECT
        const dataQuery = `
            SELECT 
                id,
                name,
                address,
                phone_number,
                created_by,
                created_at,
                updated_at
            FROM suppliers 
            ${whereClause}
            ORDER BY ${safeSortBy} ${safeSortOrder}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const dataParams = [...queryParams, limit, offset];
        const dataResult = await pool.query(dataQuery, dataParams);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        return {
            data: dataResult.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: totalPages,
                totalItems: totalCount,
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                nextPage: page < totalPages ? page + 1 : null,
                previousPage: page > 1 ? page - 1 : null
            },
            filters: {
                search,
                phoneNumber,
                sortBy: safeSortBy,
                sortOrder: safeSortOrder,
                createdBy: createdBy
            }
        };
    }

    /**
     * Find supplier by ID
     */
    static async findById(id, userId = null) {
        let query = `
            SELECT 
                id,
                name,
                address,
                phone_number,
                created_by,
                created_at,
                updated_at
            FROM suppliers 
            WHERE id = $1
        `;
        
        const queryParams = [id];
        
        // Always add created_by filter if userId is provided
        if (userId !== null) {
            query += ` AND created_by = $2`;
            queryParams.push(userId);
        }
        
        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    /**
     * Update supplier (full update)
     */
    static async update(id, supplierData) {
        const { name, address, phone_number } = supplierData;
        const query = `
            UPDATE suppliers 
            SET 
                name = $1, 
                address = $2, 
                phone_number = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        const values = [name, address, phone_number, id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Partially update supplier
     */
    static async partialUpdate(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic SET clause
        for (const [key, value] of Object.entries(updateData)) {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }

        // Add updated_at
        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        // Add ID to values
        values.push(id);

        const query = `
            UPDATE suppliers 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Delete supplier
     */
    static async delete(id) {
        const query = 'DELETE FROM suppliers WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Search suppliers by name with pagination
     */
    static async searchByName(name, page = 1, limit = 10, userId = null) {
        const offset = (page - 1) * limit;
        
        // Build WHERE clause
        let whereClause = 'WHERE name ILIKE $1';
        const queryParams = [`%${name}%`];
        let paramCount = 2;
        
        // Always add created_by filter if userId is provided
        if (userId !== null) {
            whereClause += ` AND created_by = $${paramCount}`;
            queryParams.push(userId);
            paramCount++;
        }
        
        // Get total count for search
        const countQuery = `SELECT COUNT(*) FROM suppliers ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        // Get paginated search results
        const dataQuery = `
            SELECT 
                id,
                name,
                address,
                phone_number,
                created_by,
                created_at,
                updated_at
            FROM suppliers 
            ${whereClause}
            ORDER BY name 
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const dataParams = [...queryParams, limit, offset];
        const dataResult = await pool.query(dataQuery, dataParams);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        return {
            data: dataResult.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: totalPages,
                totalItems: totalCount,
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                nextPage: page < totalPages ? page + 1 : null,
                previousPage: page > 1 ? page - 1 : null
            },
            filters: {
                searchName: name,
                createdBy: userId
            }
        };
    }

    /**
     * Get total count of suppliers
     */
    static async getCount(userId = null) {
        let query = 'SELECT COUNT(*) FROM suppliers';
        const queryParams = [];
        
        // Always add created_by filter if userId is provided
        if (userId !== null) {
            query += ' WHERE created_by = $1';
            queryParams.push(userId);
        }
        
        const result = await pool.query(query, queryParams);
        return parseInt(result.rows[0].count);
    }

    /**
     * Find suppliers by phone number
     */
    static async findByPhoneNumber(phoneNumber, userId = null) {
        let query = 'SELECT * FROM suppliers WHERE phone_number = $1';
        const queryParams = [phoneNumber];
        
        // Always add created_by filter if userId is provided
        if (userId !== null) {
            query += ' AND created_by = $2';
            queryParams.push(userId);
        }
        
        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    /**
     * Check if supplier name exists
     */
    static async nameExists(name, excludeId = null, userId = null) {
        let query = 'SELECT id FROM suppliers WHERE name = $1';
        const params = [name];
        let paramCount = 2;
        
        if (excludeId) {
            query += ` AND id != $${paramCount}`;
            params.push(excludeId);
            paramCount++;
        }
        
        // Always add created_by filter if userId is provided
        if (userId !== null) {
            query += ` AND created_by = $${paramCount}`;
            params.push(userId);
        }
        
        const result = await pool.query(query, params);
        return result.rows.length > 0;
    }

    /**
     * Get suppliers created within a date range
     */
    static async getByDateRange(startDate, endDate, page = 1, limit = 10, userId = null) {
        const offset = (page - 1) * limit;
        
        // Build WHERE clause
        let whereClause = 'WHERE created_at BETWEEN $1 AND $2';
        const queryParams = [startDate, endDate];
        let paramCount = 3;
        
        // Always add created_by filter if userId is provided
        if (userId !== null) {
            whereClause += ` AND created_by = $${paramCount}`;
            queryParams.push(userId);
            paramCount++;
        }
        
        const countQuery = `
            SELECT COUNT(*) FROM suppliers 
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        const dataQuery = `
            SELECT * FROM suppliers 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const dataParams = [...queryParams, limit, offset];
        const dataResult = await pool.query(dataQuery, dataParams);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        return {
            data: dataResult.rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit
            }
        };
    }
}


module.exports = Supplier;