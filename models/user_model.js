// models/user_model.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const ADMIN_ROLES = ['admin', 'superadmin'];

class User {
  // Helper function to upload file to S3 with consistent folder structure
  static async uploadToS3(fileData, fileName, folder = 'users') {
    try {
      let fileBuffer, contentType;
      
      if (fileData.base64) {
        // Handle base64 file
        const base64Data = fileData.base64.replace(/^data:image\/\w+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
        contentType = fileData.type || 'image/jpeg';
      } else if (fileData.buffer) {
        // Handle buffer file
        fileBuffer = fileData.buffer;
        contentType = fileData.mimetype || 'application/octet-stream';
      } else {
        throw new Error('Invalid file format');
      }

      // Determine file extension
      let fileExtension = 'jpg';
      if (fileData.originalname) {
        const parts = fileData.originalname.split('.');
        if (parts.length > 1) {
          const ext = parts.pop().toLowerCase();
          const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
          if (validExtensions.includes(ext)) {
            fileExtension = ext;
          }
        }
      } else if (contentType) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          fileExtension = 'jpg';
        } else if (contentType.includes('png')) {
          fileExtension = 'png';
        } else if (contentType.includes('gif')) {
          fileExtension = 'gif';
        } else if (contentType.includes('webp')) {
          fileExtension = 'webp';
        }
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const randomId = uuidv4();
      const uniqueFileName = `${fileName}_${timestamp}_${randomId}.${fileExtension}`;
      const s3Key = `${folder}/${uniqueFileName}`;
      

      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        // ACL: 'public-read'
      };

      console.log(`Uploading file to S3: ${s3Key}`);
      const uploadResult = await s3.upload(params).promise();
      console.log(`File uploaded successfully: ${uploadResult.Location}`);
      return uploadResult.Location;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }



  // Handle multiple ID proof images with correct folder structure
  static async handleMultipleIdProofImages(idProofImageFiles) {
    if (!idProofImageFiles || !Array.isArray(idProofImageFiles) || idProofImageFiles.length === 0) {
      return [];
    }

    const uploadPromises = idProofImageFiles.map(async (file, index) => {
      try {
        const url = await this.uploadToS3(
          file,
          `id_proof_${index + 1}`,
          'users/id-proofs'
        );
        return url;
      } catch (error) {
        console.error(`Failed to upload ID proof image ${index + 1}:`, error);
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls.filter(url => url !== null);
  }

  // Extract file data from userData (fixing the key mismatch issue)
  static extractFileData(userData) {
    const extracted = {
      user_image_file: null,
      id_proof_images_files: []
    };

    // Check for user image files (different field names from different routes)
    if (userData.user_image_file) {
      extracted.user_image_file = userData.user_image_file;
    } else if (userData.user_image) {
      extracted.user_image_file = userData.user_image;
    }

    // Check for ID proof images files
    if (userData.id_proof_images_files && Array.isArray(userData.id_proof_images_files)) {
      extracted.id_proof_images_files = userData.id_proof_images_files;
    } else if (userData.id_proof_images && Array.isArray(userData.id_proof_images)) {
      extracted.id_proof_images_files = userData.id_proof_images;
    } else if (userData.id_proof_image) {
      extracted.id_proof_images_files = [userData.id_proof_image];
    }

    return extracted;
  }

  // Handle file uploads with consistent folder structure
  static async handleUserFileUploads(userData) {
    console.log("=== HANDLE USER FILE UPLOADS ===");
    console.log("Input userData keys:", Object.keys(userData));
    
    const uploadedFiles = {
      user_image: null,
      id_proof_images: []
    };

    try {
      // Extract file data from different field names
      const fileData = this.extractFileData(userData);
      
      // Handle user image - store in users/profiles folder
      if (fileData.user_image_file) {
        console.log("Processing user image");
        try {
          const userImageUrl = await this.uploadToS3(
            fileData.user_image_file,
            'user_image',
            'users/profiles'
          );
          uploadedFiles.user_image = userImageUrl;
          console.log("User image uploaded:", userImageUrl);
        } catch (error) {
          console.error('Failed to upload user image:', error);
          throw new Error('Failed to upload user image');
        }
      }

      // Handle ID proof images
      if (fileData.id_proof_images_files.length > 0) {
        console.log(`Processing ${fileData.id_proof_images_files.length} ID proof images`);
        try {
          const idProofUrls = await this.handleMultipleIdProofImages(fileData.id_proof_images_files);
          uploadedFiles.id_proof_images = idProofUrls;
          console.log("ID proof images uploaded:", idProofUrls);
        } catch (error) {
          console.error('Failed to upload ID proof images:', error);
          uploadedFiles.id_proof_images = [];
        }
      } else {
        console.log("No ID proof images to process");
      }
    } catch (error) {
      console.error('Error in handleUserFileUploads:', error);
      throw error;
    }

    // Clean up file data from userData
    delete userData.user_image_file;
    delete userData.user_image;
    delete userData.id_proof_images_files;
    delete userData.id_proof_images;
    delete userData.id_proof_image;
    
    console.log("Uploaded files result:", {
      user_image: uploadedFiles.user_image ? 'Uploaded' : 'No image',
      id_proof_images_count: uploadedFiles.id_proof_images.length
    });
    console.log("=== END HANDLE USER FILE UPLOADS ===");
    
    return {
      ...userData,
      user_image: uploadedFiles.user_image,
      id_proof_images: uploadedFiles.id_proof_images
    };
  }

  // Handle file updates (for existing users)
  // static async handleFileUpdates(userId, updateData, currentUser) {
  //   console.log("=== HANDLE FILE UPDATES ===");
  //   console.log("User ID:", userId);
  //   console.log("Current user has image:", currentUser.user_image ? 'Yes' : 'No');
  //   console.log("Current user ID proof images count:", currentUser.id_proof_images ? currentUser.id_proof_images.length : 0);
    
  //   const filesToDelete = [];
  //   const uploadResults = {
  //     user_image: currentUser.user_image,
  //     id_proof_images: currentUser.id_proof_images || []
  //   };

  //   try {
  //     // Extract file data from different field names
  //     const fileData = this.extractFileData(updateData);
      
  //     // Handle user image update
  //     if (fileData.user_image_file) {
  //       console.log("New user image provided, will replace old one");
        
  //       // Delete old user image if exists
  //       if (currentUser.user_image) {
  //         filesToDelete.push(this.deleteFromS3(currentUser.user_image));
  //       }
        
  //       // Upload new user image
  //       try {
  //         const userImageUrl = await this.uploadToS3(
  //           fileData.user_image_file,
  //           'user_image',
  //           'users/profiles'
  //         );
  //         uploadResults.user_image = userImageUrl;
  //         console.log("New user image uploaded:", userImageUrl);
  //       } catch (error) {
  //         console.error('Failed to upload new user image:', error);
  //         // Keep old image if new upload fails
  //         uploadResults.user_image = currentUser.user_image;
  //       }
  //     } else if (updateData.user_image === null || updateData.user_image === '') {
  //       // Explicitly removing user image
  //       console.log("Removing user image");
  //       if (currentUser.user_image) {
  //         filesToDelete.push(this.deleteFromS3(currentUser.user_image));
  //       }
  //       uploadResults.user_image = null;
  //     }
  //     // If user_image is set to a URL (not a file), keep it
  //     else if (updateData.user_image && updateData.user_image.startsWith('http')) {
  //       console.log("User image is a URL, keeping as is");
  //       uploadResults.user_image = updateData.user_image;
  //     }

  //     // Handle ID proof images update
  //     if (fileData.id_proof_images_files.length > 0) {
  //       console.log("New ID proof images provided");
        
  //       // Delete all old ID proof images
  //       if (currentUser.id_proof_images && Array.isArray(currentUser.id_proof_images)) {
  //         for (const url of currentUser.id_proof_images) {
  //           filesToDelete.push(this.deleteFromS3(url));
  //         }
  //       }
        
  //       // Upload new ID proof images
  //       try {
  //         const idProofUrls = await this.handleMultipleIdProofImages(fileData.id_proof_images_files);
  //         uploadResults.id_proof_images = idProofUrls;
  //         console.log("New ID proof images uploaded:", idProofUrls);
  //       } catch (error) {
  //         console.error('Failed to upload ID proof images:', error);
  //         uploadResults.id_proof_images = currentUser.id_proof_images || [];
  //       }
  //     } else if (updateData.id_proof_images === null || updateData.id_proof_images === '') {
  //       // Explicitly removing all ID proof images
  //       console.log("Removing all ID proof images");
  //       if (currentUser.id_proof_images && Array.isArray(currentUser.id_proof_images)) {
  //         for (const url of currentUser.id_proof_images) {
  //           filesToDelete.push(this.deleteFromS3(url));
  //         }
  //       }
  //       uploadResults.id_proof_images = [];
  //     }
  //     // If id_proof_images is set to an array of URLs, keep it
  //     else if (updateData.id_proof_images && Array.isArray(updateData.id_proof_images)) {
  //       console.log("ID proof images are URLs, keeping as is");
  //       uploadResults.id_proof_images = updateData.id_proof_images;
  //     }

  //     // Wait for file deletions to complete
  //     if (filesToDelete.length > 0) {
  //       await Promise.allSettled(filesToDelete);
  //       console.log(`Deleted ${filesToDelete.length} old files`);
  //     }

  //   } catch (error) {
  //     console.error('Error in handleFileUpdates:', error);
  //     throw error;
  //   }

  //   // Clean up file data from updateData
  //   delete updateData.user_image_file;
  //   delete updateData.user_image;
  //   delete updateData.id_proof_images_files;
  //   delete updateData.id_proof_images;
  //   delete updateData.id_proof_image;
    
  //   console.log("File update results:", {
  //     user_image: uploadResults.user_image ? 'Updated' : (uploadResults.user_image === null ? 'Removed' : 'Unchanged'),
  //     id_proof_images_count: uploadResults.id_proof_images.length
  //   });
  //   console.log("=== END HANDLE FILE UPDATES ===");
    
  //   return {
  //     ...updateData,
  //     user_image: uploadResults.user_image,
  //     id_proof_images: uploadResults.id_proof_images
  //   };
  // }


  // Create new user
  static async create(userData, createdById = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== CREATE USER ===");
      console.log("Input userData keys:", Object.keys(userData));


      
        if (createdById ==null) {
          const creatorQuery = 'SELECT role FROM users WHERE id = $1';
          const creatorResult = await client.query(creatorQuery, [createdById]);
          
          if (creatorResult.rows.length === 0 || creatorResult.rows[0].role !== 'superadmin') {
            throw new Error('Only superadmin can create admin users');
          }
        }
  




      
      // Handle file uploads if present
      const processedData = await this.handleUserFileUploads(userData);
      
      console.log("Processed data after file uploads:", {
        name: processedData.name,
        email: processedData.email,
        user_image: processedData.user_image ? 'Yes' : 'No',
        id_proof_images_count: processedData.id_proof_images.length
      });
      
      // Status handling
      let statusValue = true;
      if (processedData.hasOwnProperty('status')) {
        const status = processedData.status;
        if (status === true || status === 'true' || 
            status === 1 || status === '1' || 
            status === 'yes' || status === 'on') {
          statusValue = true;
        } else if (status === false || status === 'false' || 
                   status === 0 || status === '0' || 
                   status === 'no' || status === 'off') {
          statusValue = false;
        }
      }
      
      const hashedPassword = await bcrypt.hash(processedData.password, 10);
      
      // Use join_date if provided, otherwise current date
      const joinDate = processedData.join_date || new Date();
      const dateOfBirth = processedData.date_of_birth || null;
      
      // Check for superadmin permissions if creating admin/superadmin
      if (['admin', 'superadmin'].includes(processedData.role || 'user')) {
        if (createdById) {
          const creatorQuery = 'SELECT role FROM users WHERE id = $1';
          const creatorResult = await client.query(creatorQuery, [createdById]);
          
          if (creatorResult.rows.length === 0 || creatorResult.rows[0].role !== 'superadmin') {
            throw new Error('Only superadmin can create admin users');
          }
        }
      }
      
      const query = `
        INSERT INTO users (
          name, email, password, role,
          personal_number, official_number, branch_id, 
          user_image, id_document, id_proof_images, salary, 
          date_of_birth, join_date, status,
          created_by
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
        RETURNING 
          id, name, email, role, branch_id, status,
          personal_number, official_number, 
          user_image, id_document, id_proof_images, salary, 
          date_of_birth, join_date,
          created_by, created_at, updated_at
      `;
      
      const idProofImagesJson = processedData.id_proof_images && processedData.id_proof_images.length > 0 
        ? JSON.stringify(processedData.id_proof_images) 
        : '[]';
      
      const values = [
        processedData.name,
        processedData.email,
        hashedPassword,
        processedData.role || 'user',
        processedData.personal_number || null,
        processedData.official_number || null,
        processedData.branch_id || null,
        processedData.user_image || null,
        processedData.id_document || null,
        idProofImagesJson,
        processedData.salary || null,
        dateOfBirth,
        joinDate,
        statusValue,
        createdById
      ];
      
      console.log("Inserting values - id_proof_images:", idProofImagesJson);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      // Parse JSON for response
      const user = result.rows[0];
      
      // Parse id_proof_images from JSON
      if (user.id_proof_images) {
        try {
          if (typeof user.id_proof_images === 'string') {
            user.id_proof_images = user.id_proof_images.trim() === '' 
              ? [] 
              : JSON.parse(user.id_proof_images);
          }
        } catch (e) {
          console.error('Error parsing id_proof_images:', e);
          user.id_proof_images = [];
        }
      } else {
        user.id_proof_images = [];
      }
      
      console.log("Final user object - id_proof_images:", user.id_proof_images);
      console.log("=== END CREATE USER ===");
      
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('User creation error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const query = `
      SELECT 
        id, name, email, password, role, branch_id, status,
        personal_number, official_number, 
        user_image, id_document, id_proof_images, salary, 
        date_of_birth, join_date,
        created_by, created_at, updated_at
      FROM users WHERE email = $1
    `;
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [email]);
      const user = result.rows[0];
      if (user) {
        // Parse id_proof_images from JSON
        if (user.id_proof_images) {
          try {
            if (typeof user.id_proof_images === 'string') {
              user.id_proof_images = user.id_proof_images.trim() === '' 
                ? [] 
                : JSON.parse(user.id_proof_images);
            }
          } catch (e) {
            console.error('Error parsing id_proof_images in findByEmail:', e);
            user.id_proof_images = [];
          }
        } else {
          user.id_proof_images = [];
        }
      }
      return user;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  static async findById(id) {


    // const query = `
    //   SELECT 
    //     u.id, u.name, u.email, u.role, u.branch_id, u.status,
    //     u.personal_number, u.official_number, 
    //     u.user_image, u.id_document, u.id_proof_images, u.salary, 
    //     u.date_of_birth, u.join_date,
    //     u.created_by, u.created_at, u.updated_at,
    //     c.name as created_by_name, c.email as created_by_email, c.role as created_by_role
    //   FROM users u
    //   LEFT JOIN users c ON u.created_by = c.id
    //   WHERE u.id = $1
    // `;


  const query = `
    SELECT 
      u.id, u.name, u.email, u.role, u.branch_id, u.status,
      u.personal_number, u.official_number, 
      u.user_image, u.id_document, u.id_proof_images, u.salary, 
      u.date_of_birth, u.join_date,
      u.created_by, u.created_at, u.updated_at,
      c.name as created_by_name, c.email as created_by_email, c.role as created_by_role,
      b.name as branch_name  -- Added branch_name from branches table
    FROM users u
    LEFT JOIN users c ON u.created_by = c.id
    LEFT JOIN branches b ON u.branch_id = b.id  -- Added JOIN with branches table
    WHERE u.id = $1
  `;


  console.log("the user details get");
    
    const client = await pool.connect();
    try {
      const result = await client.query(query, [id]);
      const user = result.rows[0];
      if (user) {
        // Parse id_proof_images from JSON
        if (user.id_proof_images) {
          try {
            if (typeof user.id_proof_images === 'string') {
              user.id_proof_images = user.id_proof_images.trim() === '' 
                ? [] 
                : JSON.parse(user.id_proof_images);
            }
          } catch (e) {
            console.error('Error parsing id_proof_images in findById:', e);
            user.id_proof_images = [];
          }
        } else {
          user.id_proof_images = [];
        }
      }
      return user;
    } finally {
      client.release();
    }
  }

  // Get all users with creator information
  // static async findAll(options = {}) {
  //   const {
  //     page = 1,
  //     limit = 10,
  //     search = '',
  //     role = '',
  //     branch_id = '',
  //     status = '',
  //     sort_by = 'created_at',
  //     sort_order = 'desc',
  //       created_by = null
  //   } = options;
    
  //   const client = await pool.connect();
  //   try {
  //     console.log("=== FIND ALL USERS ===");
  //     console.log("Options:", options);
      
  //     // Build WHERE conditions
  //     const whereConditions = [];
  //     const values = [];
  //     let paramCount = 1;

  //     if (search) {
  //       whereConditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.personal_number ILIKE $${paramCount})`);
  //       values.push(`%${search}%`);
  //       paramCount++;
  //     }

  //      if (created_by !== null) {
  //     whereConditions.push(`u.created_by = $${paramCount}`);
  //     values.push(created_by);
  //     paramCount++;
  //   }

  //     if (role) {
  //       whereConditions.push(`u.role = $${paramCount}`);
  //       values.push(role);
  //       paramCount++;
  //     }

  //     if (branch_id) {
  //       whereConditions.push(`u.branch_id = $${paramCount}`);
  //       values.push(parseInt(branch_id));
  //       paramCount++;
  //     }

  //     if (status !== '') {
  //       whereConditions.push(`u.status = $${paramCount}`);
  //       values.push(status === 'true');
  //       paramCount++;
  //     }

  //     // Build WHERE clause
  //     const whereClause = whereConditions.length > 0 
  //       ? `WHERE ${whereConditions.join(' AND ')}`
  //       : '';

  //     // Count total records
  //     const countQuery = `
  //       SELECT COUNT(*) as total_count 
  //       FROM users u
  //       ${whereClause}
  //     `;
      
  //     const countResult = await client.query(countQuery, values);
  //     const totalCount = parseInt(countResult.rows[0].total_count);
  //     const totalPages = Math.ceil(totalCount / limit);
  //     const offset = (page - 1) * limit;

  //     // Validate sort_by to prevent SQL injection
  //     const validSortFields = ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at', 'join_date'];
  //     const sanitizedSortBy = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  //     const sanitizedSortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  //     // Get paginated data with sorting and creator information
  //     const dataQuery = `
  //       SELECT 
  //         u.id, u.name, u.email, u.role, u.branch_id, u.status,
  //         u.personal_number, u.official_number, 
  //         u.user_image, u.id_document, u.id_proof_images, u.salary, 
  //         u.date_of_birth, u.join_date,
  //         u.created_by, u.created_at, u.updated_at,
  //         c.name as created_by_name, c.email as created_by_email, c.role as created_by_role
  //       FROM users u
  //       LEFT JOIN users c ON u.created_by = c.id
  //       ${whereClause}
  //       ORDER BY u.${sanitizedSortBy} ${sanitizedSortOrder}
  //       LIMIT $${paramCount} OFFSET $${paramCount + 1}
  //     `;

  //     const dataValues = [...values, limit, offset];
  //     console.log("Executing query with values:", dataValues);
      
  //     const result = await client.query(dataQuery, dataValues);
  //     console.log(`Found ${result.rows.length} users`);

  //     // Parse JSON array for id_proof_images for each user
  //     const usersWithParsedImages = result.rows.map(user => {
  //       if (user.id_proof_images) {
  //         try {
  //           if (typeof user.id_proof_images === 'string') {
  //             user.id_proof_images = user.id_proof_images.trim() === '' 
  //               ? [] 
  //               : JSON.parse(user.id_proof_images);
  //           }
  //         } catch (e) {
  //           console.error('Error parsing id_proof_images:', e);
  //           user.id_proof_images = [];
  //         }
  //       } else {
  //         user.id_proof_images = [];
  //       }
  //       return user;
  //     });

  //     // Calculate if there are more pages
  //     const hasMore = page < totalPages;

  //     console.log("=== END FIND ALL USERS ===");
      
  //     return {
  //       data: usersWithParsedImages,
  //       pagination: {
  //         page: parseInt(page),
  //         totalPages: totalPages,
  //         limit: parseInt(limit),
  //         total: totalCount,
  //         hasMore: hasMore
  //       }
  //     };
  //   } catch (error) {
  //     console.error('Error in findAll:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }


  static async findAll(options = {}) {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    branch_id = '',
    status = '',
    sort_by = 'created_at',
    sort_order = 'desc',
    created_by = null,
    current_user_role = null, // Add current user role parameter
    current_user_id = null,   // Add current user id parameter
    include_branch = false    // Add option to include branch info
  } = options;
  
  const client = await pool.connect();
  try {
    console.log("=== FIND ALL USERS ===");
    console.log("Options:", options);
    
    // Build WHERE conditions
    const whereConditions = [];
    const values = [];
    let paramCount = 1;

    // Add search condition
    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.personal_number ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    // Handle created_by filter based on user role
    if (created_by !== null) {
      // If current user is admin/superadmin, they can see all users they created
      // If current user is non-admin, they can only see users they created AND users of specific roles
      const adminRoles = ['admin', 'superadmin'];
      
      if (current_user_role && adminRoles.includes(current_user_role)) {
        // Admin can see all users they created
        whereConditions.push(`u.created_by = $${paramCount}`);
        values.push(created_by);
        paramCount++;
      } else if (current_user_role) {
        // Non-admin users: they can see users they created, but with role restrictions
        // For example, manager can only see staff users they created
        // You can customize this logic based on your requirements
        
        // Option 1: Non-admin can see all users they created (same as admin)
        whereConditions.push(`u.created_by = $${paramCount}`);
        values.push(created_by);
        paramCount++;
        
        // Option 2: Add role restrictions for non-admin users
        // Example: Manager can only see 'staff' and 'user' roles they created
        // if (current_user_role === 'manager') {
        //   whereConditions.push(`u.role IN ($${paramCount}, $${paramCount + 1})`);
        //   values.push('staff', 'user');
        //   paramCount += 2;
        // }
      } else {
        // No role specified, just filter by created_by
        whereConditions.push(`u.created_by = $${paramCount}`);
        values.push(created_by);
        paramCount++;
      }
    }

    // Role filter
    if (role) {
      whereConditions.push(`u.role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    // Branch filter
    if (branch_id) {
      whereConditions.push(`u.branch_id = $${paramCount}`);
      values.push(parseInt(branch_id));
      paramCount++;
    }

    // Status filter
    if (status !== '') {
      whereConditions.push(`u.status = $${paramCount}`);
      values.push(status === 'true');
      paramCount++;
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total_count 
      FROM users u
      ${whereClause}
    `;
    
    console.log("Count query:", countQuery);
    console.log("Count values:", values);
    
    const countResult = await client.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Validate sort_by to prevent SQL injection
    const validSortFields = ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at', 'join_date'];
    const sanitizedSortBy = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sanitizedSortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Build SELECT fields
    let selectFields = `
      u.id, u.name, u.email, u.role, u.branch_id, u.status,
      u.personal_number, u.official_number, 
      u.user_image, u.id_document, u.id_proof_images, u.salary, 
      u.date_of_birth, u.join_date,
      u.created_by, u.created_at, u.updated_at,
      c.name as created_by_name, c.email as created_by_email, c.role as created_by_role
    `;
    
    let joins = `LEFT JOIN users c ON u.created_by = c.id`;
    
    // Include branch information if requested
    if (include_branch) {
      selectFields += `, b.name as branch_name, b.location as branch_location`;
      joins += ` LEFT JOIN branches b ON u.branch_id = b.id`;
    }

    // Get paginated data with sorting and creator information
    const dataQuery = `
      SELECT ${selectFields}
      FROM users u
      ${joins}
      ${whereClause}
      ORDER BY u.${sanitizedSortBy} ${sanitizedSortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const dataValues = [...values, limit, offset];
    console.log("Executing query with values:", dataValues);
    console.log("Data query:", dataQuery);
    
    const result = await client.query(dataQuery, dataValues);
    console.log(`Found ${result.rows.length} users`);

    // Parse JSON array for id_proof_images for each user
    const usersWithParsedImages = result.rows.map(user => {
      if (user.id_proof_images) {
        try {
          if (typeof user.id_proof_images === 'string') {
            user.id_proof_images = user.id_proof_images.trim() === '' 
              ? [] 
              : JSON.parse(user.id_proof_images);
          }
        } catch (e) {
          console.error('Error parsing id_proof_images:', e);
          user.id_proof_images = [];
        }
      } else {
        user.id_proof_images = [];
      }
      return user;
    });

    // Calculate if there are more pages
    const hasMore = page < totalPages;

    console.log("=== END FIND ALL USERS ===");
    
    return {
      data: usersWithParsedImages,
      pagination: {
        page: parseInt(page),
        totalPages: totalPages,
        limit: parseInt(limit),
        total: totalCount,
        hasMore: hasMore
      }
    };
  } catch (error) {
    console.error('Error in findAll:', error);
    throw error;
  } finally {
    client.release();
  }
}




  // Get user statistics
  static async getStatistics(filters = {}) {
    const client = await pool.connect();
    try {
      // Build WHERE conditions for statistics
      const whereConditions = [];
      const values = [];
      let paramCount = 1;

      if (filters.search) {
        whereConditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
        values.push(`%${filters.search}%`);
        paramCount++;
      }

      if (filters.role) {
        whereConditions.push(`role = $${paramCount}`);
        values.push(filters.role);
        paramCount++;
      }

      if (filters.branch_id) {
        whereConditions.push(`branch_id = $${paramCount}`);
        values.push(filters.branch_id);
        paramCount++;
      }

      if (filters.status !== undefined) {
        whereConditions.push(`status = $${paramCount}`);
        values.push(filters.status === 'true');
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = true THEN 1 END) as active_users,
          COUNT(CASE WHEN status = false THEN 1 END) as inactive_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN role = 'superadmin' THEN 1 END) as superadmin_count,
          COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
          COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff_count,
          COUNT(CASE WHEN role = 'accountant' THEN 1 END) as accountant_count,
          COUNT(CASE WHEN role = 'hr' THEN 1 END) as hr_count,
          COUNT(CASE WHEN role = 'technician' THEN 1 END) as technician_count,
          COUNT(CASE WHEN role = 'sales' THEN 1 END) as sales_count,
          COUNT(CASE WHEN role = 'accountantHead' THEN 1 END) as accountant_head_count,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count
        FROM users 
        ${whereClause}
      `;
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Update user
  static async update(userId, updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log("=== UPDATE USER IN MODEL ===");
      console.log("User ID:", userId);
      console.log("Update data received keys:", Object.keys(updateData));
      
      // Get current user data
      const currentUser = await this.findById(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Handle file uploads and updates
      const processedData = await this.handleFileUpdates(userId, updateData, currentUser);
      
      // Prepare update fields
      const fields = [];
      const values = [];
      let paramCount = 1;
      
      // Field mapping
      const fieldMapping = {
        name: 'name',
        email: 'email',
        role: 'role',
        branch_id: 'branch_id',
        status: 'status',
        personal_number: 'personal_number',
        official_number: 'official_number',
        id_document: 'id_document',
        salary: 'salary',
        date_of_birth: 'date_of_birth',
        join_date: 'join_date',
        user_image: 'user_image',
        id_proof_images: 'id_proof_images'
      };
      
      // Build dynamic update query
      for (const [key, dbField] of Object.entries(fieldMapping)) {
        if (processedData[key] !== undefined) {
          // Special handling for branch_id based on role
          if (key === 'branch_id') {
            const newRole = processedData.role || currentUser.role;
            if (!ADMIN_ROLES.includes(newRole)) {
              fields.push(`${dbField} = $${paramCount}`);
              values.push(processedData[key]);
              paramCount++;
            } else {
              fields.push(`${dbField} = NULL`);
            }
          } 
          // Handle role changes
          else if (key === 'role') {
            fields.push(`${dbField} = $${paramCount}`);
            values.push(processedData[key]);
            paramCount++;
            
            // If changing to admin/superadmin, set branch_id to null
            if (ADMIN_ROLES.includes(processedData[key])) {
              fields.push(`branch_id = NULL`);
            }
          } 
          // Handle ID proof images array
          else if (key === 'id_proof_images') {
            fields.push(`${dbField} = $${paramCount}`);
            const idProofJson = Array.isArray(processedData[key]) && processedData[key].length > 0 
              ? JSON.stringify(processedData[key]) 
              : '[]';
            values.push(idProofJson);
            paramCount++;
          } 
          // Handle all other fields
          else {
            fields.push(`${dbField} = $${paramCount}`);
            values.push(processedData[key]);
            paramCount++;
          }
        }
      }
      
      // Handle password update
      if (processedData.password) {
        const hashedPassword = await bcrypt.hash(processedData.password, 10);
        fields.push(`password = $${paramCount}`);
        values.push(hashedPassword);
        paramCount++;
      }
      
      // If no fields to update, return current user
      if (fields.length === 0) {
        await client.query('ROLLBACK');
        return currentUser;
      }
      
      // Add updated_at timestamp
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add user ID to values
      values.push(userId);
      
      // Build and execute the update query
      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, name, email, role, branch_id, status,
          personal_number, official_number, 
          user_image, id_document, id_proof_images, salary, 
          date_of_birth, join_date,
          created_by, created_at, updated_at
      `;
      
      console.log("Update query:", query);
      console.log("Update values:", values);
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('User update failed - no rows affected');
      }
      
      const updatedUser = result.rows[0];
      
      // Parse JSON fields
      try {
        if (updatedUser.id_proof_images) {
          if (typeof updatedUser.id_proof_images === 'string') {
            updatedUser.id_proof_images = updatedUser.id_proof_images.trim() === '' 
              ? [] 
              : JSON.parse(updatedUser.id_proof_images);
          }
        } else {
          updatedUser.id_proof_images = [];
        }
      } catch (parseError) {
        console.error('Error parsing id_proof_images:', parseError);
        updatedUser.id_proof_images = [];
      }
      
      // Add created_by info (join with users table)
      if (updatedUser.created_by) {
        try {
          const creatorResult = await client.query(
            'SELECT name, email, role FROM users WHERE id = $1',
            [updatedUser.created_by]
          );
          if (creatorResult.rows.length > 0) {
            updatedUser.created_by_name = creatorResult.rows[0].name;
            updatedUser.created_by_email = creatorResult.rows[0].email;
            updatedUser.created_by_role = creatorResult.rows[0].role;
          }
        } catch (e) {
          console.error('Error fetching creator info:', e);
        }
      }
      
      await client.query('COMMIT');
      
      console.log("User updated successfully:", {
        id: updatedUser.id,
        name: updatedUser.name,
        userImage: updatedUser.user_image ? 'Yes' : 'No',
        idProofImages: updatedUser.id_proof_images.length
      });
      console.log("=== END UPDATE USER IN MODEL ===");
      
      return updatedUser;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('User update error:', error);
      throw error;
      
    } finally {
      client.release();
    }
  }




static async update(userId, updateData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("=== UPDATE USER IN MODEL ===");
    console.log("User ID:", userId);
    console.log("Update data keys:", Object.keys(updateData));
    
    // Get current user data
    const currentUser = await this.findById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Handle file uploads and updates
    const processedData = await this.handleFileUpdates(userId, updateData, currentUser);
    
    // Prepare update fields
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    // Field mapping
    const fieldMapping = {
      name: 'name',
      email: 'email',
      role: 'role',
      branch_id: 'branch_id',
      status: 'status',
      personal_number: 'personal_number',
      official_number: 'official_number',
      id_document: 'id_document',
      salary: 'salary',
      date_of_birth: 'date_of_birth',
      join_date: 'join_date',
      user_image: 'user_image',
      id_proof_images: 'id_proof_images'
    };
    
    // Build dynamic update query
    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (processedData[key] !== undefined) {
        // Special handling for branch_id based on role
        if (key === 'branch_id') {
          const newRole = processedData.role || currentUser.role;
          if (!ADMIN_ROLES.includes(newRole)) {
            fields.push(`${dbField} = $${paramCount}`);
            values.push(processedData[key]);
            paramCount++;
          } else {
            fields.push(`${dbField} = NULL`);
          }
        } 
        // Handle role changes
        else if (key === 'role') {
          fields.push(`${dbField} = $${paramCount}`);
          values.push(processedData[key]);
          paramCount++;
          
          // If changing to admin/superadmin, set branch_id to null
          if (ADMIN_ROLES.includes(processedData[key])) {
            fields.push(`branch_id = NULL`);
          }
        } 
        // Handle ID proof images array - IMPORTANT UPDATE
        else if (key === 'id_proof_images') {
          fields.push(`${dbField} = $${paramCount}`);
          const idProofJson = Array.isArray(processedData[key]) && processedData[key].length > 0 
            ? JSON.stringify(processedData[key]) 
            : '[]';
          values.push(idProofJson);
          paramCount++;
        } 
        // Handle all other fields
        else {
          fields.push(`${dbField} = $${paramCount}`);
          values.push(processedData[key]);
          paramCount++;
        }
      }
    }
    
    // Handle password update
    if (processedData.password) {
      const hashedPassword = await bcrypt.hash(processedData.password, 10);
      fields.push(`password = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }
    
    // If no fields to update, return current user
    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return currentUser;
    }
    
    // Add updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add user ID to values
    values.push(userId);
    
    // Build and execute the update query
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, name, email, role, branch_id, status,
        personal_number, official_number, 
        user_image, id_document, id_proof_images, salary, 
        date_of_birth, join_date,
        created_by, created_at, updated_at
    `;
    
    console.log("Update query:", query);
    console.log("Update values:", values);
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('User update failed - no rows affected');
    }
    
    const updatedUser = result.rows[0];
    
    // Parse JSON fields
    try {
      if (updatedUser.id_proof_images) {
        if (typeof updatedUser.id_proof_images === 'string') {
          updatedUser.id_proof_images = updatedUser.id_proof_images.trim() === '' 
            ? [] 
            : JSON.parse(updatedUser.id_proof_images);
        }
      } else {
        updatedUser.id_proof_images = [];
      }
    } catch (parseError) {
      console.error('Error parsing id_proof_images:', parseError);
      updatedUser.id_proof_images = [];
    }
    
    // Add created_by info
    if (updatedUser.created_by) {
      try {
        const creatorResult = await client.query(
          'SELECT name, email, role FROM users WHERE id = $1',
          [updatedUser.created_by]
        );
        if (creatorResult.rows.length > 0) {
          updatedUser.created_by_name = creatorResult.rows[0].name;
          updatedUser.created_by_email = creatorResult.rows[0].email;
          updatedUser.created_by_role = creatorResult.rows[0].role;
        }
      } catch (e) {
        console.error('Error fetching creator info:', e);
      }
    }
    
    await client.query('COMMIT');
    
    console.log("User updated successfully:", {
      id: updatedUser.id,
      name: updatedUser.name,
      userImage: updatedUser.user_image ? 'Yes' : 'No',
      idProofImages: updatedUser.id_proof_images.length
    });
    console.log("=== END UPDATE USER IN MODEL ===");
    
    return updatedUser;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('User update error:', error);
    throw error;
    
  } finally {
    client.release();
  }
}


// UPDATED: handleFileUpdates method for add/remove functionality
static async handleFileUpdates(userId, updateData, currentUser) {
  const processedData = { ...updateData };
  
  // Handle user image
  if (processedData.user_image_file) {
    console.log("Processing user image file...");
    
    // Remove old image if exists
    if (currentUser.user_image) {
      try {
        await this.deleteFromS3(currentUser.user_image);
        console.log("Removed old user image");
      } catch (error) {
        console.error("Error removing old user image:", error);
      }
    }
    
    // Upload new image
    try {
      processedData.user_image = await this.uploadToS3(
        processedData.user_image_file,
        `profile_${userId}`,
        'users/profile'
      );
      console.log("Uploaded new user image:", processedData.user_image);
    } catch (error) {
      console.error("Error uploading user image:", error);
      throw new Error('Failed to upload user image');
    }
  } else if (processedData.remove_user_image) {
    // Remove user image if requested
    if (currentUser.user_image) {
      try {
        await this.deleteFromS3(currentUser.user_image);
        console.log("Removed user image by request");
      } catch (error) {
        console.error("Error removing user image:", error);
      }
    }
    processedData.user_image = null;
  }
  
  // Handle ID proof images - IMPORTANT UPDATE
  if (processedData.new_id_proof_images || processedData.remove_id_proof_images) {
    console.log("Processing ID proof images...");
    
    let existingImages = [];
    try {
      if (currentUser.id_proof_images && typeof currentUser.id_proof_images === 'string') {
        existingImages = currentUser.id_proof_images.trim() === '' 
          ? [] 
          : JSON.parse(currentUser.id_proof_images);
      } else if (Array.isArray(currentUser.id_proof_images)) {
        existingImages = currentUser.id_proof_images;
      }
    } catch (error) {
      console.error("Error parsing existing ID proof images:", error);
      existingImages = [];
    }
    
    console.log("Existing ID proof images:", existingImages.length);
    console.log("Images to remove:", processedData.remove_id_proof_images || []);
    
    // Remove specified images
    if (processedData.remove_id_proof_images && processedData.remove_id_proof_images.length > 0) {
      for (const imageUrl of processedData.remove_id_proof_images) {
        try {
          await this.deleteFromS3(imageUrl);
          console.log("Removed ID proof image:", imageUrl);
          
          // Remove from existing images array
          const index = existingImages.indexOf(imageUrl);
          if (index > -1) {
            existingImages.splice(index, 1);
          }
        } catch (error) {
          console.error("Error removing ID proof image:", error);
        }
      }
    }
    
    // Add new images
    if (processedData.new_id_proof_images && processedData.new_id_proof_images.length > 0) {
      console.log("Adding new ID proof images:", processedData.new_id_proof_images.length);
      
      const uploadPromises = processedData.new_id_proof_images.map(async (file, index) => {
        try {
          const url = await this.uploadToS3(
            file,
            `id_proof_${userId}_${Date.now()}_${index}`,
            'users/id-proofs'
          );
          console.log(`Uploaded new ID proof image ${index + 1}:`, url);
          return url;
        } catch (error) {
          console.error(`Failed to upload ID proof image ${index + 1}:`, error);
          return null;
        }
      });
      
      const newImageUrls = await Promise.all(uploadPromises);
      const validNewUrls = newImageUrls.filter(url => url !== null);
      
      // Add new URLs to existing images
      existingImages.push(...validNewUrls);
      
      console.log("Total ID proof images after update:", existingImages.length);
    }
    
    // Handle multi-part form data (from upload.fields middleware)
    if (processedData.id_proof_images_files && processedData.id_proof_images_files.length > 0) {
      console.log("Processing multi-part ID proof images:", processedData.id_proof_images_files.length);
      
      const uploadPromises = processedData.id_proof_images_files.map(async (file, index) => {
        try {
          const url = await this.uploadToS3(
            file,
            `id_proof_${userId}_${Date.now()}_${index}`,
            'users/id-proofs'
          );
          console.log(`Uploaded multi-part ID proof image ${index + 1}:`, url);
          return url;
        } catch (error) {
          console.error(`Failed to upload multi-part ID proof image ${index + 1}:`, error);
          return null;
        }
      });
      
      const newImageUrls = await Promise.all(uploadPromises);
      const validNewUrls = newImageUrls.filter(url => url !== null);
      
      // Replace all existing images with new ones (if multi-part upload)
      existingImages = validNewUrls;
    }
    
    // Handle base64 images
    if (processedData.id_proof_images_base64 && Array.isArray(processedData.id_proof_images_base64)) {
      console.log("Processing base64 ID proof images:", processedData.id_proof_images_base64.length);
      
      const uploadPromises = processedData.id_proof_images_base64.map(async (base64Data, index) => {
        try {
          const url = await this.uploadBase64ToS3(
            base64Data,
            `id_proof_${userId}_${Date.now()}_${index}`,
            'users/id-proofs'
          );
          console.log(`Uploaded base64 ID proof image ${index + 1}:`, url);
          return url;
        } catch (error) {
          console.error(`Failed to upload base64 ID proof image ${index + 1}:`, error);
          return null;
        }
      });
      
      const newImageUrls = await Promise.all(uploadPromises);
      const validNewUrls = newImageUrls.filter(url => url !== null);
      
      // Replace all existing images with new ones (if base64 upload)
      existingImages = validNewUrls;
    }
    
    // Set the final ID proof images array
    processedData.id_proof_images = existingImages;
    
    console.log("Final ID proof images count:", existingImages.length);
  }
  
  // Remove temporary file properties
  delete processedData.user_image_file;
  delete processedData.new_id_proof_images;
  delete processedData.remove_id_proof_images;
  delete processedData.id_proof_images_files;
  delete processedData.id_proof_images_base64;
  
  return processedData;
}

// Helper method to upload base64 to S3
static async uploadBase64ToS3(base64Data, filename, folder) {
  // Extract mime type and data from base64 string
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 string');
  }
  
  const mimeType = matches[1];
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, 'base64');
  
  // Determine file extension from mime type
  const extension = mimeType.split('/')[1] || 'jpg';
  const key = `${folder}/${filename}.${extension}`;
  
  // Upload to S3
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read'
  };
  
  await s3.upload(uploadParams).promise();
  
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Helper method to delete from S3
static async deleteFromS3(fileUrl) {
  try {
    if (!fileUrl) return;
    
    // Extract key from URL
    const urlParts = fileUrl.split('/');
    const key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
    
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    };
    
    await s3.deleteObject(deleteParams).promise();
    console.log("Successfully deleted from S3:", key);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
}



  // Update user profile (for self-update)
  static async updateProfile(userId, updateData) {
    return this.update(userId, updateData);
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    const client = await pool.connect();
    try {
      // First get current user
      const userQuery = 'SELECT password FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword, 
        userResult.rows[0].password
      );
      
      if (!isPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updateQuery = `
        UPDATE users 
        SET password = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING id, name, email
      `;
      
      const updateResult = await client.query(updateQuery, [hashedPassword, userId]);
      
      return {
        success: true,
        message: 'Password changed successfully',
        data: updateResult.rows[0]
      };
    } finally {
      client.release();
    }
  }


    // Delete file from S3
static async deleteFromS3(fileUrl) {
  try {
    if (!fileUrl || !fileUrl.includes('amazonaws.com')) {
      console.log('Invalid or non-S3 URL:', fileUrl);
      return;
    }

    // Extract bucket name and key from URL
    // URL format: https://dubaimobilespunchin.s3.amazonaws.com/users/profile/profile_36_...
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length < 2) {
      console.error('Invalid S3 URL format:', fileUrl);
      return;
    }

    // Get bucket name from the URL
    // https://dubaimobilespunchin.s3.amazonaws.com -> split by '.'
    const bucketDomain = urlParts[0].replace('https://', '');
    const bucketName = bucketDomain.split('.')[0]; // Should be 'dubaimobilespunchin'
    
    const key = urlParts[1];
    
    console.log(`Extracted from URL - Bucket: ${bucketName}, Key: ${key}`);

    const params = {
      Bucket: bucketName, // Use extracted bucket name
      Key: key
    };

    console.log('Deleting from S3 with params:', params);
    await s3.deleteObject(params).promise();
    console.log(`✅ File deleted from S3: ${key}`);
  } catch (error) {
    console.error('❌ S3 delete error:', error.message);
    console.error('Full error:', error);
  }
}
  // Delete user with file cleanup
 // Delete user with file cleanup
static async delete(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get user data before deletion
    const userQuery = 'SELECT user_image, id_proof_images FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'User not found' };
    }

    const user = userResult.rows[0];
    const filesToDelete = [];
    
    // Parse id_proof_images from JSON
    let idProofImages = [];
    if (user.id_proof_images) {
      try {
        if (typeof user.id_proof_images === 'string') {
          idProofImages = user.id_proof_images.trim() === '' 
            ? [] 
            : JSON.parse(user.id_proof_images);
        } else if (Array.isArray(user.id_proof_images)) {
          idProofImages = user.id_proof_images;
        }
      } catch (e) {
        console.log("Could not parse id_proof_images:", e);
      }
    }
    
    console.log('Files to delete from S3:');
    console.log('User image:', user.user_image);
    console.log('ID proof images:', idProofImages.length);
    
    // Delete files from S3 - using Promise.allSettled to continue even if some fail
    if (user.user_image) {
      filesToDelete.push(this.deleteFromS3(user.user_image));
    }
    
    // Delete all ID proof images
    if (Array.isArray(idProofImages) && idProofImages.length > 0) {
      for (const url of idProofImages) {
        filesToDelete.push(this.deleteFromS3(url));
      }
    }
    
    // Delete user from database
    const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role';
    const deleteResult = await client.query(deleteQuery, [userId]);
    
    // Wait for file deletions to complete (but don't fail if S3 deletion fails)
    if (filesToDelete.length > 0) {
      const results = await Promise.allSettled(filesToDelete);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`File deletion ${index + 1} failed:`, result.reason);
        }
      });
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ User ${userId} deleted successfully`);
    
    return {
      success: true,
      message: 'User deleted successfully',
      data: deleteResult.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Delete error:', error);
    return { 
      success: false, 
      error: 'Failed to delete user',
      details: error.message 
    };
  } finally {
    client.release();
  }
}

}

module.exports = User;

