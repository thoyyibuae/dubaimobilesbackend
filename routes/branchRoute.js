const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// =============== VALIDATION MIDDLEWARE ===============

const validateBranchData = (req, res, next) => {
  const {
    name,
    code,
    address,
    city,
    state,
    country,
    postalCode,
    phone,
    email,
    managerId,
    latitude,
    longitude,
    openingDate
  } = req.body;

  const errors = [];

  if (!name || name.trim().length === 0) errors.push('Branch name is required');
  if (!code || code.trim().length === 0) errors.push('Branch code is required');
  if (!address || address.trim().length === 0) errors.push('Address is required');
  if (!city || city.trim().length === 0) errors.push('City is required');
  if (!state || state.trim().length === 0) errors.push('State is required');
  if (!country || country.trim().length === 0) errors.push('Country is required');
  if (!postalCode || postalCode.trim().length === 0) errors.push('Postal code is required');
  if (!phone || phone.trim().length === 0) errors.push('Phone number is required');
  if (!email || email.trim().length === 0) errors.push('Email is required');
  if (!managerId || managerId.trim().length === 0) errors.push('Manager ID is required');
  if (!openingDate) errors.push('Opening Date is required');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) errors.push('Invalid email format');
  
  if (latitude && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
    errors.push('Latitude must be between -90 and 90');
  }
  if (longitude && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
    errors.push('Longitude must be between -180 and 180');
  }

  if (openingDate) {
    const date = new Date(openingDate);
    if (isNaN(date.getTime())) {
      errors.push('Opening Date must be a valid date');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      errors 
    });
  }
  next();
};

// =============== BRANCH CRUD OPERATIONS ===============

// CREATE BRANCH (Admin/Manager only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  validateBranchData,
  async (req, res) => {
    try {

      console.log(req.user,"==============");
      console.log('Creating branch:', req.body);
      
      // Check if branch code already exists
      const existingBranch = await pool.query(
        'SELECT id FROM branches WHERE code = $1',
        [req.body.code]
      );
      
      if (existingBranch.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Branch code already exists'
        });
      }

      const query = `
        INSERT INTO branches (
          name, code, address, city, state, country, postal_code,
          phone, email, manager_id, latitude, longitude, opening_date,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `;
      
      const values = [
        req.body.name,
        req.body.code,
        req.body.address,
        req.body.city,
        req.body.state,
        req.body.country,
        req.body.postalCode,
        req.body.phone,
        req.body.email,
        req.body.managerId,
        req.body.latitude || 0.0,
        req.body.longitude || 0.0,
        req.body.openingDate,
        req.body.status || 'active',
        req.user.userId
      ];

      const result = await pool.query(query, values);
      
      console.log('Branch created:', result.rows[0].id);
      
      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Create branch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create branch',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET ALL BRANCHES (with filters and pagination)
// GET ALL BRANCHES (with proper department details - FIXED)
// router.get('/', authenticateToken, async (req, res) => {

//   console.log("143 >>>>>>");
// console.log(req.user.userId);

//   try {
//     const { 
//       page = 1, 
//       limit = 20, 
//       status, 
//       country, 
//       city, 
//       search,
//       sortBy = 'created_at',
//       sortOrder = 'DESC'
//     } = req.query;

//     console.log("143 >>>>>>");
// console.log(req.user.userId);
// //  "created_by": "1",
//     // First, get branches with counts
//     let query = `
//       SELECT 
//         b.*,
//         (
//           SELECT COUNT(*) 
//           FROM departments d 
//           WHERE d.branch_id = b.id
//         ) as department_count
//       FROM branches b
//       WHERE 1=1
//        AND b.created_by = $1 
//     `;
    
//     const params = [];
//     let paramCount = 1;

//     // Apply filters
//     if (status) {
//       query += ` AND b.status = $${paramCount}`;
//       params.push(status.toLowerCase());
//       paramCount++;
//     }

//     if (country) {
//       query += ` AND b.country = $${paramCount}`;
//       params.push(country);
//       paramCount++;
//     }

//     if (city) {
//       query += ` AND b.city = $${paramCount}`;
//       params.push(city);
//       paramCount++;
//     }

//     if (search) {
//       query += ` AND (
//         b.name ILIKE $${paramCount} OR 
//         b.code ILIKE $${paramCount} OR 
//         b.city ILIKE $${paramCount} OR 
//         b.email ILIKE $${paramCount}
//       )`;
//       params.push(`%${search}%`);
//       paramCount++;
//     }

//     // Add sorting
//     const validSortColumns = ['name', 'code', 'city', 'country', 'status', 'created_at', 'opening_date'];
//     const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
//     const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
//     query += ` ORDER BY b.${sortColumn} ${order}`;

//     // Get total count
//     let countQuery = `
//       SELECT COUNT(*) 
//       FROM branches b
//       WHERE 1=1
//        AND b.created_by = $1 
//     `;
    
//     const countParams = [];
//     let countParamCount = 1;

//     if (status) {
//       countQuery += ` AND b.status = $${countParamCount}`;
//       countParams.push(status.toLowerCase());
//       countParamCount++;
//     }

//     if (country) {
//       countQuery += ` AND b.country = $${countParamCount}`;
//       countParams.push(country);
//       countParamCount++;
//     }

//     if (city) {
//       countQuery += ` AND b.city = $${countParamCount}`;
//       countParams.push(city);
//       countParamCount++;
//     }

//     if (search) {
//       countQuery += ` AND (
//         b.name ILIKE $${countParamCount} OR 
//         b.code ILIKE $${countParamCount} OR 
//         b.city ILIKE $${countParamCount} OR 
//         b.email ILIKE $${countParamCount}
//       )`;
//       countParams.push(`%${search}%`);
//       countParamCount++;
//     }

//     const countResult = await pool.query(countQuery, countParams);
//     const total = parseInt(countResult.rows[0].count);

//     // Add pagination
//     query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
//     params.push(parseInt(limit));
//     params.push((parseInt(page) - 1) * parseInt(limit));

//     const result = await pool.query(query, params);

//     // Now get department details for each branch WITH PROPER TYPE CASTING
//     const branchesWithDepartments = await Promise.all(result.rows.map(async (branch) => {
//       try {
//         // Get department details for this branch
//         const departmentsQuery = `
//           SELECT 
//             d.id,
//             d.branch_id as "branchId",
//             d.type,
//             d.name,
//             d.head_id as "headId",
//             d.staff_count as "staffCount",
//             d.is_active as "isActive",
//             d.description,
//             d.contact_email as "contactEmail",
//             d.contact_phone as "contactPhone",
//             d.location,
//             d.budget,
//             d.created_by as "createdBy",
//             d.created_at as "createdAt",
//             d.updated_at as "updatedAt",
//             u.name as "headName",
//             u.email as "headEmail"
//           FROM departments d
//           LEFT JOIN users u ON u.id::text = d.head_id
//           WHERE d.branch_id = $1
//           ORDER BY d.name ASC
//         `;

//         const departmentsResult = await pool.query(departmentsQuery, [branch.id]);
//         const departments = departmentsResult.rows;

//         // Calculate statistics from ACTUAL department data
//         const totalDepartments = departments.length;
//         const activeDepartments = departments.filter(dept => dept.isActive).length;
//         const inactiveDepartments = totalDepartments - activeDepartments;
//         const totalStaff = departments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0);
//         const totalBudget = departments.reduce((sum, dept) => sum + (parseFloat(dept.budget) || 0), 0);

//         // Create department names string
//         const departmentNames = departments.map(dept => dept.name).join(', ');

//         return {
//           ...branch,
//           department_count: parseInt(branch.department_count || 0),
//           departments: departments, // Full department details
//           department_names: departmentNames || "", // Comma-separated names
//           department_stats: {
//             total: totalDepartments,
//             active: activeDepartments,
//             inactive: inactiveDepartments,
//             total_staff: totalStaff,
//             total_budget: totalBudget.toFixed(2),
//             avg_staff_per_dept: totalDepartments > 0 ? (totalStaff / totalDepartments).toFixed(1) : 0,
//             avg_budget_per_dept: totalDepartments > 0 ? (totalBudget / totalDepartments).toFixed(2) : 0
//           }
//         };
//       } catch (error) {
//         console.error(`Error getting departments for branch ${branch.id}:`, error);
//         // Return the branch with empty departments but keep the count
//         return {
//           ...branch,
//           department_count: parseInt(branch.department_count || 0),
//           departments: [],
//           department_names: "",
//           department_stats: {
//             total: 0,
//             active: 0,
//             inactive: 0,
//             total_staff: 0,
//             total_budget: "0.00",
//             avg_staff_per_dept: 0,
//             avg_budget_per_dept: "0.00"
//           }
//         };
//       }
//     }));

//     res.json({
//       success: true,
//       data: branchesWithDepartments,
//       pagination: {
//         total,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(total / parseInt(limit))
//       }
//     });
    

//   } catch (error) {
//     console.error('Get branches error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch branches'
//     });
//   }
// });




router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      country, 
      city, 
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Log for debugging
    console.log("User ID:", req.user.userId);
    console.log("Query params:", req.query);

    // First, get branches with counts
    let query = `
      SELECT 
        b.*,
        (
          SELECT COUNT(*) 
          FROM departments d 
          WHERE d.branch_id = b.id
        ) as department_count
      FROM branches b
      WHERE 1=1
      AND b.created_by = $1  -- Add filter for created_by
    `;
    
    // Start parameters with user ID as first parameter
    const params = [req.user.userId];
    let paramCount = 2; // Start from 2 since we already have $1

    // Apply filters
    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status.toLowerCase());
      paramCount++;
    }

    if (country) {
      query += ` AND b.country = $${paramCount}`;
      params.push(country);
      paramCount++;
    }

    if (city) {
      query += ` AND b.city = $${paramCount}`;
      params.push(city);
      paramCount++;
    }

    if (search) {
      query += ` AND (
        b.name ILIKE $${paramCount} OR 
        b.code ILIKE $${paramCount} OR 
        b.city ILIKE $${paramCount} OR 
        b.email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Add sorting
    const validSortColumns = ['name', 'code', 'city', 'country', 'status', 'created_at', 'opening_date'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY b.${sortColumn} ${order}`;

    // Get total count - ADD SAME FILTER FOR COUNT QUERY
    let countQuery = `
      SELECT COUNT(*) 
      FROM branches b
      WHERE 1=1
      AND b.created_by = $1  -- Add same filter for count query
    `;
    
    const countParams = [req.user.userId];
    let countParamCount = 2;

    if (status) {
      countQuery += ` AND b.status = $${countParamCount}`;
      countParams.push(status.toLowerCase());
      countParamCount++;
    }

    if (country) {
      countQuery += ` AND b.country = $${countParamCount}`;
      countParams.push(country);
      countParamCount++;
    }

    if (city) {
      countQuery += ` AND b.city = $${countParamCount}`;
      countParams.push(city);
      countParamCount++;
    }

    if (search) {
      countQuery += ` AND (
        b.name ILIKE $${countParamCount} OR 
        b.code ILIKE $${countParamCount} OR 
        b.city ILIKE $${countParamCount} OR 
        b.email ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);

    // Now get department details for each branch WITH PROPER TYPE CASTING
    const branchesWithDepartments = await Promise.all(result.rows.map(async (branch) => {
      try {

        // Get department details for this branch
        const departmentsQuery = `
          SELECT 
            d.id,
            d.branch_id as "branchId",
            d.type,
            d.name,
            d.head_id as "headId",
            d.staff_count as "staffCount",
            d.is_active as "isActive",
            d.description,
            d.contact_email as "contactEmail",
            d.contact_phone as "contactPhone",
            d.location,
            d.postal_code,
            d.budget,
            d.created_by as "createdBy",
            d.created_at as "createdAt",
            d.updated_at as "updatedAt",
            u.name as "headName",
            u.email as "headEmail"
          FROM departments d
          LEFT JOIN users u ON u.id::text = d.head_id
          WHERE d.branch_id = $1
          ORDER BY d.name ASC
        `;

        const departmentsResult = await pool.query(departmentsQuery, [branch.id]);
        const departments = departmentsResult.rows;

        // Calculate statistics from ACTUAL department data
        const totalDepartments = departments.length;
        const activeDepartments = departments.filter(dept => dept.isActive).length;
        const inactiveDepartments = totalDepartments - activeDepartments;
        const totalStaff = departments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0);
        const totalBudget = departments.reduce((sum, dept) => sum + (parseFloat(dept.budget) || 0), 0);

        // Create department names string
        const departmentNames = departments.map(dept => dept.name).join(', ');

        return {
          ...branch,
          department_count: parseInt(branch.department_count || 0),
          departments: departments, // Full department details
          department_names: departmentNames || "", // Comma-separated names
          department_stats: {
            total: totalDepartments,
            active: activeDepartments,
            inactive: inactiveDepartments,
            total_staff: totalStaff,
            total_budget: totalBudget.toFixed(2),
            avg_staff_per_dept: totalDepartments > 0 ? (totalStaff / totalDepartments).toFixed(1) : 0,
            avg_budget_per_dept: totalDepartments > 0 ? (totalBudget / totalDepartments).toFixed(2) : 0
          }
        };
      } catch (error) {
        console.error(`Error getting departments for branch ${branch.id}:`, error);
        // Return the branch with empty departments but keep the count
        return {
          ...branch,
          department_count: parseInt(branch.department_count || 0),
          departments: [],
          department_names: "",
          department_stats: {
            total: 0,
            active: 0,
            inactive: 0,
            total_staff: 0,
            total_budget: "0.00",
            avg_staff_per_dept: 0,
            avg_budget_per_dept: "0.00"
          }
        };
      }
    }));

    res.json({
      success: true,
      data: branchesWithDepartments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches'
    });
  }
});



// router.get('/', authenticateToken, async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 20, 
//       status, 
//       country, 
//       city, 
//       search,
//       sortBy = 'created_at',
//       sortOrder = 'DESC',
//       // New financial filtering parameters
//       minProfit,
//       maxProfit,
//       minEmployeeCount,
//       branchIds // Optional specific branch ID filtering
//     } = req.query;

//     console.log("User ID:", req.user.userId);
//     console.log("Query params:", req.query);

//     // Main query: Get branch information with financial data and employee statistics
//     let query = `
//       SELECT 
//         b.*,
//         -- Department count statistics
//         (
//           SELECT COUNT(*) 
//           FROM departments d 
//           WHERE d.branch_id = b.id
//         ) as department_count,
//         -- Inventory financial data
//         COALESCE(
//           SUM(
//             CASE 
//               WHEN s.quantity > 0 THEN 
//                 (s.selling_price - s.cost_price) * s.quantity
//               ELSE 0 
//             END
//           ), 0
//         ) as potential_profit,
//         COALESCE(
//           SUM(
//             CASE 
//               WHEN s.quantity < 0 THEN 
//                 ABS(s.quantity) * s.cost_price
//               ELSE 0 
//             END
//           ), 0
//         ) as stock_loss,
//         COALESCE(
//           SUM(
//             (s.selling_price - s.cost_price) * GREATEST(s.quantity, 0)
//           ), 0
//         ) as net_amount,
//         -- Inventory statistics
//         COALESCE(SUM(GREATEST(s.quantity, 0)), 0) as total_quantity,
//         COALESCE(COUNT(DISTINCT s.id), 0) as total_stock_items,
//         -- Employee statistics (excluding superadmin)
//         (
//           SELECT COUNT(*) 
//           FROM users u 
//           WHERE u.branch_id = b.id 
//           AND u.role != 'superadmin'
//           AND u.status = true  -- FIXED: Changed 'active' to boolean true
//         ) as employee_count,
//         -- Active employee count
//         (
//           SELECT COUNT(*) 
//           FROM users u 
//           WHERE u.branch_id = b.id 
//           AND u.role != 'superadmin'
//           AND u.status = true  -- FIXED: Changed 'active' to boolean true
//         ) as active_employees
//       FROM branches b
//       LEFT JOIN stocks s ON s.branch_id = b.id
//       WHERE 1=1
//       AND b.created_by = $1
//     `;
    
//     const params = [req.user.userId];
//     let paramCount = 2;

//     // Apply basic filters
//     // FIXED: Status filter - convert string to boolean
//     if (status !== undefined && status !== '') {
//       // Convert string status to boolean
//       let statusBool;
//       const statusStr = String(status).toLowerCase();
      
//       if (statusStr === 'active' || statusStr === 'true' || statusStr === '1' || statusStr === 'yes') {
//         statusBool = true;
//       } else if (statusStr === 'inactive' || statusStr === 'false' || statusStr === '0' || statusStr === 'no') {
//         statusBool = false;
//       } else {
//         // Skip invalid status values
//         console.warn(`Invalid status value: ${status}, skipping filter`);
//       }
      
//       if (statusBool !== undefined) {
//         query += ` AND b.status = $${paramCount}`;
//         params.push(statusBool);
//         paramCount++;
//       }
//     }

//     if (country) {
//       query += ` AND b.country = $${paramCount}`;
//       params.push(country);
//       paramCount++;
//     }

//     if (city) {
//       query += ` AND b.city = $${paramCount}`;
//       params.push(city);
//       paramCount++;
//     }

//     if (search) {
//       query += ` AND (
//         b.name ILIKE $${paramCount} OR 
//         b.code ILIKE $${paramCount} OR 
//         b.city ILIKE $${paramCount} OR 
//         b.email ILIKE $${paramCount}
//       )`;
//       params.push(`%${search}%`);
//       paramCount++;
//     }

//     // Filter by branch IDs
//     if (branchIds) {
//       const ids = branchIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
//       if (ids.length > 0) {
//         query += ` AND b.id IN (${ids.map((_, i) => `$${paramCount + i}`).join(',')})`;
//         params.push(...ids);
//         paramCount += ids.length;
//       }
//     }

//     // Group by calculated fields
//     query += ` GROUP BY b.id`;

//     // Apply financial data filtering
//     if (minProfit) {
//       query += ` HAVING COALESCE(SUM(
//         CASE 
//           WHEN s.quantity > 0 THEN 
//             (s.selling_price - s.cost_price) * s.quantity
//           ELSE 0 
//         END
//       ), 0) >= $${paramCount}`;
//       params.push(parseFloat(minProfit));
//       paramCount++;
//     }

//     if (maxProfit) {
//       const havingClause = minProfit ? 'AND' : 'HAVING';
//       query += ` ${havingClause} COALESCE(SUM(
//         CASE 
//           WHEN s.quantity > 0 THEN 
//             (s.selling_price - s.cost_price) * s.quantity
//           ELSE 0 
//         END
//       ), 0) <= $${paramCount}`;
//       params.push(parseFloat(maxProfit));
//       paramCount++;
//     }

//     if (minEmployeeCount) {
//       const havingClause = (minProfit || maxProfit) ? 'AND' : 'HAVING';
//       query += ` ${havingClause} (
//         SELECT COUNT(*) 
//         FROM users u 
//         WHERE u.branch_id = b.id 
//         AND u.role != 'superadmin'
//         AND u.status = true  -- FIXED: Changed 'active' to boolean true
//       ) >= $${paramCount}`;
//       params.push(parseInt(minEmployeeCount));
//       paramCount++;
//     }

//     // Sorting logic (supports new fields)
//     const validSortColumns = [
//       'name', 'code', 'city', 'country', 'status', 
//       'created_at', 'opening_date', 'potential_profit',
//       'stock_loss', 'net_amount', 'employee_count'
//     ];
//     const sortColumn = validSortColumns.includes(sortBy) ? 
//       (sortBy === 'employee_count' ? 'employee_count' : `b.${sortBy}`) : 
//       'b.created_at';
    
//     const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
//     query += ` ORDER BY ${sortColumn} ${order}`;

//     // Get total count
//     let countQuery = `
//       SELECT COUNT(DISTINCT b.id) 
//       FROM branches b
//       LEFT JOIN stocks s ON s.branch_id = b.id
//       LEFT JOIN users u ON u.branch_id = b.id AND u.role != 'superadmin' AND u.status = true  -- FIXED: boolean true
//       WHERE 1=1
//       AND b.created_by = $1
//     `;
    
//     const countParams = [req.user.userId];
//     let countParamCount = 2;

//     // FIXED: Status filter in count query
//     if (status !== undefined && status !== '') {
//       let statusBool;
//       const statusStr = String(status).toLowerCase();
      
//       if (statusStr === 'active' || statusStr === 'true' || statusStr === '1' || statusStr === 'yes') {
//         statusBool = true;
//       } else if (statusStr === 'inactive' || statusStr === 'false' || statusStr === '0' || statusStr === 'no') {
//         statusBool = false;
//       }
      
//       if (statusBool !== undefined) {
//         countQuery += ` AND b.status = $${countParamCount}`;
//         countParams.push(statusBool);
//         countParamCount++;
//       }
//     }

//     if (country) {
//       countQuery += ` AND b.country = $${countParamCount}`;
//       countParams.push(country);
//       countParamCount++;
//     }

//     if (city) {
//       countQuery += ` AND b.city = $${countParamCount}`;
//       countParams.push(city);
//       countParamCount++;
//     }

//     if (search) {
//       countQuery += ` AND (
//         b.name ILIKE $${countParamCount} OR 
//         b.code ILIKE $${countParamCount} OR 
//         b.city ILIKE $${countParamCount} OR 
//         b.email ILIKE $${countParamCount}
//       )`;
//       countParams.push(`%${search}%`);
//       countParamCount++;
//     }

//     // Financial data filtering (total count query)
//     if (minProfit) {
//       countQuery += `
//         AND b.id IN (
//           SELECT b2.id 
//           FROM branches b2
//           LEFT JOIN stocks s2 ON s2.branch_id = b2.id
//           WHERE COALESCE(SUM(
//             CASE 
//               WHEN s2.quantity > 0 THEN 
//                 (s2.selling_price - s2.cost_price) * s2.quantity
//               ELSE 0 
//             END
//           ), 0) >= $${countParamCount}
//           GROUP BY b2.id
//         )
//       `;
//       countParams.push(parseFloat(minProfit));
//       countParamCount++;
//     }

//     const countResult = await pool.query(countQuery, countParams);
//     const total = parseInt(countResult.rows[0].count);

//     // Pagination
//     query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
//     params.push(parseInt(limit));
//     params.push((parseInt(page) - 1) * parseInt(limit));

//     const result = await pool.query(query, params);

//     // Get detailed inventory data and department information for each branch
//     const branchesWithDetails = await Promise.all(result.rows.map(async (branch) => {
//       try {
//         // Get department details
//         const departmentsQuery = `
//           SELECT 
//             d.id,
//             d.branch_id as "branchId",
//             d.type,
//             d.name,
//             d.head_id as "headId",
//             d.staff_count as "staffCount",
//             d.is_active as "isActive",
//             d.description,
//             d.contact_email as "contactEmail",
//             d.contact_phone as "contactPhone",
//             d.location,
//             d.budget,
//             d.created_by as "createdBy",
//             d.created_at as "createdAt",
//             d.updated_at as "updatedAt",
//             u.name as "headName",
//             u.email as "headEmail"
//           FROM departments d
//           LEFT JOIN users u ON u.id::text = d.head_id
//           WHERE d.branch_id = $1
//           ORDER BY d.name ASC
//         `;

//         const departmentsResult = await pool.query(departmentsQuery, [branch.id]);
//         const departments = departmentsResult.rows;

//         // Calculate department statistics
//         const totalDepartments = departments.length;
//         const activeDepartments = departments.filter(dept => dept.isActive).length;
//         const inactiveDepartments = totalDepartments - activeDepartments;
//         const totalStaff = departments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0);
//         const totalBudget = departments.reduce((sum, dept) => sum + (parseFloat(dept.budget) || 0), 0);

//         // Get detailed inventory financial data
//         const stockDetailsQuery = `
//           SELECT 
//             s.id,
//             s.name,
//             s.sku,
//             s.category_id as "categoryId",
//             s.quantity,
//             s.cost_price as "costPrice",
//             s.selling_price as "sellingPrice",
//             s.dealer_price as "dealerPrice",
//             s.shop_price as "shopPrice",
//             s.status,
//             s.unit,
//             -- Calculate individual financial data
//             CASE 
//               WHEN s.quantity > 0 THEN 
//                 (s.selling_price - s.cost_price) * s.quantity
//               ELSE 0 
//             END as potential_profit,
//             CASE 
//               WHEN s.quantity < 0 THEN 
//                 ABS(s.quantity) * s.cost_price
//               ELSE 0 
//             END as stock_loss,
//             (s.selling_price - s.cost_price) * GREATEST(s.quantity, 0) as net_amount
//           FROM stocks s
//           WHERE s.branch_id = $1
//           ORDER BY s.name ASC
//         `;

//         const stockDetailsResult = await pool.query(stockDetailsQuery, [branch.id]);
//         const stockDetails = stockDetailsResult.rows;

//         // Categorize inventory by status
//         const activeStocks = stockDetails.filter(stock => stock.status === 'active');
//         const inactiveStocks = stockDetails.filter(stock => stock.status !== 'active');
//         const lowStocks = stockDetails.filter(stock => stock.quantity <= stock.low_stock_threshold);

//         // Detailed employee statistics (by role)
//         const employeeStatsQuery = `
//           SELECT 
//             u.role,
//             COUNT(*) as count
//           FROM users u
//           WHERE u.branch_id = $1
//           AND u.role != 'superadmin'
//           GROUP BY u.role
//           ORDER BY u.role
//         `;

//         const employeeStatsResult = await pool.query(employeeStatsQuery, [branch.id]);
//         const employeeStats = employeeStatsResult.rows.reduce((acc, row) => {
//           acc[row.role] = parseInt(row.count);
//           return acc;
//         }, {});

//         return {
//           // Basic branch information
//           id: branch.id,
//           name: branch.name,
//           code: branch.code,
//           country: branch.country,
//           city: branch.city,
//           email: branch.email,
//           phone: branch.phone,
//           address: branch.address,
//           status: branch.status,
//           opening_date: branch.opening_date,
//           created_at: branch.created_at,
//           updated_at: branch.updated_at,
          
//           // Department information
//           department_count: parseInt(branch.department_count || 0),
//           departments: departments,
//           department_names: departments.map(dept => dept.name).join(', ') || "",
//           department_stats: {
//             total: totalDepartments,
//             active: activeDepartments,
//             inactive: inactiveDepartments,
//             total_staff: totalStaff,
//             total_budget: totalBudget.toFixed(2),
//             avg_staff_per_dept: totalDepartments > 0 ? (totalStaff / totalDepartments).toFixed(1) : 0,
//             avg_budget_per_dept: totalDepartments > 0 ? (totalBudget / totalDepartments).toFixed(2) : 0
//           },
          
//           // Financial data
//           financial_stats: {
//             potential_profit: parseFloat(branch.potential_profit || 0).toFixed(2),
//             stock_loss: parseFloat(branch.stock_loss || 0).toFixed(2),
//             net_amount: parseFloat(branch.net_amount || 0).toFixed(2),
//             // Profit margin
//             profit_margin: branch.potential_profit > 0 ? 
//               ((branch.potential_profit / (branch.potential_profit + branch.stock_loss)) * 100).toFixed(2) : '0.00'
//           },
          
//           // Inventory statistics
//           inventory_stats: {
//             total_quantity: parseInt(branch.total_quantity || 0),
//             total_items: parseInt(branch.total_stock_items || 0),
//             active_stocks: activeStocks.length,
//             inactive_stocks: inactiveStocks.length,
//             low_stocks: lowStocks.length,
//             total_inventory_value: stockDetails.reduce((sum, stock) => 
//               sum + (stock.quantity * stock.costPrice), 0).toFixed(2),
//             avg_quantity_per_item: branch.total_stock_items > 0 ? 
//               (branch.total_quantity / branch.total_stock_items).toFixed(1) : 0
//           },
          
//           // Employee statistics
//           employee_stats: {
//             total: parseInt(branch.employee_count || 0),
//             active: parseInt(branch.active_employees || 0),
//             inactive: parseInt(branch.employee_count || 0) - parseInt(branch.active_employees || 0),
//             by_role: employeeStats,
//             // Inventory per employee ratio
//             stock_per_employee: branch.employee_count > 0 ? 
//               (branch.total_quantity / branch.employee_count).toFixed(1) : 0
//           },
          
//           // Raw data (optional)
//           raw_stocks: stockDetails,
//           stock_summary: {
//             profitable_items: activeStocks.filter(stock => stock.net_amount > 0).length,
//             loss_items: activeStocks.filter(stock => stock.net_amount < 0).length,
//             top_profitable_items: activeStocks
//               .filter(stock => stock.net_amount > 0)
//               .sort((a, b) => b.net_amount - a.net_amount)
//               .slice(0, 5)
//           }
//         };
//       } catch (error) {
//         console.error(`Error getting details for branch ${branch.id}:`, error);
//         // Return basic information
//         return {
//           ...branch,
//           department_count: parseInt(branch.department_count || 0),
//           departments: [],
//           department_names: "",
//           department_stats: {
//             total: 0,
//             active: 0,
//             inactive: 0,
//             total_staff: 0,
//             total_budget: "0.00",
//             avg_staff_per_dept: 0,
//             avg_budget_per_dept: "0.00"
//           },
//           financial_stats: {
//             potential_profit: "0.00",
//             stock_loss: "0.00",
//             net_amount: "0.00",
//             profit_margin: "0.00"
//           },
//           inventory_stats: {
//             total_quantity: 0,
//             total_items: 0,
//             active_stocks: 0,
//             inactive_stocks: 0,
//             low_stocks: 0,
//             total_inventory_value: "0.00",
//             avg_quantity_per_item: 0
//           },
//           employee_stats: {
//             total: parseInt(branch.employee_count || 0),
//             active: parseInt(branch.active_employees || 0),
//             inactive: parseInt(branch.employee_count || 0) - parseInt(branch.active_employees || 0),
//             by_role: {},
//             stock_per_employee: 0
//           }
//         };
//       }
//     }));

//     res.json({
//       success: true,
//       data: branchesWithDetails,
//       summary: {
//         total_branches: total,
//         total_profit: branchesWithDetails.reduce((sum, branch) => 
//           sum + parseFloat(branch.financial_stats.potential_profit), 0).toFixed(2),
//         total_loss: branchesWithDetails.reduce((sum, branch) => 
//           sum + parseFloat(branch.financial_stats.stock_loss), 0).toFixed(2),
//         total_net_amount: branchesWithDetails.reduce((sum, branch) => 
//           sum + parseFloat(branch.financial_stats.net_amount), 0).toFixed(2),
//         total_employees: branchesWithDetails.reduce((sum, branch) => 
//           sum + branch.employee_stats.total, 0),
//         avg_profit_per_branch: (branchesWithDetails.reduce((sum, branch) => 
//           sum + parseFloat(branch.financial_stats.potential_profit), 0) / branchesWithDetails.length).toFixed(2)
//       },
//       pagination: {
//         total,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(total / parseInt(limit))
//       }
//     });
//   } catch (error) {
//     console.error('Get branches error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch branches',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });











// UPDATE BRANCH (Admin/Manager only)


router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      country, 
      city, 
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      // New financial filtering parameters
      minProfit,
      maxProfit,
      minEmployeeCount,
      branchIds // Optional specific branch ID filtering
    } = req.query;

    console.log("User ID:", req.user.userId);
    console.log("Query params:", req.query);

    // Main query: Get branch information with financial data and employee statistics
    let query = `
      SELECT 
        b.*,
        b.postal_code,  -- ADDED: Postal code field
        -- Department count statistics
        (
          SELECT COUNT(*) 
          FROM departments d 
          WHERE d.branch_id = b.id
        ) as department_count,
        -- Inventory financial data
        COALESCE(
          SUM(
            CASE 
              WHEN s.quantity > 0 THEN 
                (s.selling_price - s.cost_price) * s.quantity
              ELSE 0 
            END
          ), 0
        ) as potential_profit,
        COALESCE(
          SUM(
            CASE 
              WHEN s.quantity < 0 THEN 
                ABS(s.quantity) * s.cost_price
              ELSE 0 
            END
          ), 0
        ) as stock_loss,
        COALESCE(
          SUM(
            (s.selling_price - s.cost_price) * GREATEST(s.quantity, 0)
          ), 0
        ) as net_amount,
        -- Inventory statistics
        COALESCE(SUM(GREATEST(s.quantity, 0)), 0) as total_quantity,
        COALESCE(COUNT(DISTINCT s.id), 0) as total_stock_items,
        -- Employee statistics (excluding superadmin)
        (
          SELECT COUNT(*) 
          FROM users u 
          WHERE u.branch_id = b.id 
          AND u.role != 'superadmin'
          AND u.status = true  -- FIXED: Changed 'active' to boolean true
        ) as employee_count,
        -- Active employee count
        (
          SELECT COUNT(*) 
          FROM users u 
          WHERE u.branch_id = b.id 
          AND u.role != 'superadmin'
          AND u.status = true  -- FIXED: Changed 'active' to boolean true
        ) as active_employees
      FROM branches b
      LEFT JOIN stocks s ON s.branch_id = b.id
      WHERE 1=1
      AND b.created_by = $1
    `;
    
    const params = [req.user.userId];
    let paramCount = 2;

    // Apply basic filters
    // FIXED: Status filter - convert string to boolean
    if (status !== undefined && status !== '') {
      // Convert string status to boolean
      let statusBool;
      const statusStr = String(status).toLowerCase();
      
      if (statusStr === 'active' || statusStr === 'true' || statusStr === '1' || statusStr === 'yes') {
        statusBool = true;
      } else if (statusStr === 'inactive' || statusStr === 'false' || statusStr === '0' || statusStr === 'no') {
        statusBool = false;
      } else {
        // Skip invalid status values
        console.warn(`Invalid status value: ${status}, skipping filter`);
      }
      
      if (statusBool !== undefined) {
        query += ` AND b.status = $${paramCount}`;
        params.push(statusBool);
        paramCount++;
      }
    }

    if (country) {
      query += ` AND b.country = $${paramCount}`;
      params.push(country);
      paramCount++;
    }

    if (city) {
      query += ` AND b.city = $${paramCount}`;
      params.push(city);
      paramCount++;
    }

    if (search) {
      query += ` AND (
        b.name ILIKE $${paramCount} OR 
        b.code ILIKE $${paramCount} OR 
        b.city ILIKE $${paramCount} OR 
        b.email ILIKE $${paramCount} OR
        b.postal_code ILIKE $${paramCount}  -- ADDED: Search in postal code
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filter by branch IDs
    if (branchIds) {
      const ids = branchIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        query += ` AND b.id IN (${ids.map((_, i) => `$${paramCount + i}`).join(',')})`;
        params.push(...ids);
        paramCount += ids.length;
      }
    }

    // Group by calculated fields
    query += ` GROUP BY b.id`;

    // Apply financial data filtering
    if (minProfit) {
      query += ` HAVING COALESCE(SUM(
        CASE 
          WHEN s.quantity > 0 THEN 
            (s.selling_price - s.cost_price) * s.quantity
          ELSE 0 
        END
      ), 0) >= $${paramCount}`;
      params.push(parseFloat(minProfit));
      paramCount++;
    }

    if (maxProfit) {
      const havingClause = minProfit ? 'AND' : 'HAVING';
      query += ` ${havingClause} COALESCE(SUM(
        CASE 
          WHEN s.quantity > 0 THEN 
            (s.selling_price - s.cost_price) * s.quantity
          ELSE 0 
        END
      ), 0) <= $${paramCount}`;
      params.push(parseFloat(maxProfit));
      paramCount++;
    }

    if (minEmployeeCount) {
      const havingClause = (minProfit || maxProfit) ? 'AND' : 'HAVING';
      query += ` ${havingClause} (
        SELECT COUNT(*) 
        FROM users u 
        WHERE u.branch_id = b.id 
        AND u.role != 'superadmin'
        AND u.status = true  -- FIXED: Changed 'active' to boolean true
      ) >= $${paramCount}`;
      params.push(parseInt(minEmployeeCount));
      paramCount++;
    }

    // Sorting logic (supports new fields)
    const validSortColumns = [
      'name', 'code', 'city', 'country', 'status', 
      'created_at', 'opening_date', 'potential_profit',
      'stock_loss', 'net_amount', 'employee_count', 'postal_code'  // ADDED: postal_code to sortable columns
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? 
      (sortBy === 'employee_count' ? 'employee_count' : `b.${sortBy}`) : 
      'b.created_at';
    
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT b.id) 
      FROM branches b
      LEFT JOIN stocks s ON s.branch_id = b.id
      LEFT JOIN users u ON u.branch_id = b.id AND u.role != 'superadmin' AND u.status = true  -- FIXED: boolean true
      WHERE 1=1
      AND b.created_by = $1
    `;
    
    const countParams = [req.user.userId];
    let countParamCount = 2;

    // FIXED: Status filter in count query
    if (status !== undefined && status !== '') {
      let statusBool;
      const statusStr = String(status).toLowerCase();
      
      if (statusStr === 'active' || statusStr === 'true' || statusStr === '1' || statusStr === 'yes') {
        statusBool = true;
      } else if (statusStr === 'inactive' || statusStr === 'false' || statusStr === '0' || statusStr === 'no') {
        statusBool = false;
      }
      
      if (statusBool !== undefined) {
        countQuery += ` AND b.status = $${countParamCount}`;
        countParams.push(statusBool);
        countParamCount++;
      }
    }

    if (country) {
      countQuery += ` AND b.country = $${countParamCount}`;
      countParams.push(country);
      countParamCount++;
    }

    if (city) {
      countQuery += ` AND b.city = $${countParamCount}`;
      countParams.push(city);
      countParamCount++;
    }

    if (search) {
      countQuery += ` AND (
        b.name ILIKE $${countParamCount} OR 
        b.code ILIKE $${countParamCount} OR 
        b.city ILIKE $${countParamCount} OR 
        b.email ILIKE $${countParamCount} OR
        b.postal_code ILIKE $${countParamCount}  -- ADDED: Search in postal code
      )`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    // Financial data filtering (total count query)
    if (minProfit) {
      countQuery += `
        AND b.id IN (
          SELECT b2.id 
          FROM branches b2
          LEFT JOIN stocks s2 ON s2.branch_id = b2.id
          WHERE COALESCE(SUM(
            CASE 
              WHEN s2.quantity > 0 THEN 
                (s2.selling_price - s2.cost_price) * s2.quantity
              ELSE 0 
            END
          ), 0) >= $${countParamCount}
          GROUP BY b2.id
        )
      `;
      countParams.push(parseFloat(minProfit));
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);

    // Get detailed inventory data and department information for each branch
    const branchesWithDetails = await Promise.all(result.rows.map(async (branch) => {
      try {
        // Get department details
        const departmentsQuery = `
          SELECT 
            d.id,
            d.branch_id as "branchId",
            d.type,
            d.name,
            d.head_id as "headId",
            d.staff_count as "staffCount",
            d.is_active as "isActive",
            d.description,
            d.contact_email as "contactEmail",
            d.contact_phone as "contactPhone",
            d.location,
            d.budget,
            d.created_by as "createdBy",
            d.created_at as "createdAt",
            d.updated_at as "updatedAt",
            u.name as "headName",
            u.email as "headEmail"
          FROM departments d
          LEFT JOIN users u ON u.id::text = d.head_id
          WHERE d.branch_id = $1
          ORDER BY d.name ASC
        `;

        const departmentsResult = await pool.query(departmentsQuery, [branch.id]);
        const departments = departmentsResult.rows;

        // Calculate department statistics
        const totalDepartments = departments.length;
        const activeDepartments = departments.filter(dept => dept.isActive).length;
        const inactiveDepartments = totalDepartments - activeDepartments;
        const totalStaff = departments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0);
        const totalBudget = departments.reduce((sum, dept) => sum + (parseFloat(dept.budget) || 0), 0);

        // Get detailed inventory financial data
        const stockDetailsQuery = `
          SELECT 
            s.id,
            s.name,
            s.sku,
            s.category_id as "categoryId",
            s.quantity,
            s.cost_price as "costPrice",
            s.selling_price as "sellingPrice",
            s.dealer_price as "dealerPrice",
            s.shop_price as "shopPrice",
            s.status,
            s.unit,
            -- Calculate individual financial data
            CASE 
              WHEN s.quantity > 0 THEN 
                (s.selling_price - s.cost_price) * s.quantity
              ELSE 0 
            END as potential_profit,
            CASE 
              WHEN s.quantity < 0 THEN 
                ABS(s.quantity) * s.cost_price
              ELSE 0 
            END as stock_loss,
            (s.selling_price - s.cost_price) * GREATEST(s.quantity, 0) as net_amount
          FROM stocks s
          WHERE s.branch_id = $1
          ORDER BY s.name ASC
        `;

        const stockDetailsResult = await pool.query(stockDetailsQuery, [branch.id]);
        const stockDetails = stockDetailsResult.rows;

        // Categorize inventory by status
        const activeStocks = stockDetails.filter(stock => stock.status === 'active');
        const inactiveStocks = stockDetails.filter(stock => stock.status !== 'active');
        const lowStocks = stockDetails.filter(stock => stock.quantity <= stock.low_stock_threshold);

        // Detailed employee statistics (by role)
        const employeeStatsQuery = `
          SELECT 
            u.role,
            COUNT(*) as count
          FROM users u
          WHERE u.branch_id = $1
          AND u.role != 'superadmin'
          GROUP BY u.role
          ORDER BY u.role
        `;

        const employeeStatsResult = await pool.query(employeeStatsQuery, [branch.id]);
        const employeeStats = employeeStatsResult.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {});

        return {
          // Basic branch information
          id: branch.id,
          name: branch.name,
          code: branch.code,
          country: branch.country,
          city: branch.city,
          email: branch.email,
          phone: branch.phone,
          address: branch.address,
          postal_code: branch.postal_code,  // ADDED: Postal code in response
          status: branch.status,
          opening_date: branch.opening_date,
          created_at: branch.created_at,
          updated_at: branch.updated_at,
          
          // Department information
          department_count: parseInt(branch.department_count || 0),
          departments: departments,
          department_names: departments.map(dept => dept.name).join(', ') || "",
          department_stats: {
            total: totalDepartments,
            active: activeDepartments,
            inactive: inactiveDepartments,
            total_staff: totalStaff,
            total_budget: totalBudget.toFixed(2),
            avg_staff_per_dept: totalDepartments > 0 ? (totalStaff / totalDepartments).toFixed(1) : 0,
            avg_budget_per_dept: totalDepartments > 0 ? (totalBudget / totalDepartments).toFixed(2) : 0
          },
          
          // Financial data
          financial_stats: {
            potential_profit: parseFloat(branch.potential_profit || 0).toFixed(2),
            stock_loss: parseFloat(branch.stock_loss || 0).toFixed(2),
            net_amount: parseFloat(branch.net_amount || 0).toFixed(2),
            // Profit margin
            profit_margin: branch.potential_profit > 0 ? 
              ((branch.potential_profit / (branch.potential_profit + branch.stock_loss)) * 100).toFixed(2) : '0.00'
          },
          
          // Inventory statistics
          inventory_stats: {
            total_quantity: parseInt(branch.total_quantity || 0),
            total_items: parseInt(branch.total_stock_items || 0),
            active_stocks: activeStocks.length,
            inactive_stocks: inactiveStocks.length,
            low_stocks: lowStocks.length,
            total_inventory_value: stockDetails.reduce((sum, stock) => 
              sum + (stock.quantity * stock.costPrice), 0).toFixed(2),
            avg_quantity_per_item: branch.total_stock_items > 0 ? 
              (branch.total_quantity / branch.total_stock_items).toFixed(1) : 0
          },
          
          // Employee statistics
          employee_stats: {
            total: parseInt(branch.employee_count || 0),
            active: parseInt(branch.active_employees || 0),
            inactive: parseInt(branch.employee_count || 0) - parseInt(branch.active_employees || 0),
            by_role: employeeStats,
            // Inventory per employee ratio
            stock_per_employee: branch.employee_count > 0 ? 
              (branch.total_quantity / branch.employee_count).toFixed(1) : 0
          },
          
          // Raw data (optional)
          raw_stocks: stockDetails,
          stock_summary: {
            profitable_items: activeStocks.filter(stock => stock.net_amount > 0).length,
            loss_items: activeStocks.filter(stock => stock.net_amount < 0).length,
            top_profitable_items: activeStocks
              .filter(stock => stock.net_amount > 0)
              .sort((a, b) => b.net_amount - a.net_amount)
              .slice(0, 5)
          }
        };
      } catch (error) {
        console.error(`Error getting details for branch ${branch.id}:`, error);
        // Return basic information including postal_code
        return {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          country: branch.country,
          city: branch.city,
          email: branch.email,
          phone: branch.phone,
          address: branch.address,
          postal_code: branch.postal_code || null,  // ADDED: Include postal code in error case
          status: branch.status,
          opening_date: branch.opening_date,
          created_at: branch.created_at,
          updated_at: branch.updated_at,
          department_count: parseInt(branch.department_count || 0),
          departments: [],
          department_names: "",
          department_stats: {
            total: 0,
            active: 0,
            inactive: 0,
            total_staff: 0,
            total_budget: "0.00",
            avg_staff_per_dept: 0,
            avg_budget_per_dept: "0.00"
          },
          financial_stats: {
            potential_profit: "0.00",
            stock_loss: "0.00",
            net_amount: "0.00",
            profit_margin: "0.00"
          },
          inventory_stats: {
            total_quantity: 0,
            total_items: 0,
            active_stocks: 0,
            inactive_stocks: 0,
            low_stocks: 0,
            total_inventory_value: "0.00",
            avg_quantity_per_item: 0
          },
          employee_stats: {
            total: parseInt(branch.employee_count || 0),
            active: parseInt(branch.active_employees || 0),
            inactive: parseInt(branch.employee_count || 0) - parseInt(branch.active_employees || 0),
            by_role: {},
            stock_per_employee: 0
          }
        };
      }
    }));

    res.json({
      success: true,
      data: branchesWithDetails,
      summary: {
        total_branches: total,
        total_profit: branchesWithDetails.reduce((sum, branch) => 
          sum + parseFloat(branch.financial_stats.potential_profit), 0).toFixed(2),
        total_loss: branchesWithDetails.reduce((sum, branch) => 
          sum + parseFloat(branch.financial_stats.stock_loss), 0).toFixed(2),
        total_net_amount: branchesWithDetails.reduce((sum, branch) => 
          sum + parseFloat(branch.financial_stats.net_amount), 0).toFixed(2),
        total_employees: branchesWithDetails.reduce((sum, branch) => 
          sum + branch.employee_stats.total, 0),
        avg_profit_per_branch: (branchesWithDetails.reduce((sum, branch) => 
          sum + parseFloat(branch.financial_stats.potential_profit), 0) / branchesWithDetails.length).toFixed(2)
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});







router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  validateBranchData,
  async (req, res) => {
    try {
      const { id } = req.params;
console.log(req.body+"Updated to body ");
      // Check if branch exists
      const branchCheck = await pool.query(
        'SELECT id, code FROM branches WHERE id = $1',
        [id]
      );
      
      if (branchCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      // Check if new code already exists
      if (req.body.code && req.body.code !== branchCheck.rows[0].code) {
        const codeCheck = await pool.query(
          'SELECT id FROM branches WHERE code = $1 AND id != $2',
          [req.body.code, id]
        );
        
        if (codeCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Branch code already exists'
          });
        }
      }

      const query = `
        UPDATE branches 
        SET 
          name = $1, code = $2, address = $3, city = $4, state = $5,
          country = $6, postal_code = $7, phone = $8, email = $9,
          manager_id = $10, latitude = $11, longitude = $12,
          opening_date = $13, status = $14, updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
        RETURNING *;
      `;

      
      const values = [
        req.body.name,
        req.body.code,
        req.body.address,
        req.body.city,
        req.body.state,
        req.body.country,
        req.body.postalCode,
        req.body.phone,
        req.body.email,
        req.body.managerId,
        req.body.latitude || 0.0,
        req.body.longitude || 0.0,
        req.body.openingDate,
        req.body.status || 'active',
        id
      ];

      const result = await pool.query(query, values);

      res.json({
        success: true,
        message: 'Branch updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Update branch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branch'
      });
    }
  }
);

// DELETE BRANCH (Admin only) - with cascading department deletion
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      // Start transaction
      await client.query('BEGIN');

      // Check if branch exists
      const branchCheck = await client.query(
        'SELECT id, name FROM branches WHERE id = $1',
        [id]
      );
      
      if (branchCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      const branchName = branchCheck.rows[0].name;
      console.log(`🗑️ Deleting branch: ${branchName} (ID: ${id})`);

      // Get count of departments for logging
      const deptCountResult = await client.query(
        'SELECT COUNT(*) FROM departments WHERE branch_id = $1',
        [id]
      );
      const departmentCount = parseInt(deptCountResult.rows[0].count);
      
      // OPTION 1: Delete departments first (recommended)
      if (departmentCount > 0) {
        console.log(`📋 Deleting ${departmentCount} departments for branch ${id}`);
        
        // Option A: Simple delete (if no foreign key constraints on departments)
        await client.query('DELETE FROM departments WHERE branch_id = $1', [id]);
        
        // Option B: If departments have related data (staff, etc.), handle them too
        // await client.query('DELETE FROM department_staff WHERE department_id IN (SELECT id FROM departments WHERE branch_id = $1)', [id]);
        // await client.query('DELETE FROM departments WHERE branch_id = $1', [id]);
        
        console.log(`✅ Deleted ${departmentCount} departments`);
      }

      // Now delete the branch
      await client.query('DELETE FROM branches WHERE id = $1', [id]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`✅ Successfully deleted branch: ${branchName}`);

      res.json({
        success: true,
        message: `Branch deleted successfully${departmentCount > 0 ? ` along with ${departmentCount} department(s)` : ''}`,
        data: {
          branch_id: id,
          branch_name: branchName,
          departments_deleted: departmentCount
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      
      console.error('❌ Delete branch error:', error);
      
      // Check for foreign key constraint violations
      if (error.code === '23503') { // Foreign key violation
        const constraintMessage = getConstraintMessage(error);
        return res.status(400).json({
          success: false,
          error: 'Cannot delete branch due to existing references',
          details: constraintMessage
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete branch',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Release client back to pool
      client.release();
    }
  }
);

// Helper function to parse constraint messages
function getConstraintMessage(error) {
  const message = error.message || '';
  
  if (message.includes('users')) {
    return 'Branch has assigned staff members. Please reassign or delete staff first.';
  } else if (message.includes('inventory')) {
    return 'Branch has inventory items. Please transfer or delete inventory first.';
  } else if (message.includes('sales')) {
    return 'Branch has sales records. Please archive sales data first.';
  } else if (message.includes('transactions')) {
    return 'Branch has transaction records. Please archive transaction data first.';
  }
  
  return 'Branch is referenced by other records. Please check related data.';
}

// =============== BRANCH ANALYTICS AND REPORTS ===============

// GET BRANCH STATISTICS (Admin/Manager only)
router.get(
  '/dashboard/statistics',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  async (req, res) => {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_branches,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_branches,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_branches,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_branches,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_branches,
          COUNT(DISTINCT country) as countries_count,
          COUNT(DISTINCT city) as cities_count,
          MIN(created_at) as oldest_branch,
          MAX(created_at) as newest_branch
        FROM branches;
      `;

      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Get branch statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch branch statistics'
      });
    }
  }
);

// GET FILTER OPTIONS
router.get('/filters/options', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        json_agg(DISTINCT country) as countries,
        json_agg(DISTINCT city) as cities,
        json_agg(DISTINCT status) as statuses
      FROM branches
      WHERE country IS NOT NULL AND city IS NOT NULL;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options'
    });
  }
});

// SEARCH BRANCHES
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
      SELECT id, name, code, city, country, status
      FROM branches
      WHERE name ILIKE $1 OR code ILIKE $1 OR city ILIKE $1
      LIMIT 10;
    `;

    const result = await pool.query(query, [`%${q}%`]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search branches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search branches'
    });
  }
});


// router.get('/branchwise/:id', authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { 
//       page = 1, 
//       limit = 10 
//     } = req.query;

//     // Log for debugging
//     console.log("User ID:", req.user.userId);
//     console.log("Branch ID:", id);

//     // Get the branch with department count and verify ownership
//     let branchQuery = `
//       SELECT 
//         b.*,
//         (
//           SELECT COUNT(*) 
//           FROM departments d 
//           WHERE d.branch_id = b.id
//         ) as department_count
//       FROM branches b
//       WHERE b.id = $1
//       AND b.created_by = $2
//     `;
    
//     const branchParams = [id, req.user.userId];
    
//     const branchResult = await pool.query(branchQuery, branchParams);

//     if (branchResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: 'Branch not found or access denied'
//       });
//     }

//     const branch = branchResult.rows[0];

//     // Get ALL departments for statistics
//     const allDepartmentsQuery = `
//       SELECT 
//         d.id,
//         d.branch_id as "branchId",
//         d.type,
//         d.name,
//         d.head_id as "headId",
//         d.staff_count as "staffCount",
//         d.is_active as "isActive",
//         d.description,
//         d.contact_email as "contactEmail",
//         d.contact_phone as "contactPhone",
//         d.location,
//         d.budget,
//         d.created_by as "createdBy",
//         d.created_at as "createdAt",
//         d.updated_at as "updatedAt",
//         u.name as "headName",
//         u.email as "headEmail"
//       FROM departments d
//       LEFT JOIN users u ON u.id::text = d.head_id
//       WHERE d.branch_id = $1
//       ORDER BY d.name ASC
//     `;

//     const allDepartmentsResult = await pool.query(allDepartmentsQuery, [branch.id]);
//     const allDepartments = allDepartmentsResult.rows;

//     // Calculate statistics from ALL department data
//     const totalDepartments = allDepartments.length;
//     const activeDepartments = allDepartments.filter(dept => dept.isActive).length;
//     const inactiveDepartments = totalDepartments - activeDepartments;
//     const totalStaff = allDepartments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0);
//     const totalBudget = allDepartments.reduce((sum, dept) => sum + (parseFloat(dept.budget) || 0), 0);

//     // Get paginated departments
//     const offset = (parseInt(page) - 1) * parseInt(limit);
//     const departments = allDepartments.slice(offset, offset + parseInt(limit));

//     // Create department names string from paginated departments
//     const departmentNames = departments.map(dept => dept.name).join(', ');

//     // Format the branch data exactly like in the list endpoint
//     const branchWithDepartments = {
//       ...branch,
//       department_count: parseInt(branch.department_count || 0),
//       departments: departments, // Paginated department details
//       department_names: departmentNames || "", // Comma-separated names
//       department_stats: {
//         total: totalDepartments,
//         active: activeDepartments,
//         inactive: inactiveDepartments,
//         total_staff: totalStaff,
//         total_budget: totalBudget.toFixed(2),
//         avg_staff_per_dept: totalDepartments > 0 ? (totalStaff / totalDepartments).toFixed(1) : 0,
//         avg_budget_per_dept: totalDepartments > 0 ? (totalBudget / totalDepartments).toFixed(2) : 0
//       }
//     };
    

//     res.json({
//       success: true,
//       data: branchWithDepartments,
//       pagination: {
//         total: totalDepartments,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(totalDepartments / parseInt(limit))
//       }
//     });

    
//   } catch (error) {
//     console.error('Get branch error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch branch'
//     });
//   }
// });



// GET BRANCH DEPARTMENTS




router.get('/branchwise/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 10 
    } = req.query;

    // Log for debugging
    console.log("User ID:", req.user.userId);
    console.log("Branch ID:", id);

    // Get the branch with department count and verify ownership
    let branchQuery = `
      SELECT 
         b.postal_code as "postalCode",
        b.manager_id as "managerId",
        b.opening_date as "openingDate",
        b.*,
        (
          SELECT COUNT(*) 
          FROM departments d 
          WHERE d.branch_id = b.id
        ) as department_count
      FROM branches b
      WHERE b.id = $1
      AND b.created_by = $2
    `;
    
    const branchParams = [id, req.user.userId];
    
    const branchResult = await pool.query(branchQuery, branchParams);

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found or access denied'
      });
    }

    const branch = branchResult.rows[0];

    // Get ALL departments for statistics
    const allDepartmentsQuery = `
      SELECT 
        d.id,
        d.branch_id as "branchId",
        d.type,
        d.name,
        d.head_id as "headId",
        d.staff_count as "staffCount",
        d.is_active as "isActive",
        d.description,
        d.contact_email as "contactEmail",
        d.contact_phone as "contactPhone",
        d.location,
        d.budget,
        d.created_by as "createdBy",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        u.name as "headName",
        u.email as "headEmail"
      FROM departments d
      LEFT JOIN users u ON u.id::text = d.head_id
      WHERE d.branch_id = $1
      ORDER BY d.name ASC
    `;

    const allDepartmentsResult = await pool.query(allDepartmentsQuery, [branch.id]);
    const allDepartments = allDepartmentsResult.rows;

    // Calculate statistics from ALL department data
    const totalDepartments = allDepartments.length;
    const activeDepartments = allDepartments.filter(dept => dept.isActive).length;
    const inactiveDepartments = totalDepartments - activeDepartments;
    const totalStaff = allDepartments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0);
    const totalBudget = allDepartments.reduce((sum, dept) => sum + (parseFloat(dept.budget) || 0), 0);

    // Get paginated departments
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const departments = allDepartments.slice(offset, offset + parseInt(limit));

    // Create department names string from paginated departments
    const departmentNames = departments.map(dept => dept.name).join(', ');

    // Format the branch data exactly like in the list endpoint
    const branchWithDepartments = {
      ...branch,
      // Use the aliased field names
      postal_code: branch.postalCode,
      manager_id: branch.managerId,
      opening_date: branch.openingDate,
      
      department_count: parseInt(branch.department_count || 0),
      departments: departments, // Paginated department details
      department_names: departmentNames || "", // Comma-separated names
      department_stats: {
        total: totalDepartments,
        active: activeDepartments,
        inactive: inactiveDepartments,
        total_staff: totalStaff,
        total_budget: totalBudget.toFixed(2),
        avg_staff_per_dept: totalDepartments > 0 ? (totalStaff / totalDepartments).toFixed(1) : 0,
        avg_budget_per_dept: totalDepartments > 0 ? (totalBudget / totalDepartments).toFixed(2) : 0
      }
    };
    

    res.json({
      success: true,
      data: branchWithDepartments,
      pagination: {
        total: totalDepartments,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalDepartments / parseInt(limit))
      }
    });

    
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch'
    });
  }
});





router.get('/:id/departments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT d.*, b.name as branch_name
      FROM departments d
      JOIN branches b ON d.branch_id = b.id
      WHERE d.branch_id = $1
      ORDER BY d.name;
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get branch departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch departments'
    });
  }
});

module.exports = router;