// const pool = require('../config/database');

// class Category {


//   // Create new category - UPDATED with created_by
//   static async create(name, description, iconImage = null, created_by) {
//     const query = `
//       INSERT INTO categories (name, description, icon_image, created_by)
//       VALUES ($1, $2, $3, $4)
//       RETURNING id, name, description, icon_image, created_by, created_at
//     `;

//     const values = [name, description, iconImage, created_by];
    
//     try {
//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get all categories for specific user - UPDATED
//   static async findAll(userId) {
//     const query = `
//       SELECT 
//         id, 
//         name, 
//         description, 
//         icon_image, 
//         created_by,
//         created_at, 
//         updated_at
//       FROM categories
//       WHERE created_by = $1
//       ORDER BY created_at DESC
//     `;
    
//     try {
//       const result = await pool.query(query, [userId]);
//       return result.rows;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get category by ID for specific user - UPDATED
//   static async findById(id, userId) {
//     const query = `
//       SELECT 
//         id, 
//         name, 
//         description, 
//         icon_image, 
//         created_by,
//         created_at, 
//         updated_at
//       FROM categories
//       WHERE id = $1 AND created_by = $2
//     `;
    
//     try {
//       const result = await pool.query(query, [id, userId]);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Update category for specific user - UPDATED
//   static async update(id, name, description, iconImage = null, userId) {
//     const query = `
//       UPDATE categories 
//       SET name = $1, description = $2, icon_image = $3, updated_at = CURRENT_TIMESTAMP
//       WHERE id = $4 AND created_by = $5
//       RETURNING id, name, description, icon_image, created_by, updated_at
//     `;
//     const values = [name, description, iconImage, id, userId];
    
//     try {
//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Delete category for specific user - UPDATED
//   static async delete(id, userId) {
//     const query = `
//       DELETE FROM categories 
//       WHERE id = $1 AND created_by = $2 
//       RETURNING id, icon_image, created_by
//     `;
    
//     try {
//       const result = await pool.query(query, [id, userId]);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Check if category exists by name for specific user - UPDATED
//   static async existsByName(name, excludeId = null, userId) {
//     let query = 'SELECT id FROM categories WHERE name = $1 AND created_by = $2';
//     const values = [name, userId];
    
//     if (excludeId) {
//       query += ' AND id != $3';
//       values.push(excludeId);
//     }
    
//     try {
//       const result = await pool.query(query, values);
//       return result.rows.length > 0;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get all categories with pagination for specific user - NEW METHOD
//   static async findAllPaginated(userId, page = 1, limit = 10, search = '') {
//     const offset = (page - 1) * limit;
    
//     // Build WHERE clause
//     let whereClause = 'WHERE created_by = $1';
//     const queryParams = [userId];
//     let paramCount = 2;
    
//     if (search) {
//       whereClause += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
//       queryParams.push(`%${search}%`);
//       paramCount++;
//     }
    
//     // Get total count
//     const countQuery = `
//       SELECT COUNT(*) FROM categories 
//       ${whereClause}
//     `;
//     const countResult = await pool.query(countQuery, queryParams);
//     const totalCount = parseInt(countResult.rows[0].count);
    
//     // Get paginated data
//     const dataQuery = `
//       SELECT 
//         id, 
//         name, 
//         description, 
//         icon_image, 
//         created_by,
//         created_at, 
//         updated_at
//       FROM categories 
//       ${whereClause}
//       ORDER BY created_at DESC
//       LIMIT $${paramCount} OFFSET $${paramCount + 1}
//     `;
    
//     const dataParams = [...queryParams, limit, offset];
//     const dataResult = await pool.query(dataQuery, dataParams);
    
//     const totalPages = Math.ceil(totalCount / limit);
    
//     return {
//       data: dataResult.rows,
//       pagination: {
//         currentPage: page,
//         totalPages: totalPages,
//         totalItems: totalCount,
//         itemsPerPage: limit,
//         hasNextPage: page < totalPages,
//         hasPreviousPage: page > 1,
//         nextPage: page < totalPages ? page + 1 : null,
//         previousPage: page > 1 ? page - 1 : null
//       }
//     };
//   }

//   // Search categories by name for specific user - NEW METHOD
//   static async searchByName(name, userId, page = 1, limit = 10) {
//     const offset = (page - 1) * limit;
    
//     const query = `
//       SELECT 
//         id, 
//         name, 
//         description, 
//         icon_image, 
//         created_by,
//         created_at, 
//         updated_at
//       FROM categories
//       WHERE created_by = $1 AND name ILIKE $2
//       ORDER BY name
//       LIMIT $3 OFFSET $4
//     `;
    
//     const countQuery = `
//       SELECT COUNT(*) FROM categories
//       WHERE created_by = $1 AND name ILIKE $2
//     `;
    
//     try {
//       // Get total count
//       const countResult = await pool.query(countQuery, [userId, `%${name}%`]);
//       const totalCount = parseInt(countResult.rows[0].count);
      
//       // Get paginated results
//       const result = await pool.query(query, [userId, `%${name}%`, limit, offset]);
      
//       const totalPages = Math.ceil(totalCount / limit);
      
//       return {
//         data: result.rows,
//         pagination: {
//           currentPage: page,
//           totalPages: totalPages,
//           totalItems: totalCount,
//           itemsPerPage: limit,
//           hasNextPage: page < totalPages,
//           hasPreviousPage: page > 1
//         }
//       };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get total count of categories for specific user - NEW METHOD
//   static async getCount(userId) {
//     const query = `
//       SELECT COUNT(*) FROM categories 
//       WHERE created_by = $1
//     `;
    
//     try {
//       const result = await pool.query(query, [userId]);
//       return parseInt(result.rows[0].count);
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get categories by created_by - NEW METHOD
//   static async getByCreatedBy(userId) {
//     const query = `
//       SELECT 
//         id, 
//         name, 
//         description, 
//         icon_image, 
//         created_by,
//         created_at, 
//         updated_at
//       FROM categories
//       WHERE created_by = $1
//       ORDER BY created_at DESC
//     `;
    
//     try {
//       const result = await pool.query(query, [userId]);
//       return result.rows;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get category by ID without user filter (for internal use) - KEPT OLD METHOD
//   static async findByIdInternal(id) {
//     const query = `
//       SELECT 
//         id, 
//         name, 
//         description, 
//         icon_image, 
//         created_by,
//         created_at, 
//         updated_at
//       FROM categories
//       WHERE id = $1
//     `;
    
//     try {
//       const result = await pool.query(query, [id]);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }
// }

// module.exports = Category;





const pool = require('../config/database');
const path = require('path');
const s3Service = require(path.join(__dirname, '../config/awsS3.js'));

class Category {
  // Handle image uploads for categories
  static async handleImageUploads(categoryData, existingCategory = null) {
    const processedData = { ...categoryData };
    
    try {
      // Handle file upload from multer
      if (processedData.icon_image_file) {
        // Delete old image if exists
        if (existingCategory && existingCategory.icon_image) {
          try {
            await s3Service.deleteFile(existingCategory.icon_image);
            console.log("Deleted old category image from S3");
          } catch (deleteError) {
            console.warn("Failed to delete old image (non-critical):", deleteError.message);
          }
        }
        
        const uploadResult = await s3Service.uploadCategoryFile(
          processedData.icon_image_file,
          existingCategory ? existingCategory.id : 'temp'
        );
        
        processedData.icon_image = uploadResult.url;
        delete processedData.icon_image_file;
      }
      
      // Handle base64 image
      if (processedData.icon_image_base64) {
        // Delete old image if exists
        if (existingCategory && existingCategory.icon_image) {
          try {
            await s3Service.deleteFile(existingCategory.icon_image);
            console.log("Deleted old category image from S3");
          } catch (deleteError) {
            console.warn("Failed to delete old image (non-critical):", deleteError.message);
          }
        }
        
        const contentType = processedData.icon_image_type || 'image/jpeg';
        const uploadResult = await s3Service.uploadCategoryBase64Image(
          processedData.icon_image_base64,
          existingCategory ? existingCategory.id : 'temp',
          contentType
        );
        
        processedData.icon_image = uploadResult.url;
        delete processedData.icon_image_base64;
        delete processedData.icon_image_type;
      }
      
      return processedData;
    } catch (error) {
      console.error('Error handling category image uploads:', error);
      throw error;
    }
  }

  // Create new category - UPDATED with S3 upload
  static async create(categoryData, created_by) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== CREATE CATEGORY ===");
      console.log("Input data:", {
        name: categoryData.name,
        description: categoryData.description,
        created_by: created_by,
        hasIconImage: !!(categoryData.icon_image_file || categoryData.icon_image_base64)
      });

      // Handle image uploads
      const processedData = await this.handleImageUploads(categoryData);
      
      const query = `
        INSERT INTO categories (name, description, icon_image, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, icon_image, created_by, created_at, updated_at
      `;

      const values = [
        processedData.name,
        processedData.description || null,
        processedData.icon_image || null,
        created_by
      ];
      
      console.log("Inserting values:", values);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const category = result.rows[0];
      console.log("Category created successfully:", category.id);
      console.log("=== END CREATE CATEGORY ===");
      
      return category;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Category creation error:', error);
      throw error;
    } finally {
      client.release();
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

  // Update category for specific user - UPDATED with S3
  static async update(id, updateData, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== UPDATE CATEGORY ===");
      console.log("Category ID:", id);
      console.log("User ID:", userId);
      
      // Get existing category for image cleanup
      const existingQuery = 'SELECT * FROM categories WHERE id = $1 AND created_by = $2';
      const existingResult = await client.query(existingQuery, [id, userId]);
      
      if (existingResult.rows.length === 0) {
        throw new Error('Category not found');
      }
      
      const existingCategory = existingResult.rows[0];
      
      // Handle image uploads
      const processedData = await this.handleImageUploads(updateData, existingCategory);
      
      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      // Check if name should be updated
      if (processedData.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(processedData.name);
        paramIndex++;
      }
      
      // Check if description should be updated
      if (processedData.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(processedData.description || null);
        paramIndex++;
      }
      
      // Check if icon_image should be updated
      if (processedData.icon_image !== undefined) {
        updates.push(`icon_image = $${paramIndex}`);
        values.push(processedData.icon_image);
        paramIndex++;
      }
      
      // If no fields to update, return existing category
      if (updates.length === 0) {
        console.log("No fields to update, returning existing category");
        await client.query('ROLLBACK');
        return existingCategory;
      }
      
      // Add updated_at timestamp
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add ID and user_id for WHERE clause
      values.push(id, userId);
      
      const query = `
        UPDATE categories 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
        RETURNING id, name, description, icon_image, created_by, created_at, updated_at
      `;
      
      console.log("Update query:", query);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const updatedCategory = result.rows[0];
      console.log("Category updated successfully:", {
        id: updatedCategory.id,
        name: updatedCategory.name
      });
      console.log("=== END UPDATE CATEGORY ===");
      
      return updatedCategory;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Category update error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete category for specific user - UPDATED with S3 cleanup
  static async delete(id, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== DELETE CATEGORY ===");
      console.log("Category ID:", id);
      console.log("User ID:", userId);
      
      // Get category details for image cleanup
      const getQuery = 'SELECT * FROM categories WHERE id = $1 AND created_by = $2';
      const getResult = await client.query(getQuery, [id, userId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Category not found');
      }
      
      const category = getResult.rows[0];
      
      // Delete image from S3 if exists
      if (category.icon_image) {
        try {
          await s3Service.deleteFile(category.icon_image);
          console.log("Deleted category image from S3");
        } catch (deleteError) {
          console.warn("Failed to delete image (non-critical):", deleteError.message);
        }
      }
      
      // Delete category from database
      const deleteQuery = 'DELETE FROM categories WHERE id = $1 AND created_by = $2 RETURNING *';
      const result = await client.query(deleteQuery, [id, userId]);
      
      await client.query('COMMIT');
      
      console.log("Category deleted successfully");
      console.log("=== END DELETE CATEGORY ===");
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Category deletion error:', error);
      throw error;
    } finally {
      client.release();
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


