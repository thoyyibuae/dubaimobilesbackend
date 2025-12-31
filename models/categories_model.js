const pool = require('../config/database');

class Category {

  // Create new category - UPDATED with created_by
  static async create(name, description, iconImage = null, created_by) {
    const query = `
      INSERT INTO categories (name, description, icon_image, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, icon_image, created_by, created_at
    `;

    const values = [name, description, iconImage, created_by];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all categories for specific user - UPDATED
  static async findAll(userId) {
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        icon_image, 
        created_by,
        created_at, 
        updated_at
      FROM categories
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get category by ID for specific user - UPDATED
  static async findById(id, userId) {
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        icon_image, 
        created_by,
        created_at, 
        updated_at
      FROM categories
      WHERE id = $1 AND created_by = $2
    `;
    
    try {
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update category for specific user - UPDATED
  static async update(id, name, description, iconImage = null, userId) {
    const query = `
      UPDATE categories 
      SET name = $1, description = $2, icon_image = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND created_by = $5
      RETURNING id, name, description, icon_image, created_by, updated_at
    `;
    const values = [name, description, iconImage, id, userId];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete category for specific user - UPDATED
  static async delete(id, userId) {
    const query = `
      DELETE FROM categories 
      WHERE id = $1 AND created_by = $2 
      RETURNING id, icon_image, created_by
    `;
    
    try {
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Check if category exists by name for specific user - UPDATED
  static async existsByName(name, excludeId = null, userId) {
    let query = 'SELECT id FROM categories WHERE name = $1 AND created_by = $2';
    const values = [name, userId];
    
    if (excludeId) {
      query += ' AND id != $3';
      values.push(excludeId);
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get all categories with pagination for specific user - NEW METHOD
  static async findAllPaginated(userId, page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = 'WHERE created_by = $1';
    const queryParams = [userId];
    let paramCount = 2;
    
    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM categories 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        id, 
        name, 
        description, 
        icon_image, 
        created_by,
        created_at, 
        updated_at
      FROM categories 
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
        totalPages: totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null
      }
    };
  }

  // Search categories by name for specific user - NEW METHOD
  static async searchByName(name, userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        icon_image, 
        created_by,
        created_at, 
        updated_at
      FROM categories
      WHERE created_by = $1 AND name ILIKE $2
      ORDER BY name
      LIMIT $3 OFFSET $4
    `;
    
    const countQuery = `
      SELECT COUNT(*) FROM categories
      WHERE created_by = $1 AND name ILIKE $2
    `;
    
    try {
      // Get total count
      const countResult = await pool.query(countQuery, [userId, `%${name}%`]);
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Get paginated results
      const result = await pool.query(query, [userId, `%${name}%`, limit, offset]);
      
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        data: result.rows,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get total count of categories for specific user - NEW METHOD
  static async getCount(userId) {
    const query = `
      SELECT COUNT(*) FROM categories 
      WHERE created_by = $1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Get categories by created_by - NEW METHOD
  static async getByCreatedBy(userId) {
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        icon_image, 
        created_by,
        created_at, 
        updated_at
      FROM categories
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get category by ID without user filter (for internal use) - KEPT OLD METHOD
  static async findByIdInternal(id) {
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        icon_image, 
        created_by,
        created_at, 
        updated_at
      FROM categories
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Category;

