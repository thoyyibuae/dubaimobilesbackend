const pool = require('../config/database');

class Brand {
  // Create new brand
  static async create(name, description, iconImage = null,createdBy) {
         // Get user ID from authentication

    const query = `
      INSERT INTO brands (name, description, icon_image,created_by)
      VALUES ($1, $2, $3,$4)
      RETURNING id, name, description, icon_image, created_at,
      created_by
    `;

    const values = [name, description, iconImage,createdBy];

    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  
  // Get all brands
  static async findAll(createdBy) {
    
    // const query = `
    //   SELECT id, name, description, icon_image, created_at, updated_at
    //   FROM brands
    //   ORDER BY created_at DESC
    //     WHERE 1=1
    //   AND created_by = $1  -- Add filter for created_by
    // `;

      const query = `
      SELECT id, name, description, icon_image, created_by, created_at, updated_at
      FROM brands
      WHERE 1=1
      AND created_by = $1  -- Add filter for created_by
      ORDER BY created_at DESC
    `;
    
    
    try {
      
      const result = await pool.query(query,[createdBy]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get brand by ID
  static async findById(id) {
    const query = `
      SELECT id, name, description, icon_image, created_at, updated_at
      FROM brands
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update brand
  static async update(id, name, description, iconImage = null) {
    const query = `
      UPDATE brands 
      SET name = $1, description = $2, icon_image = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, description, icon_image, updated_at
    `;
    const values = [name, description, iconImage, id];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete brand
  static async delete(id) {
    const query = 'DELETE FROM brands WHERE id = $1 RETURNING id, icon_image';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Check if brand exists by name (excluding current id)
  static async existsByName(name, excludeId = null) {
    let query = 'SELECT id FROM brands WHERE name = $1';
    let values = [name];
    
    if (excludeId) {
      query += ' AND id != $2';
      values.push(excludeId);
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Brand;