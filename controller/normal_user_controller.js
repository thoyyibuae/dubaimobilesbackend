const pool = require('../config/normal_users_db');

// Helper: Format user data
const formatUser = (user) => {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        branch_id: user.branch_id || null,
        role: user.role || 'user',
        status: user.status || 'active',
        created_at: user.created_at,
        updated_at: user.updated_at
    };
};

// Helper: Validate user input
const validateUserInput = (userData, isUpdate = false) => {
    const errors = [];
    
    if (!isUpdate || userData.name !== undefined) {
        if (!userData.name || userData.name.trim() === '') {
            errors.push('Name is required');
        } else if (userData.name.length > 255) {
            errors.push('Name cannot exceed 255 characters');
        }
    }
    
    if (!isUpdate || userData.email !== undefined) {
        if (!userData.email || userData.email.trim() === '') {
            errors.push('Email is required');
        } else if (userData.email.length > 255) {
            errors.push('Email cannot exceed 255 characters');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                errors.push('Invalid email format');
            }
        }
    }
    
    if (userData.phone && userData.phone.length > 20) {
        errors.push('Phone number cannot exceed 20 characters');
    }

                         
                          
                         
    if (userData.role) {
        const validRoles = [ 
            'user', 'accountant', 'technician',
            'salesPerson','hr','manager'
            , 'staff'];
        if (!validRoles.includes(userData.role)) {
            errors.push(`Role must be one of: ${validRoles.join(', ')}`);
        }
    }
    
    if (userData.status) {
        const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
        if (!validStatuses.includes(userData.status)) {
            errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
        }
    }
    
    return errors;
};

const NormalUserController = {
    // Create a new normal user
    create: async (req, res) => {
        try {
            const { name, email, phone, branch_id, role = 'user', status = 'active' } = req.body;
            
            // Validate input
            const errors = validateUserInput({ name, email, phone, role, status });
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            
            // Check if email already exists
            const existingUser = await pool.query(
                'SELECT id FROM normal_users WHERE email = $1',
                [email]
            );
            
            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            // Insert new user
            const result = await pool.query(
                `INSERT INTO normal_users 
                (name, email, phone, branch_id, role, status) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING *`,
                [name, email, phone, branch_id, role, status]
            );
            
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: formatUser(result.rows[0])
            });
            
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user',
                error: error.message
            });
        }
    },

    // Get all normal users with pagination and filters
    getAll: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                role,
                branch_id,
                status,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = req.query;
            
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;
            
            // Build WHERE conditions
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;
            
            if (search) {
                whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }
            
            if (role) {
                whereConditions.push(`role = $${paramIndex}`);
                params.push(role);
                paramIndex++;
            }
            
            if (branch_id) {
                whereConditions.push(`branch_id = $${paramIndex}`);
                params.push(branch_id);
                paramIndex++;
            }
            
            if (status) {
                whereConditions.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }
            
            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';
            
            // Get total count
            const countResult = await pool.query(
                `SELECT COUNT(*) as total FROM normal_users ${whereClause}`,
                params
            );
            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limitNum);
            
            // Get data with pagination
            const validSortFields = ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at'];
            const sortField = validSortFields.includes(sortBy.toLowerCase()) ? sortBy : 'created_at';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            
            const dataResult = await pool.query(
                `SELECT * FROM normal_users 
                 ${whereClause} 
                 ORDER BY ${sortField} ${order} 
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...params, limitNum, offset]
            );
            
            res.json({
                success: true,
                message: 'Users fetched successfully',
                data: dataResult.rows.map(formatUser),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            });
            
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: error.message
            });
        }
    },

    // Get user by ID
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await pool.query(
                'SELECT * FROM normal_users WHERE id = $1',
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                message: 'User fetched successfully',
                data: formatUser(result.rows[0])
            });
            
        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user',
                error: error.message
            });
        }
    },

    // Update user
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            // Check if user exists
            const existingUser = await pool.query(
                'SELECT * FROM normal_users WHERE id = $1',
                [id]
            );
            
            if (existingUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Validate updates
            const errors = validateUserInput(updates, true);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            
            // Check email uniqueness if updating email
            if (updates.email && updates.email !== existingUser.rows[0].email) {
                const emailCheck = await pool.query(
                    'SELECT id FROM normal_users WHERE email = $1 AND id != $2',
                    [updates.email, id]
                );
                
                if (emailCheck.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email already exists'
                    });
                }
            }
            
            // Build dynamic update query
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            
            if (updates.name !== undefined) {
                updateFields.push(`name = $${paramIndex}`);
                values.push(updates.name);
                paramIndex++;
            }
            
            if (updates.email !== undefined) {
                updateFields.push(`email = $${paramIndex}`);
                values.push(updates.email);
                paramIndex++;
            }
            
            if (updates.phone !== undefined) {
                updateFields.push(`phone = $${paramIndex}`);
                values.push(updates.phone);
                paramIndex++;
            }
            
            if (updates.branch_id !== undefined) {
                updateFields.push(`branch_id = $${paramIndex}`);
                values.push(updates.branch_id);
                paramIndex++;
            }
            
            if (updates.role !== undefined) {
                updateFields.push(`role = $${paramIndex}`);
                values.push(updates.role);
                paramIndex++;
            }
            
            if (updates.status !== undefined) {
                updateFields.push(`status = $${paramIndex}`);
                values.push(updates.status);
                paramIndex++;
            }
            
            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }
            
            values.push(id);
            
            const updateQuery = `
                UPDATE normal_users 
                SET ${updateFields.join(', ')} 
                WHERE id = $${paramIndex} 
                RETURNING *
            `;
            
            const result = await pool.query(updateQuery, values);
            
            res.json({
                success: true,
                message: 'User updated successfully',
                data: formatUser(result.rows[0])
            });
            
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user',
                error: error.message
            });
        }
    },

    // Delete user
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Check if user exists
            const existingUser = await pool.query(
                'SELECT * FROM normal_users WHERE id = $1',
                [id]
            );
            
            if (existingUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Delete user
            await pool.query(
                'DELETE FROM normal_users WHERE id = $1',
                [id]
            );
            
            res.json({
                success: true,
                message: 'User deleted successfully',
                data: formatUser(existingUser.rows[0])
            });
            
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    },

    // Get user statistics
    getStats: async (req, res) => {
        try {
            const statsQueries = {
                total: 'SELECT COUNT(*) as count FROM normal_users',
                active: 'SELECT COUNT(*) as count FROM normal_users WHERE status = \'active\'',
                byRole: 'SELECT role, COUNT(*) as count FROM normal_users GROUP BY role ORDER BY count DESC',
                byStatus: 'SELECT status, COUNT(*) as count FROM normal_users GROUP BY status ORDER BY count DESC'
            };
            
            const results = {};
            
            for (const [key, query] of Object.entries(statsQueries)) {
                const result = await pool.query(query);
                results[key] = result.rows;
            }
            
            res.json({
                success: true,
                message: 'Statistics fetched successfully',
                data: results
            });
            
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics',
                error: error.message
            });
        }
    },

    // Search users
    search: async (req, res) => {
        try {
            const { query } = req.query;
            
            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }
            
            const result = await pool.query(
                `SELECT * FROM normal_users 
                 WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 
                 LIMIT 20`,
                [`%${query}%`]
            );
            
            res.json({
                success: true,
                message: 'Search completed successfully',
                data: result.rows.map(formatUser),
                count: result.rows.length
            });
            
        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search users',
                error: error.message
            });
        }
    }
};

module.exports = NormalUserController;