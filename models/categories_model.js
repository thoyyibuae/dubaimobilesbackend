const pool = require('../config/database');

class Category {
  // Create new category
  static async create(name, description, iconImage = null) {
    const query = `
      INSERT INTO categories (name, description, icon_image)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, icon_image, created_at
    `;
    const values = [name, description, iconImage];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all categories
  static async findAll() {
    const query = `
      SELECT id, name, description, icon_image, created_at, updated_at
      FROM categories
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get category by ID
  static async findById(id) {
    const query = `
      SELECT id, name, description, icon_image, created_at, updated_at
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

  // Update category
  static async update(id, name, description, iconImage = null) {
    const query = `
      UPDATE categories 
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

  // Delete category
  static async delete(id) {
    const query = 'DELETE FROM categories WHERE id = $1 RETURNING id, icon_image';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Check if category exists by name (excluding current id)
  static async existsByName(name, excludeId = null) {
    let query = 'SELECT id FROM categories WHERE name = $1';
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

module.exports = Category;