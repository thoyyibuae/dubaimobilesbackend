const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// =============== VALIDATION MIDDLEWARE ===============

const validateDepartmentData = (req, res, next) => {
  const {
    branchId,
    type,
    name,
    headId,
    staffCount,
    isActive,
    budget
  } = req.body;

  const errors = [];

  if (!branchId || branchId.toString().trim().length === 0) {
    errors.push('Branch ID is required');
  }

  if (!type || type.trim().length === 0) {
    errors.push('Department type is required');
  }

  if (!name || name.trim().length === 0) {
    errors.push('Department name is required');
  }

  if (!headId || headId.trim().length === 0) {
    errors.push('Department head ID is required');
  }

  if (staffCount !== undefined && (isNaN(staffCount) || staffCount < 0)) {
    errors.push('Staff count must be a non-negative number');
  }

  if (budget !== undefined && (isNaN(budget) || budget < 0)) {
    errors.push('Budget must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

// =============== DEPARTMENT CRUD OPERATIONS ===============

// CREATE DEPARTMENT (Admin/Manager only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  validateDepartmentData,
  async (req, res) => {
    try {
      console.log('📝 Creating department:', req.body);

      // Check if head is already assigned to another department
      const headCheck = await pool.query(
        'SELECT COUNT(*) FROM departments WHERE head_id = $1',
        [req.body.headId]
      );
      
      if (parseInt(headCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'This person is already assigned as head of another department'
        });
      }

      // Check if branch exists
      const branchCheck = await pool.query(
        'SELECT id FROM branches WHERE id = $1',
        [req.body.branchId]
      );
      
      if (branchCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      const query = `
        INSERT INTO departments (
          branch_id, type, name, head_id, staff_count, is_active,
          description, contact_email, contact_phone, location, budget, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      
      const values = [
        req.body.branchId,
        req.body.type,
        req.body.name,
        req.body.headId,
        req.body.staffCount || 0,
        req.body.isActive !== undefined ? req.body.isActive : true,
        req.body.description || null,
        req.body.contactEmail || null,
        req.body.contactPhone || null,
        req.body.location || null,
        req.body.budget || 0.00,
        req.user.userId  // REMOVED the extra created_by from request body
      ];

      const result = await pool.query(query, values);
      
      console.log('✅ Department created:', result.rows[0].id);
      
      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Create department error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create department',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);



router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      branchId,
      // activeOnly = 'true',
      type,
      search,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = req.query;

    
    let query = `
      SELECT 
        d.*,
        b.name as branch_name,
        b.code as branch_code,
        u.name as head_name
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.head_id = u.id::VARCHAR
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Apply filters
    if (branchId) {
      query += ` AND d.branch_id = $${paramCount}`;
      params.push(parseInt(branchId));
      paramCount++;
    }

    // Only filter by is_active when activeOnly is 'true'
  // To show only INACTIVE departments when activeOnly='false'
// if (activeOnly === 'true') {
//   query += ` AND d.is_active = $${paramCount}`;
//   params.push(true);
//   paramCount++;
// } else if (activeOnly === 'false') {
//   query += ` AND d.is_active = $${paramCount}`;
//   params.push(false);
//   paramCount++;

// }

    if (type && type.trim() !== '') {
      query += ` AND d.type ILIKE $${paramCount}`;
      params.push(`%${type.trim()}%`);
      paramCount++;
    }

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (
        d.name ILIKE $${paramCount} OR 
        d.type ILIKE $${paramCount} OR 
        COALESCE(d.description, '') ILIKE $${paramCount} OR
        COALESCE(d.contact_email, '') ILIKE $${paramCount} OR
        COALESCE(d.contact_phone, '') ILIKE $${paramCount} OR
        COALESCE(d.location, '') ILIKE $${paramCount} OR
        b.name ILIKE $${paramCount}
      )`;
      params.push(searchTerm);
      paramCount++;
    }

    // Validate sort column
    const validSortColumns = ['id', 'name', 'type', 'staff_count', 'budget', 'created_at', 'updated_at', 'branch_name'];
    const sortColumn = validSortColumns.includes(sortBy) ? 
      (sortBy === 'branch_name' ? 'b.name' : `d.${sortBy}`) : 
      'd.name';
    
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.head_id = u.id::VARCHAR
      WHERE 1=1
    `;
    
    // Apply the same filters to count query using the same params
    const countParams = [];
    let countParamCount = 1;

    if (branchId) {
      countQuery += ` AND d.branch_id = $${countParamCount}`;
      countParams.push(parseInt(branchId));
      countParamCount++;
    }




    // if (activeOnly === 'true') {
    //   countQuery += ` AND d.is_active = $${countParamCount}`;
    //   countParams.push(true);
    //   countParamCount++;
    // }
    //   else if (activeOnly === 'false') {
    //   countQuery += ` AND d.is_active = $${countParamCount}`;
    //   countParams.push(false);
    //   countParamCount++;
    // }


    if (type && type.trim() !== '') {
      countQuery += ` AND d.type ILIKE $${countParamCount}`;
      countParams.push(`%${type.trim()}%`);
      countParamCount++;
    }

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      countQuery += ` AND (
        d.name ILIKE $${countParamCount} OR 
        d.type ILIKE $${countParamCount} OR 
        COALESCE(d.description, '') ILIKE $${countParamCount} OR
        COALESCE(d.contact_email, '') ILIKE $${countParamCount} OR
        COALESCE(d.contact_phone, '') ILIKE $${countParamCount} OR
        COALESCE(d.location, '') ILIKE $${countParamCount} OR
        b.name ILIKE $${countParamCount}
      )`;
      countParams.push(searchTerm);
      countParamCount++;
    }

    // Get count
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    
    // Add pagination to main query
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum);
    params.push(offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        branch_id: row.branch_id,
        type: row.type,
        name: row.name,
        head_id: row.head_id,
        staff_count: row.staff_count,
        is_active: row.is_active,
        description: row.description,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        location: row.location,
        budget: row.budget,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        branch_name: row.branch_name
        // Removed branch_code and head_name as per your expected response
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum)
      },
      filters: {
        search: search || null,
        type: type || null,
        // activeOnly: activeOnly,
        sortBy,
        sortOrder: order.toLowerCase()
      }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  }
});



// GET DEPARTMENT BY ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        d.*,
        b.name as branch_name,
        b.code as branch_code,
        b.city as branch_city,
        b.country as branch_country,
        u.name as head_name,
        u.email as head_email,
        uc.name as created_by_name
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.head_id = u.id::VARCHAR
      LEFT JOIN users uc ON d.created_by = uc.id::VARCHAR
      WHERE d.id = $1;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      url:"get api department"
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department'
    });
  }
});

// GET DEPARTMENTS BY BRANCH ID with advanced search and filters
router.get('/branch/:branchId', authenticateToken, async (req, res) => {
  try {
    const { branchId } = req.params;
    const { 
      page = 1, 
      limit = 20,
      search = '',
      type = '',
      activeOnly = 'false',
      sortBy = 'name',
      sortOrder = 'ASC'
    } = req.query;
    
    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build query conditions
    let whereClause = 'WHERE d.branch_id = $1';
    const params = [parseInt(branchId)];
    let paramCount = 2;

    // Add search condition
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      whereClause += ` AND (
        d.name ILIKE $${paramCount} OR 
        d.type ILIKE $${paramCount} OR 
        COALESCE(d.description, '') ILIKE $${paramCount} OR
        COALESCE(d.contact_email, '') ILIKE $${paramCount} OR
        COALESCE(d.contact_phone, '') ILIKE $${paramCount} OR
        COALESCE(d.location, '') ILIKE $${paramCount}
      )`;
      params.push(searchTerm);
      paramCount++;
    }

    // Add type filter
    if (type && type.trim() !== '') {
      whereClause += ` AND d.type ILIKE $${paramCount}`;
      params.push(`%${type.trim()}%`);
      paramCount++;
    }

    // Add active only filter
    if (activeOnly === 'true') {
      whereClause += ` AND d.is_active = $${paramCount}`;
      params.push(true);
      paramCount++;
    }

    else if (activeOnly === 'false') {
      whereClause += ` AND d.is_active = $${paramCount}`;
      params.push(false);
      paramCount++;
    }



    // Validate and set sort column
    const validSortColumns = ['name', 'type', 'created_at', 'staff_count', 'budget', 'is_active'];
    const sortColumn = validSortColumns.includes(sortBy.toLowerCase()) ? sortBy.toLowerCase() : 'name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count with all filters
    const countQuery = `
      SELECT COUNT(*) 
      FROM departments d
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated departments
    const result = await pool.query(
      `SELECT 
        d.*, 
        b.name as branch_name
       FROM departments d
       LEFT JOIN branches b ON d.branch_id = b.id
       LEFT JOIN users u ON u.id::text = d.head_id
       ${whereClause}
       ORDER BY d.${sortColumn} ${order}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    // Prepare response
    const response = {
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum)
      },
      filters: {
        search: search || null,
        type: type || null,
        activeOnly: activeOnly === 'true',
        sortBy: sortColumn,
        sortOrder: order.toLowerCase()
      }
    };

    // Add message for no results
    if (result.rows.length === 0) {
      let message = 'No departments found';
      
      if (search || type || activeOnly === 'true') {
        message += ' with the current filters';
        if (search) message += ` matching "${search}"`;
        if (type) message += ` of type "${type}"`;
        if (activeOnly === 'true') message += ` (active only)`;
      }
      
      response.message = message;
    }

    res.json(response);
  } catch (error) {
    console.error('Get branch departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  }
});

// UPDATE DEPARTMENT (Admin/Manager only)
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if department exists
      const deptCheck = await pool.query(
        'SELECT id, head_id, branch_id FROM departments WHERE id = $1',
        [id]
      );
      
      if (deptCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Department not found'
        });
      }

      const currentDepartment = deptCheck.rows[0];

      // If branchId is being updated, check if new branch exists
      if (req.body.branchId && req.body.branchId !== currentDepartment.branch_id) {
        const branchCheck = await pool.query(
          'SELECT id FROM branches WHERE id = $1',
          [req.body.branchId]
        );
        
        if (branchCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Branch not found. Please provide a valid branch ID'
          });
        }
      }

      // If headId is being updated, check availability
      if (req.body.headId && req.body.headId !== currentDepartment.head_id) {
        const headCheck = await pool.query(
          'SELECT COUNT(*) FROM departments WHERE head_id = $1 AND id != $2',
          [req.body.headId, id]
        );
        
        if (parseInt(headCheck.rows[0].count) > 0) {
          return res.status(400).json({
            success: false,
            error: 'This person is already assigned as head of another department'
          });
        }
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields for update
      const allowedFields = [
        'branch_id', 'type', 'name', 'head_id', 'staff_count', 'is_active',
        'description', 'contact_email', 'contact_phone', 'location', 'budget'
      ];

      // Add only allowed fields that are provided in request body
      allowedFields.forEach(field => {
        const camelCaseField = field.replace(/_([a-z])/g, g => g[1].toUpperCase());
        if (req.body[camelCaseField] !== undefined) {
          // Special handling for null/empty values
          let value = req.body[camelCaseField];
          
          // Convert empty strings to null for optional fields
          if (value === '' && ['description', 'contact_email', 'contact_phone', 'location'].includes(field)) {
            value = null;
          }
          
          updates.push(`${field} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      // Add updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add department ID as the last parameter
      values.push(id);

      const query = `
        UPDATE departments 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *;
      `;

      const result = await pool.query(query, values);

      res.json({
        success: true,
        message: 'Department updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Update department error:', error);
      
      // Handle specific database errors
      if (error.code === '23503') { // Foreign key violation
        if (error.constraint === 'departments_branch_id_fkey') {
          return res.status(400).json({
            success: false,
            error: 'Invalid branch ID. The specified branch does not exist.'
          });
        } else if (error.constraint === 'departments_head_id_fkey') {
          return res.status(400).json({
            success: false,
            error: 'Invalid head ID. The specified employee does not exist.'
          });
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update department',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE DEPARTMENT (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if department exists
      const deptCheck = await pool.query(
        'SELECT id FROM departments WHERE id = $1',
        [id]
      );
      
      if (deptCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Department not found'
        });
      }

      await pool.query('DELETE FROM departments WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete department'
      });
    }
  }
);

// =============== DEPARTMENT ANALYTICS ===============

// GET DEPARTMENT STATISTICS
router.get('/stats/overall', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_departments,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_departments,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_departments,
        SUM(staff_count) as total_staff,
        AVG(staff_count) as avg_staff_per_dept,
        SUM(budget) as total_budget,
        AVG(budget) as avg_budget_per_dept,
        COUNT(DISTINCT type) as unique_types
      FROM departments;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department statistics'
    });
  }
});

// GET BRANCH DEPARTMENT STATISTICS
router.get('/stats/branch/:branchId', authenticateToken, async (req, res) => {
  try {
    const { branchId } = req.params;

    const query = `
      SELECT 
        COUNT(*) as total_departments,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_departments,
        SUM(staff_count) as total_staff,
        SUM(budget) as total_budget
      FROM departments
      WHERE branch_id = $1;
    `;

    const result = await pool.query(query, [branchId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get branch department stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch department statistics'
    });
  }
});

// GET USED DEPARTMENT TYPES
router.get('/types/used', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT type 
      FROM departments 
      WHERE type IS NOT NULL AND type != ''
      ORDER BY type;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => row.type)
    });
  } catch (error) {
    console.error('Get used department types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department types'
    });
  }
});

// =============== DEPARTMENT SEARCH ===============

// SEARCH DEPARTMENTS
router.get('/search/quick', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const query = `
      SELECT d.id, d.name, d.type, d.branch_id, b.name as branch_name
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      WHERE d.name ILIKE $1 OR d.type ILIKE $1 OR b.name ILIKE $1
      LIMIT 10;
    `;

    const result = await pool.query(query, [`%${q}%`]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search departments'
    });
  }
});

module.exports = router;