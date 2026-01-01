// const pool = require('../config/database');


// const path = require('path'); // ADD THIS LINE
// const s3Service = require(path.join(__dirname, '../config/awsS3.js'));


// class Brand {
//   // Create new brand
//   static async create(name, description, iconImage = null,createdBy) {
//          // Get user ID from authentication

//     const query = `
//       INSERT INTO brands (name, description, icon_image,created_by)
//       VALUES ($1, $2, $3,$4)
//       RETURNING id, name, description, icon_image, created_at,
//       created_by
//     `;

//     const values = [name, description, iconImage,createdBy];

    
//     try {
//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

  
//   // Get all brands
//   static async findAll(createdBy) {
    
//     // const query = `
//     //   SELECT id, name, description, icon_image, created_at, updated_at
//     //   FROM brands
//     //   ORDER BY created_at DESC
//     //     WHERE 1=1
//     //   AND created_by = $1  -- Add filter for created_by
//     // `;

//       const query = `
//       SELECT id, name, description, icon_image, created_by, created_at, updated_at
//       FROM brands
//       WHERE 1=1
//       AND created_by = $1  -- Add filter for created_by
//       ORDER BY created_at DESC
//     `;
    
    
//     try {
      
//       const result = await pool.query(query,[createdBy]);
//       return result.rows;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get brand by ID
//   static async findById(id) {
//     const query = `
//       SELECT id, name, description, icon_image, created_at, updated_at
//       FROM brands
//       WHERE id = $1
//     `;
    
//     try {
//       const result = await pool.query(query, [id]);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Update brand
//   static async update(id, name, description, iconImage = null) {
//     const query = `
//       UPDATE brands 
//       SET name = $1, description = $2, icon_image = $3, updated_at = CURRENT_TIMESTAMP
//       WHERE id = $4
//       RETURNING id, name, description, icon_image, updated_at
//     `;
//     const values = [name, description, iconImage, id];
    
//     try {
//       const result = await pool.query(query, values);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Delete brand
//   static async delete(id) {
//     const query = 'DELETE FROM brands WHERE id = $1 RETURNING id, icon_image';
    
//     try {
//       const result = await pool.query(query, [id]);
//       return result.rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Check if brand exists by name (excluding current id)
//   static async existsByName(name, excludeId = null) {
//     let query = 'SELECT id FROM brands WHERE name = $1';
//     let values = [name];
    
//     if (excludeId) {
//       query += ' AND id != $2';
//       values.push(excludeId);
//     }
    
//     try {
//       const result = await pool.query(query, values);
//       return result.rows.length > 0;
//     } catch (error) {
//       throw error;
//     }
//   }




// static async handleImageUploads(subcategoryData, existingSubcategory = null) {
//   const processedData = { ...subcategoryData };
  
//   try {
//     // Handle file upload from multer
//     if (processedData.icon_image_file) {
//       // Delete old image if exists
//       if (existingSubcategory && existingSubcategory.icon_image) {
//         try {
//           await s3Service.deleteFile(existingSubcategory.icon_image);
//           console.log("Deleted old icon image from S3");
//         } catch (deleteError) {
//           console.warn("Failed to delete old image (non-critical):", deleteError.message);
//         }
//       }
      
//       const uploadResult = await s3Service.uploadBrandFile(
//         processedData.icon_image_file,
//         existingSubcategory ? existingSubcategory.id : 'temp'
//       );
      
//       processedData.icon_image = uploadResult.url;
//       delete processedData.icon_image_file;
//     }
    

//     // Handle base64 image
//     if (processedData.icon_image_base64) {
//       // Delete old image if exists
//       if (existingSubcategory && existingSubcategory.icon_image) {
//         try {
//           await s3Service.deleteFile(existingSubcategory.icon_image);
//           console.log("Deleted old icon image from S3");
//         } catch (deleteError) {
//           console.warn("Failed to delete old image (non-critical):", deleteError.message);
//         }
//       }

      
//       const contentType = processedData.icon_image_type || 'image/jpeg';
//       const uploadResult = await s3Service.uploadBrandBase64Image(
//         processedData.icon_image_base64,
//         existingSubcategory ? existingSubcategory.id : 'temp',
//         contentType
//       );
      
//       processedData.icon_image = uploadResult.url;
//       delete processedData.icon_image_base64;
//       delete processedData.icon_image_type;
//     }
    
//     return processedData;
//   } catch (error) {
//     console.error('Error handling image uploads:', error);
//     throw error;
//   }
// }








// }

// module.exports = Brand;















const pool = require('../config/database');
const path = require('path');
const s3Service = require(path.join(__dirname, '../config/awsS3.js'));

class Brand {
  // Create new brand with S3 upload
  static async create(brandData, createdBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== CREATE BRAND ===");
      console.log("Brand data:", {
        name: brandData.name,
        description: brandData.description,
        hasIconImage: !!(brandData.icon_image_file || brandData.icon_image_base64)
      });

      // Handle image uploads
      const processedData = await this.handleImageUploads(brandData);
      
      const query = `
        INSERT INTO brands (name, description, icon_image, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, icon_image, created_by, created_at
      `;

      const values = [
        processedData.name,
        processedData.description || null,
        processedData.icon_image || null,
        createdBy
      ];
      
      console.log("Inserting values:", values);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const brand = result.rows[0];
      console.log("Brand created successfully:", brand.id);
      console.log("=== END CREATE BRAND ===");
      
      return brand;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Brand creation error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all brands created by specific user
  static async findAll(createdBy) {
    const query = `
      SELECT id, name, description, icon_image, created_by, created_at, updated_at
      FROM brands
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [createdBy]);
      return result.rows;
    } catch (error) {
      console.error('Error getting brands:', error);
      throw error;
    }
  }

  // Get brand by ID
  static async findById(id) {
    const query = `
      SELECT id, name, description, icon_image, created_by, created_at, updated_at
      FROM brands
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting brand by ID:', error);
      throw error;
    }
  }

  // Update brand with S3 upload
  static async update(id, updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== UPDATE BRAND ===");
      console.log("Brand ID:", id);
      console.log("Update data keys:", Object.keys(updateData));
      
      // Get existing brand for image cleanup
      const existingQuery = 'SELECT * FROM brands WHERE id = $1';
      const existingResult = await client.query(existingQuery, [id]);
      
      if (existingResult.rows.length === 0) {
        throw new Error('Brand not found');
      }
      
      const existingBrand = existingResult.rows[0];
      
      // Handle image uploads
      const processedData = await this.handleImageUploads(updateData, existingBrand);
      
      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (processedData.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(processedData.name);
        paramIndex++;
      }
      
      if (processedData.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(processedData.description);
        paramIndex++;
      }
      
      if (processedData.icon_image !== undefined) {
        updates.push(`icon_image = $${paramIndex}`);
        values.push(processedData.icon_image);
        paramIndex++;
      }
      
      // If no fields to update, return existing brand
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return existingBrand;
      }
      
      // Add updated_at timestamp
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add ID for WHERE clause
      values.push(id);
      
      const query = `
        UPDATE brands 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, description, icon_image, created_by, created_at, updated_at
      `;
      
      console.log("Update query:", query);
      console.log("Update values:", values);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const updatedBrand = result.rows[0];
      console.log("Brand updated successfully");
      console.log("=== END UPDATE BRAND ===");
      
      return updatedBrand;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Brand update error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete brand with S3 cleanup
  static async delete(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== DELETE BRAND ===");
      console.log("Brand ID to delete:", id);
      
      // Get brand details for image cleanup
      const getQuery = 'SELECT * FROM brands WHERE id = $1';
      const getResult = await client.query(getQuery, [id]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Brand not found');
      }
      
      const brand = getResult.rows[0];
      
      // Delete image from S3 if exists
      if (brand.icon_image) {
        try {
          await s3Service.deleteFile(brand.icon_image);
          console.log("Deleted image from S3");
        } catch (deleteError) {
          console.warn("Failed to delete image from S3 (non-critical):", deleteError.message);
        }
      }
      
      // Delete brand from database
      const deleteQuery = 'DELETE FROM brands WHERE id = $1 RETURNING id, name';
      const result = await client.query(deleteQuery, [id]);
      
      await client.query('COMMIT');
      
      console.log("Brand deleted successfully");
      console.log("=== END DELETE BRAND ===");
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Brand deletion error:', error);
      throw error;
    } finally {
      client.release();
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
      console.error('Error checking brand name:', error);
      throw error;
    }
  }

  // Handle image uploads for brand
  static async handleImageUploads(brandData, existingBrand = null) {
    const processedData = { ...brandData };
    
    try {
      // Handle file upload from multer
      if (processedData.icon_image_file) {
        // Delete old image if exists
        if (existingBrand && existingBrand.icon_image) {
          try {
            await s3Service.deleteFile(existingBrand.icon_image);
            console.log("Deleted old brand image from S3");
          } catch (deleteError) {
            console.warn("Failed to delete old image (non-critical):", deleteError.message);
          }
        }
        
        const uploadResult = await s3Service.uploadBrandFile(
          processedData.icon_image_file,
          existingBrand ? existingBrand.id : 'temp'
        );
        
        processedData.icon_image = uploadResult.url;
        delete processedData.icon_image_file;
      }
      
      // Handle base64 image
      if (processedData.icon_image_base64) {
        // Delete old image if exists
        if (existingBrand && existingBrand.icon_image) {
          try {
            await s3Service.deleteFile(existingBrand.icon_image);
            console.log("Deleted old brand image from S3");
          } catch (deleteError) {
            console.warn("Failed to delete old image (non-critical):", deleteError.message);
          }
        }
        
        const contentType = processedData.icon_image_type || 'image/jpeg';
        const uploadResult = await s3Service.uploadBrandBase64Image(
          processedData.icon_image_base64,
          existingBrand ? existingBrand.id : 'temp',
          contentType
        );
        
        processedData.icon_image = uploadResult.url;
        delete processedData.icon_image_base64;
        delete processedData.icon_image_type;
      }
      
      return processedData;
    } catch (error) {
      console.error('Error handling brand image uploads:', error);
      throw error;
    }
  }

  // Get paginated brands (optional - for future use)
  static async findAllPaginated(createdBy, page = 1, limit = 10, search = '') {
    try {
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT id, name, description, icon_image, created_by, created_at, updated_at
        FROM brands
        WHERE created_by = $1
      `;
      
      let countQuery = `
        SELECT COUNT(*) 
        FROM brands
        WHERE created_by = $1
      `;
      
      const values = [createdBy];
      const countValues = [createdBy];
      let paramIndex = 2;

      // Search filter
      if (search) {
        query += ` AND name ILIKE $${paramIndex}`;
        countQuery += ` AND name ILIKE $${paramIndex}`;
        values.push(`%${search}%`);
        countValues.push(`%${search}%`);
        paramIndex++;
      }

      // Add pagination and sorting
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      // Execute both queries
      const [brandsResult, countResult] = await Promise.all([
        pool.query(query, values),
        pool.query(countQuery, countValues)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        brands: brandsResult.rows,
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
      console.error('Error getting paginated brands:', error);
      throw error;
    }
  }
}

module.exports = Brand;

 
