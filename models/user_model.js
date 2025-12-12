// models/User.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create new user with role
  static async create(name, email, password, role = 'user') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, role, created_at
    `;
    const values = [name, email, hashedPassword, role];
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [email]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1';
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all users (admin only)
  static async findAll() {
    const query = 'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC';
    
    const client = await pool.connect();
    try {
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Update user role (admin only)
  static async updateRole(userId, newRole) {
    const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role';
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [newRole, userId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Delete user (admin only)
  static async delete(userId) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [userId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = User;