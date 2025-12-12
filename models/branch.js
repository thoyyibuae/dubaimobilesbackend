// models/Branch.js
const pool = require('../config/database');


class Branch {
  // Create new branch
 // Update models/Branch.js create method
static async create(branchData) {
  const {
    name,
    code,
    address,
    city,
    state,
    country = 'USA',
    postalCode,
    phone,
    email,
    managerId,
    latitude = 0.0,
    longitude = 0.0,
    openingDate = new Date().toISOString().split('T')[0],
    status = 'active',
    // timezone = 'UTC',
    currency = 'USD',
    supportedPaymentMethods = ['cash', 'card', 'upi'],
    operatingHours = {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '10:00', close: '20:00' },
      sunday: { open: '11:00', close: '18:00' }
    },
    departments = [],
    settings = {},
    createdBy
  } = branchData;

  console.log('📦 Processing branch data:', {
    name, code, latitude, longitude, openingDate
  });

  const query = `
    INSERT INTO branches (
      name, code, address, city, state, country, postal_code, 
      phone, email, manager_id, latitude, longitude, opening_date, 
      status, currency, supported_payment_methods, 
      operating_hours, departments, settings, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING 
      id, name, code, address, city, state, country, postal_code as "postalCode",
      phone, email, manager_id as "managerId", latitude, longitude, 
      opening_date as "openingDate", status, currency, 
      supported_payment_methods as "supportedPaymentMethods",
      operating_hours as "operatingHours",
      departments, settings, created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const values = [
    name, 
    code, 
    address || '', 
    city || '', 
    state || '', 
    country || 'USA', 
    postalCode || '',
    phone || '', 
    email || '', 
    managerId || '',
    parseFloat(latitude) || 0.0,
    parseFloat(longitude) || 0.0,
    openingDate || new Date().toISOString().split('T')[0],
    status || 'active',
    // timezone || 'UTC',
    currency || 'USD',
    Array.isArray(supportedPaymentMethods) ? supportedPaymentMethods : ['cash', 'card', 'upi'],
    typeof operatingHours === 'object' ? operatingHours : {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '10:00', close: '20:00' },
      sunday: { open: '11:00', close: '18:00' }
    },
    Array.isArray(departments) ? departments : [],
    typeof settings === 'object' ? settings : {},
    createdBy
  ];

  console.log('🔢 Query values:', values);

  const client = await pool.connect();
  try {
    console.log('🚀 Executing query...');
    const result = await client.query(query, values);
    console.log('✅ Query executed successfully');
    return result.rows[0];
  } catch (error) {
    console.error('❌ Database error in Branch.create():', error);
    console.error('❌ Query:', query);
    console.error('❌ Values:', values);
    throw error;
  } finally {
    client.release();
  }
}

  // Find branch by ID
  static async findById(id) {
    const query = `
      SELECT 
        id, name, code, address, city, state, country, postal_code as "postalCode",
        phone, email, manager_id as "managerId", latitude, longitude, 
        opening_date as "openingDate", status,  currency, 
        supported_payment_methods as "supportedPaymentMethods",
        operating_hours as "operatingHours",
        departments, settings, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM branches 
      WHERE id = $1
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Find branch by code
  static async findByCode(code) {
    const query = `
      SELECT * FROM branches 
      WHERE code = $1
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [code]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all branches with pagination and filters
  static async findAll(filters = {}, page = 1, limit = 10) {
    let query = `
      SELECT 
        id, name, code, address, city, state, country, postal_code as "postalCode",
        phone, email, manager_id as "managerId", latitude, longitude, 
        opening_date as "openingDate", status,  currency,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM branches 
      WHERE 1=1
    `;
    
    let countQuery = `SELECT COUNT(*) FROM branches WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    // Apply filters
    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      countQuery += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.country) {
      query += ` AND country = $${paramCount}`;
      countQuery += ` AND country = $${paramCount}`;
      values.push(filters.country);
      paramCount++;
    }

    if (filters.city) {
      query += ` AND city = $${paramCount}`;
      countQuery += ` AND city = $${paramCount}`;
      values.push(filters.city);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
      countQuery += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Add ordering
    query += ` ORDER BY created_at DESC`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const client = await pool.connect();
    try {
      const [branchesResult, countResult] = await Promise.all([
        client.query(query, values),
        client.query(countQuery, values.slice(0, -2)) // Exclude limit/offset from count
      ]);

      return {
        branches: branchesResult.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      };
    } finally {
      client.release();
    }
  }

  // Update branch
  static async update(id, updateData) {
    const {
      name, code, address, city, state, country,
      postalCode, phone, email, managerId,
      latitude, longitude, openingDate, status,
       currency, supportedPaymentMethods,
      operatingHours, departments, settings
    } = updateData;

    const query = `
      UPDATE branches 
      SET 
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        address = COALESCE($3, address),
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        country = COALESCE($6, country),
        postal_code = COALESCE($7, postal_code),
        phone = COALESCE($8, phone),
        email = COALESCE($9, email),
        manager_id = COALESCE($10, manager_id),
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        opening_date = COALESCE($13, opening_date),
        status = COALESCE($14, status),
      
        currency = COALESCE($16, currency),
        supported_payment_methods = COALESCE($17, supported_payment_methods),
        operating_hours = COALESCE($18, operating_hours),
        departments = COALESCE($19, departments),
        settings = COALESCE($20, settings),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING 
        id, name, code, address, city, state, country, postal_code as "postalCode",
        phone, email, manager_id as "managerId", latitude, longitude, 
        opening_date as "openingDate", status,currency, 
        supported_payment_methods as "supportedPaymentMethods",
        operating_hours as "operatingHours",
        departments, settings, created_by as "createdBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const values = [
      name, code, address, city, state, country,
      postalCode, phone, email, managerId,
      latitude, longitude, openingDate, status,
      currency, supportedPaymentMethods,
      operatingHours, departments, settings,
      id
    ];

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Delete branch
  static async delete(id) {
    const query = 'DELETE FROM branches WHERE id = $1 RETURNING id';
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get branch statistics
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as totalBranches,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeBranches,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactiveBranches,
        COUNT(DISTINCT country) as countries,
        COUNT(DISTINCT city) as cities
      FROM branches
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = Branch;
