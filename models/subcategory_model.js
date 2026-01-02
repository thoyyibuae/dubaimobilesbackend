const { pool } = require('../config/subcategory_database');


const path = require('path'); // ADD THIS LINE
const s3Service = require(path.join(__dirname, '../config/awsS3.js'));



class Subcategory {
  // Handle image uploads
//   static async handleImageUploads(subcategoryData, existingSubcategory = null) {
//     const processedData = { ...subcategoryData };
    
//     try {
//       // Handle file upload from multer
//       if (processedData.icon_image_file) {
//         // Delete old image if exists
//         if (existingSubcategory && existingSubcategory.icon_image) {
//           const oldKey = s3Service.extractKeyFromUrl(existingSubcategory.icon_image);
//           await s3Service.deleteFile(oldKey);
//         }
        
//         const uploadResult = await s3Service.uploadFile(
//           processedData.icon_image_file,
//           existingSubcategory ? existingSubcategory.id : 'temp'
//         );
        
//         processedData.icon_image = uploadResult.url;
//         delete processedData.icon_image_file;
//       }
      
//       // Handle base64 image
//       if (processedData.icon_image_base64) {
//         // Delete old image if exists
//         if (existingSubcategory && existingSubcategory.icon_image) {
//           const oldKey = s3Service.extractKeyFromUrl(existingSubcategory.icon_image);
//           await s3Service.deleteFile(oldKey);
//         }
        
//         const contentType = processedData.icon_image_type || 'image/jpeg';
//         const uploadResult = await s3Service.uploadBase64Image(
//           processedData.icon_image_base64,
//           existingSubcategory ? existingSubcategory.id : 'temp',
//           contentType
//         );
        
//         processedData.icon_image = uploadResult.url;
//         delete processedData.icon_image_base64;
//         delete processedData.icon_image_type;
//       }
      
//       return processedData;
//     } catch (error) {
//       console.error('Error handling image uploads:', error);
//       throw error;
//     }
//   }


// In subcategory_model.js, update the handleImageUploads method:

static async handleImageUploads(subcategoryData, existingSubcategory = null) {
  const processedData = { ...subcategoryData };
  
  try {
    // Handle file upload from multer
    if (processedData.icon_image_file) {
      // Delete old image if exists
      if (existingSubcategory && existingSubcategory.icon_image) {
        try {
          await s3Service.deleteFile(existingSubcategory.icon_image);
          console.log("Deleted old icon image from S3");
        } catch (deleteError) {
          console.warn("Failed to delete old image (non-critical):", deleteError.message);
        }
      }
      
      const uploadResult = await s3Service.uploadFile(
        processedData.icon_image_file,
        existingSubcategory ? existingSubcategory.id : 'temp'
      );
      
      processedData.icon_image = uploadResult.url;
      delete processedData.icon_image_file;
    }
    
    // Handle base64 image
    if (processedData.icon_image_base64) {
      // Delete old image if exists
      if (existingSubcategory && existingSubcategory.icon_image) {
        try {
          await s3Service.deleteFile(existingSubcategory.icon_image);
          console.log("Deleted old icon image from S3");
        } catch (deleteError) {
          console.warn("Failed to delete old image (non-critical):", deleteError.message);
        }
      }
      
      const contentType = processedData.icon_image_type || 'image/jpeg';
      const uploadResult = await s3Service.uploadBase64Image(
        processedData.icon_image_base64,
        existingSubcategory ? existingSubcategory.id : 'temp',
        contentType
      );
      
      processedData.icon_image = uploadResult.url;
      delete processedData.icon_image_base64;
      delete processedData.icon_image_type;
    }
    
    return processedData;
  } catch (error) {
    console.error('Error handling image uploads:', error);
    throw error;
  }
}


  // Create subcategory
  static async create(subcategoryData, createdById) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== CREATE SUBCATEGORY ===");
      console.log("Input data:", {
        maincategoryId: subcategoryData.maincategoryId,
        subName: subcategoryData.subName,
        hasIconImage: !!(subcategoryData.icon_image_file || subcategoryData.icon_image_base64)
      });

      // Handle image uploads
      const processedData = await this.handleImageUploads(subcategoryData);
      
      const query = `
        INSERT INTO subcategories (
          maincategoryId, subName, icon_image, created_by
        ) 
        VALUES ($1, $2, $3, $4) 
        RETURNING 
          id, maincategoryId, subName, icon_image, created_by,
          created_at, updated_at
      `;
      
      const values = [
        processedData.maincategoryId,
        processedData.subName,
        processedData.icon_image || null,
        createdById
      ];
      
      console.log("Inserting values:", values);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const subcategory = result.rows[0];
      console.log("Subcategory created successfully:", subcategory.id);
      console.log("=== END CREATE SUBCATEGORY ===");
      
      return subcategory;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Subcategory creation error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  

  // Get all subcategories with pagination
static async findAll(page = 1, limit = 10, search = '', maincategoryId = null, createdBy = null) {
  try {
    const offset = (page - 1) * limit;
        //  u.username as created_by_username  -- Join to get creator name
    let query = `
      SELECT 
        s.id,
        s.maincategoryid,
        s.subname,
        s.icon_image,
        s.created_by,
        s.created_at,
        s.updated_at,
        c.name as category_name
   
      FROM subcategories s
      LEFT JOIN categories c ON s.maincategoryid = c.id
      LEFT JOIN users u ON s.created_by = u.id  -- Join with users table
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) 
      FROM subcategories s
      LEFT JOIN categories c ON s.maincategoryid = c.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE 1=1
    `;
    
    const values = [];
    const countValues = [];
    let paramIndex = 1;

    // Enhanced Search filter
    if (search) {
      query += ` AND (s.subname ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      countQuery += ` AND (s.subname ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      countValues.push(`%${search}%`);
      paramIndex++;
    }

    // Category filter
    if (maincategoryId) {
      query += ` AND s.maincategoryid = $${paramIndex}`;
      countQuery += ` AND s.maincategoryid = $${paramIndex}`;
      values.push(maincategoryId);
      countValues.push(maincategoryId);
      paramIndex++;
    }

    // Created By filter - filter by specific user/creator
    if (createdBy) {
      query += ` AND s.created_by = $${paramIndex}`;
      countQuery += ` AND s.created_by = $${paramIndex}`;
      values.push(createdBy);
      countValues.push(createdBy);
      paramIndex++;
    }

    // Add pagination and sorting
    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    console.log("FindAll Query:", query);
    console.log("FindAll Values:", values);

    // Execute both queries
    const [subcategoriesResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, countValues)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      subcategories: subcategoriesResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error getting subcategories:', error);
    throw error;
  }
}

  // Get subcategory by ID
//   static async findById(id) {
//     try {
//       const query = `
//         SELECT s.*, c.name as category_name 
//         FROM subcategories s
//         LEFT JOIN categories c ON s.maincategoryId = c.id
//         WHERE s.id = $1;
//       `;
//       const result = await pool.query(query, [id]);
//       return result.rows[0];
//     } catch (error) {
//       console.error('Error getting subcategory by ID:', error);
//       throw error;
//     }
//   }


// Get subcategory by ID
static async findById(id) {
  try {
    const query = `
      SELECT 
        s.id,
        s.maincategoryid,
        s.subname,
        s.icon_image,
        s.created_by,
        s.created_at,
        s.updated_at,
        c.name as category_name
      FROM subcategories s
      LEFT JOIN categories c ON s.maincategoryid = c.id
      WHERE s.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting subcategory by ID:', error);
    throw error;
  }
}


  // Get subcategories by maincategory ID
  static async findByCategoryId(maincategoryId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT s.*, c.name as category_name 
        FROM subcategories s
        LEFT JOIN categories c ON s.maincategoryId = c.id
        WHERE s.maincategoryId = $1
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3;
      `;
      
      const countQuery = `
        SELECT COUNT(*) FROM subcategories WHERE maincategoryId = $1;
      `;

      const [subcategoriesResult, countResult] = await Promise.all([
        pool.query(query, [maincategoryId, limit, offset]),
        pool.query(countQuery, [maincategoryId])
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        subcategories: subcategoriesResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting subcategories by category:', error);
      throw error;
    }
  }

  // Update subcategory
// static async update(id, updateData) {
//   const client = await pool.connect();
  
//   try {
//     await client.query('BEGIN');
    
//     console.log("=== UPDATE SUBCATEGORY ===");
//     console.log("Subcategory ID:", id);
//     console.log("Update data received:", {
//       keys: Object.keys(updateData),
//       hasSubName: updateData.subName !== undefined,
//       hasIconFile: !!updateData.icon_image_file,
//       hasIconBase64: !!updateData.icon_image_base64
//     });
    
//     // Get existing subcategory for image cleanup
//     const existingQuery = 'SELECT * FROM subcategories WHERE id = $1';
//     const existingResult = await client.query(existingQuery, [id]);
    
//     if (existingResult.rows.length === 0) {
//       throw new Error('Subcategory not found');
//     }
    
//     const existingSubcategory = existingResult.rows[0];
//     console.log("Existing subcategory:", {
//       id: existingSubcategory.id,
//       subName: existingSubcategory.subname,
//       hasIconImage: !!existingSubcategory.icon_image
//     });
    
//     // Handle image uploads
//     const processedData = await this.handleImageUploads(updateData, existingSubcategory);
    
//     console.log("After handleImageUploads:", {
//       processedKeys: Object.keys(processedData),
//       hasSubName: processedData.subName !== undefined,
//       hasIconImage: processedData.icon_image !== undefined
//     });
    
//     // Build dynamic update query
//     const updates = [];
//     const values = [];
//     let paramIndex = 1;
    
//     // Check if maincategoryId should be updated
//     if (processedData.maincategoryId !== undefined) {
//       updates.push(`maincategoryId = $${paramIndex}`);
//       values.push(processedData.maincategoryId);
//       paramIndex++;
//       console.log("Will update maincategoryId:", processedData.maincategoryId);
//     }
    
//     // Check if subName should be updated
//     if (processedData.subName !== undefined) {
//       updates.push(`subName = $${paramIndex}`);
//       values.push(processedData.subName);
//       paramIndex++;
//       console.log("Will update subName:", processedData.subName);
//     } else {
//       console.log("subName not provided, keeping existing value:", existingSubcategory.subname);
//     }
    
//     // Check if icon_image should be updated
//     if (processedData.icon_image !== undefined) {
//       updates.push(`icon_image = $${paramIndex}`);
//       values.push(processedData.icon_image);
//       paramIndex++;
//       console.log("Will update icon_image:", processedData.icon_image);
//     } else {
//       console.log("icon_image not provided, keeping existing value");
//     }
    
//     // If no fields to update, return existing subcategory
//     if (updates.length === 0) {
//       console.log("No fields to update, returning existing subcategory");
//       await client.query('ROLLBACK');
//       return existingSubcategory;
//     }
    
//     // Add updated_at timestamp
//     updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
//     // Add ID for WHERE clause
//     values.push(id);
    
//     const query = `
//       UPDATE subcategories 
//       SET ${updates.join(', ')}
//       WHERE id = $${paramIndex}
//       RETURNING 
//         id, maincategoryId, subName, icon_image, created_by,
//         created_at, updated_at
//     `;
    
//     console.log("Update query:", query);
//     console.log("Update values:", values);
    
//     const result = await client.query(query, values);
//     await client.query('COMMIT');
    
//     const updatedSubcategory = result.rows[0];
//     console.log("Subcategory updated successfully:", {
//       id: updatedSubcategory.id,
//       subName: updatedSubcategory.subname,
//       hasIconImage: !!updatedSubcategory.icon_image
//     });
//     console.log("=== END UPDATE SUBCATEGORY ===");
    
//     return updatedSubcategory;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Subcategory update error:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }



static async update(id, updateData) {
  const client = await pool.connect();
  

  try {
    await client.query('BEGIN');
    
    console.log("=== UPDATE SUBCATEGORY ===");
    console.log("Subcategory ID:", id);
    
    // Get existing subcategory for image cleanup
    const existingQuery = 'SELECT * FROM subcategories WHERE id = $1';
    const existingResult = await client.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      throw new Error('Subcategory not found');
    }
    
    const existingSubcategory = existingResult.rows[0];
    
    // Handle image uploads
    const processedData = await this.handleImageUploads(updateData, existingSubcategory);
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    // Check if maincategoryId should be updated
    if (processedData.maincategoryId !== undefined) {
      updates.push(`maincategoryid = $${paramIndex}`);
      values.push(processedData.maincategoryId);
      paramIndex++;
    }
    
    // Check if subName should be updated
    if (processedData.subName !== undefined) {
      updates.push(`subname = $${paramIndex}`);
      values.push(processedData.subName);
      paramIndex++;
    }
    
    // Check if icon_image should be updated
    if (processedData.icon_image !== undefined) {
      updates.push(`icon_image = $${paramIndex}`);
      values.push(processedData.icon_image);
      paramIndex++;
    }
    
    // If no fields to update, return existing subcategory with category_name
    if (updates.length === 0) {
      console.log("No fields to update, returning existing subcategory");
      
      // Get the subcategory with category_name
      const subcategoryWithCategory = await this._getSubcategoryWithCategory(id, client);
      
      await client.query('ROLLBACK');
      return subcategoryWithCategory;
    }
    
    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add ID for WHERE clause
    values.push(id);
    
    const query = `
      UPDATE subcategories 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, maincategoryid, subname, icon_image, created_by,
        created_at, updated_at
    `;
    
    console.log("Update query:", query);
    
    const result = await client.query(query, values);
    await client.query('COMMIT');
    
    // Get the updated subcategory with category_name
    const subcategoryWithCategory = await this._getSubcategoryWithCategory(id, client);
    
    console.log("Subcategory updated successfully:", {
      id: subcategoryWithCategory.id,
      subname: subcategoryWithCategory.subname,
      category_name: subcategoryWithCategory.category_name
    });
    console.log("=== END UPDATE SUBCATEGORY ===");
    
    return subcategoryWithCategory;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Subcategory update error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper method to get subcategory with category_name
// Helper method to get subcategory with category_name and proper field names

static async _getSubcategoryWithCategory(id, client = null) {
  const useExternalClient = client !== null;
  const dbClient = client || await pool.connect();
  
  try {
    const query = `
      SELECT 
        s.id,
        s.maincategoryid,
        s.subname,
        s.icon_image,
        s.created_by,
        s.created_at,
        s.updated_at,
        c.name as category_name
      FROM subcategories s
      LEFT JOIN categories c ON s.maincategoryid = c.id
      WHERE s.id = $1
    `;
    
    const result = await dbClient.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } finally {
    if (!useExternalClient) {
      dbClient.release();
    }
  }
}





  // Delete subcategory
  static async delete(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== DELETE SUBCATEGORY ===");
      console.log("Subcategory ID to delete:", id);
      
      // Get subcategory details for image cleanup
      const getQuery = 'SELECT * FROM subcategories WHERE id = $1';
      const getResult = await client.query(getQuery, [id]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Subcategory not found');
      }
      
      const subcategory = getResult.rows[0];
      
      // Delete image from S3 if exists
      if (subcategory.icon_image) {
        const imageKey = s3Service.extractKeyFromUrl(subcategory.icon_image);
        await s3Service.deleteFile(imageKey);
        console.log("Deleted image from S3");
      }
      
      // Delete subcategory from database
      const deleteQuery = 'DELETE FROM subcategories WHERE id = $1 RETURNING *';
      const result = await client.query(deleteQuery, [id]);
      
      await client.query('COMMIT');
      
      console.log("Subcategory deleted successfully");
      console.log("=== END DELETE SUBCATEGORY ===");
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Subcategory deletion error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Subcategory;


