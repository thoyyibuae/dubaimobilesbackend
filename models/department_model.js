const pool = require('../config/database');

class Department {
  // CREATE DEPARTMENT
  static async create(departmentData) {
  const query = `
    INSERT INTO departments (
      branch_id, type, name, head_id, staff_count, is_active,
      description, contact_email, contact_phone, location, budget, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;
  
  const values = [
    departmentData.branchId,
    departmentData.type,
    departmentData.name,
    departmentData.headId,
    departmentData.staffCount || 0,
    departmentData.isActive !== undefined ? departmentData.isActive : true,
    departmentData.description || null,
    departmentData.contactEmail || null,
    departmentData.contactPhone || null,
    departmentData.location || null,
    departmentData.budget || 0.00,
    // departmentData.createdBy  // This comes from JWT, not request body
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}
  // FIND BY ID
  static async findById(id) {
    const query = 'SELECT * FROM departments WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // FIND BY BRANCH ID
  static async findByBranchId(branchId, options = {}) {
    let query = 'SELECT * FROM departments WHERE branch_id = $1';
    const params = [branchId];
    
    if (options.activeOnly) {
      query += ' AND is_active = $2';
      params.push(true);
    }
    
    if (options.type) {
      query += options.activeOnly ? ' AND type = $3' : ' AND type = $2';
      params.push(options.type);
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // FIND ALL WITH FILTERS
  static async findAll(options = {}) {
    let query = 'SELECT * FROM departments WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (options.branchId) {
      query += ` AND branch_id = $${paramCount}`;
      params.push(options.branchId);
      paramCount++;
    }
    
    if (options.activeOnly) {
      query += ` AND is_active = $${paramCount}`;
      params.push(true);
      paramCount++;
    }
    
    if (options.type) {
      query += ` AND type = $${paramCount}`;
      params.push(options.type);
      paramCount++;
    }
    
    if (options.search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${options.search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY name';
    
    if (options.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
      paramCount++;
      
      if (options.offset) {
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // GET TOTAL COUNT FOR PAGINATION
  static async getTotalCount(options = {}) {
    let query = 'SELECT COUNT(*) FROM departments WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (options.branchId) {
      query += ` AND branch_id = $${paramCount}`;
      params.push(options.branchId);
      paramCount++;
    }
    
    if (options.activeOnly) {
      query += ` AND is_active = $${paramCount}`;
      params.push(true);
      paramCount++;
    }
    
    if (options.type) {
      query += ` AND type = $${paramCount}`;
      params.push(options.type);
      paramCount++;
    }
    
    if (options.search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${options.search}%`);
      paramCount++;
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // UPDATE DEPARTMENT
  static async update(id, updateData) {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (updateData.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(updateData.name);
      paramCount++;
    }
    
    if (updateData.type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(updateData.type);
      paramCount++;
    }
    
    if (updateData.headId !== undefined) {
      updates.push(`head_id = $${paramCount}`);
      values.push(updateData.headId);
      paramCount++;
    }
    
    if (updateData.staffCount !== undefined) {
      updates.push(`staff_count = $${paramCount}`);
      values.push(updateData.staffCount);
      paramCount++;
    }
    
    if (updateData.isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(updateData.isActive);
      paramCount++;
    }
    
    if (updateData.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(updateData.description);
      paramCount++;
    }
    
    if (updateData.contactEmail !== undefined) {
      updates.push(`contact_email = $${paramCount}`);
      values.push(updateData.contactEmail);
      paramCount++;
    }
    
    if (updateData.contactPhone !== undefined) {
      updates.push(`contact_phone = $${paramCount}`);
      values.push(updateData.contactPhone);
      paramCount++;
    }
    
    if (updateData.location !== undefined) {
      updates.push(`location = $${paramCount}`);
      values.push(updateData.location);
      paramCount++;
    }

    
    if (updateData.budget !== undefined) {
      updates.push(`budget = $${paramCount}`);
      values.push(updateData.budget);
      paramCount++;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    const query = `
      UPDATE departments 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;
    
    values.push(id);
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // DELETE DEPARTMENT
  static async delete(id) {
    const query = 'DELETE FROM departments WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // GET STATISTICS
  static async getStats(branchId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_departments,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_departments,
        SUM(staff_count) as total_staff,
        AVG(staff_count) as avg_staff_per_dept,
        SUM(budget) as total_budget,
        AVG(budget) as avg_budget_per_dept
      FROM departments
    `;
    
    const params = [];
    
    if (branchId) {
      query += ' WHERE branch_id = $1';
      params.push(branchId);
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // CHECK HEAD AVAILABILITY
  static async checkHeadAvailability(headId, excludeDepartmentId = null) {
    let query = 'SELECT COUNT(*) FROM departments WHERE head_id = $1';
    const params = [headId];
    
    if (excludeDepartmentId) {
      query += ' AND id != $2';
      params.push(excludeDepartmentId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  // GET USED DEPARTMENT TYPES
  static async getUsedDepartmentTypes() {
    const query = `
      SELECT DISTINCT type 
      FROM departments 
      WHERE type IS NOT NULL AND type != ''
      ORDER BY type;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.type);
  }
}

module.exports = Department;