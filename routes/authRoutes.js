// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/user_model');
const pool = require('../config/database');
const { 
  authenticateToken, 
  authorizeRoles 
} = require('../middleware/authMiddleware');


const { generateRefreshToken } = require('../middleware/authMiddleware'); // Add this import



// Configure multer for file uploads (for form-data)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// =============== PUBLIC ROUTES ===============

// Public admin registration (no auth required)
router.post('/register/admin', upload.fields([
  { name: 'user_image', maxCount: 1 },
  { name: 'id_proof_images', maxCount: 5 } // Changed to support multiple files
]), async (req, res) => {
  try {
    console.log("Admin registration request received");
    
    let userData = req.body;
    
    // If data is sent as JSON string in form-data, parse it
    if (userData.data) {
      try {
        userData = JSON.parse(userData.data);
      } catch (e) {
        console.log("Could not parse as JSON, using as regular form-data");
      }
    }
    
    // Trim all string fields and convert role to lowercase
    const name = userData.name ? userData.name.trim() : '';
    const email = userData.email ? userData.email.trim() : '';
    const password = userData.password ? userData.password.trim() : '';
    const role = (userData.role ? userData.role.trim().toLowerCase() : 'superadmin');
    const branch_id = userData.branch_id ? userData.branch_id.toString().trim() : '';
    const personal_number = userData.personal_number ? userData.personal_number.trim() : '';
    const official_number = userData.official_number ? userData.official_number.trim() : '';
    const salary = userData.salary ? userData.salary.trim() : '';
    const id_document = userData.id_document ? userData.id_document.trim() : '';
    const date_of_birth = userData.date_of_birth ? userData.date_of_birth.trim() : '';
    const joining_date = userData.joining_date ? userData.joining_date.trim() : userData.join_date ? userData.join_date.trim() : '';
    
    // Status parsing
    let status = true;
    if (userData.status !== undefined) {
      if (typeof userData.status === 'boolean') {
        status = userData.status;
      } else if (typeof userData.status === 'string') {
        const statusStr = userData.status.trim().toLowerCase();
        status = statusStr === 'true' || statusStr === '1' || statusStr === 'yes' || statusStr === 'on';
      } else if (typeof userData.status === 'number') {
        status = userData.status === 1;
      } else {
        status = Boolean(userData.status);
      }
    }

    console.log("Processed admin registration data:", {
      name, email, role, status
    });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email, and password are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Role validation - only allow superadmin for public registration
    if (role !== 'superadmin') {
      return res.status(400).json({ 
        success: false,
        error: 'Public registration only allows superadmin role' 
      });
    }

    // Date validation
    if (date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date_of_birth)) {
        return res.status(400).json({ 
          success: false,
          error: 'Date of birth must be in YYYY-MM-DD format' 
        });
      }
    }

    if (joining_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(joining_date)) {
        return res.status(400).json({ 
          success: false,
          error: 'Joining date must be in YYYY-MM-DD format' 
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }

    // Prepare registration data
    const registrationData = {
      name,
      email,
      password,
      role,
      branch_id: null, // Admin/superadmin don't have branch_id
      personal_number: personal_number || null,
      official_number: official_number || null,
      salary: salary || null,
      id_document: id_document || null,
      date_of_birth: date_of_birth || null,
      join_date: joining_date || null,
      status
    };

    // Handle file uploads - UPDATED FOR MULTIPLE FILES
    if (req.files) {
      if (req.files['user_image']) {
        registrationData.user_image_file = {
          buffer: req.files['user_image'][0].buffer,
          mimetype: req.files['user_image'][0].mimetype,
          originalname: req.files['user_image'][0].originalname
        };
      }
      
      if (req.files['id_proof_images']) {
        registrationData.id_proof_images_files = req.files['id_proof_images'].map(file => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }));
      }
    }

    // For public admin registration, created_by should be null
    const createdById = null;

    // Create user
    const user = await User.create(registrationData, createdById);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        status: user.status,
        personal_number: user.personal_number,
        official_number: user.official_number,
        id_document: user.id_document,
        user_image: user.user_image,
        id_proof_images: user.id_proof_images,
        date_of_birth: user.date_of_birth,
        join_date: user.join_date,
        created_by: user.created_by,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error registering admin' 
    });
  }
});

// Register User with file upload support (requires auth)
router.post('/register', authenticateToken, upload.fields([
  { name: 'user_image', maxCount: 1 },
  { name: 'id_proof_images', maxCount: 5 } // Changed to support multiple files
]), async (req, res) => {
  try {
    console.log("Registration request received");
    console.log("User creating this registration:", req.user);

    let userData = req.body;
    
    // If data is sent as JSON string in form-data, parse it
    if (userData.data) {
      try {
        userData = JSON.parse(userData.data);
      } catch (e) {
        console.log("Could not parse as JSON, using as regular form-data");
      }
    }
    
    // Trim all string fields and convert role to lowercase
    const name = userData.name ? userData.name.trim() : '';
    const email = userData.email ? userData.email.trim() : '';
    const password = userData.password ? userData.password.trim() : '';
    const role = userData.role ? userData.role.trim().toLowerCase() : 'user';
    const branch_id = userData.branch_id ? userData.branch_id.toString().trim() : '';
    const personal_number = userData.personal_number ? userData.personal_number.trim() : '';
    const official_number = userData.official_number ? userData.official_number.trim() : '';
    const salary = userData.salary ? userData.salary.trim() : '';
    const id_document = userData.id_document ? userData.id_document.trim() : '';
    const date_of_birth = userData.date_of_birth ? userData.date_of_birth.trim() : '';
    const joining_date = userData.joining_date ? userData.joining_date.trim() : userData.join_date ? userData.join_date.trim() : '';
    
    // Status parsing
    let status = true;
    if (userData.status !== undefined) {
      if (typeof userData.status === 'boolean') {
        status = userData.status;
      } else if (typeof userData.status === 'string') {
        const statusStr = userData.status.trim().toLowerCase();
        status = statusStr === 'true' || statusStr === '1' || statusStr === 'yes' || statusStr === 'on';
      } else if (typeof userData.status === 'number') {
        status = userData.status === 1;
      } else {
        status = Boolean(userData.status);
      }
    }

    console.log("Processed registration data:", {
      name, email, role, branch_id, status,
      personal_number, official_number, salary, id_document,
      date_of_birth, joining_date
    });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email, and password are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Role validation
    const validRoles = ['user', 'admin', 'superadmin', 'manager', 'staff', 
                       'accountant', 'hr', 'technician', 'sales', 'accountanthead'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid role: "${role}". Allowed roles: ${validRoles.join(', ')}` 
      });
    }

    // Branch ID validation for non-admin roles
    const adminRoles = ['admin', 'superadmin'];
    if (!adminRoles.includes(role) && !branch_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Branch ID is required for non-admin/superadmin users' 
      });
    }

    // Date validation
    if (date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date_of_birth)) {
        return res.status(400).json({ 
          success: false,
          error: 'Date of birth must be in YYYY-MM-DD format' 
        });
      }
    }

    if (joining_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(joining_date)) {
        return res.status(400).json({ 
          success: false,
          error: 'Joining date must be in YYYY-MM-DD format' 
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }

    // Prepare registration data
    const registrationData = {
      name,
      email,
      password,
      role,
      branch_id: branch_id ? parseInt(branch_id) : null,
      personal_number: personal_number || null,
      official_number: official_number || null,
      salary: salary || null,
      id_document: id_document || null,
      date_of_birth: date_of_birth || null,
      join_date: joining_date || null,
      status
    };

    // Handle file uploads - UPDATED FOR MULTIPLE FILES
    if (req.files) {
      if (req.files['user_image']) {
        registrationData.user_image = {
          buffer: req.files['user_image'][0].buffer,
          mimetype: req.files['user_image'][0].mimetype,
          originalname: req.files['user_image'][0].originalname
        };
      }
      
      if (req.files['id_proof_images']) {
        registrationData.id_proof_images = req.files['id_proof_images'].map(file => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }));
      }
    }


    const createdById = req.user.userId;
    console.log("Creator ID:", createdById);

    // Create user
    const user = await User.create(registrationData, createdById);
    
    console.log("User created successfully:", user);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        status: user.status,
        personal_number: user.personal_number,
        official_number: user.official_number,
        id_document: user.id_document,
        user_image: user.user_image,
        id_proof_images: user.id_proof_images,
        date_of_birth: user.date_of_birth,
        join_date: user.join_date,
        created_by: user.created_by,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error registering user' 
    });
  }
});

// Login User (All roles)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid Email' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid Password' 
      });
    }

    // Check if user is active
    if (!user.status) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

   // TEMPORARY: Generate refresh token only if secret exists
    let refreshToken = null;
    if (process.env.JWT_REFRESH_SECRET) {
      refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role
      });
    } else {
      console.warn('⚠️ JWT_REFRESH_SECRET not defined, skipping refresh token generation');
      // Or generate a dummy token for testing
      // refreshToken = "refresh_token_not_configured";
    }



    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      refreshToken:refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        status: user.status,
        personal_number: user.personal_number,
        id_document: user.id_document,
        official_number: user.official_number,
        user_image: user.user_image,
        id_proof_images: user.id_proof_images,
        date_of_birth: user.date_of_birth,
        join_date: user.join_date,
        created_by: user.created_by,
        createdAt: user.created_at
      }
    });

  } catch (error) {

    
// More detailed error message
    if (error.message.includes('secretOrPrivateKey')) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: JWT_REFRESH_SECRET is missing',
        details: 'Please add JWT_REFRESH_SECRET to your .env file'
      });
    }


    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error logging in' 
    });
  }
});

// =============== USER PROFILE ROUTES ===============

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log("Fetching profile for user ID:", req.user.userId);
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching profile' 
    });
  }
});

// Update own profile with file upload support
router.put('/profile', authenticateToken, upload.fields([
  { name: 'user_image_file', maxCount: 1 },
  { name: 'id_proof_images', maxCount: 5 } // Changed to support multiple files
]), async (req, res) => {
  try {
    let updateData = req.body;
    
    // Parse JSON if needed
    if (typeof updateData === 'string' || updateData instanceof String) {
      try {
        updateData = JSON.parse(updateData);
      } catch (e) {
        // If not JSON, use as is
      }
    }

    if (!updateData.name) {
      return res.status(400).json({ 
        success: false,
        error: 'Name is required' 
      });
    }

    // Date validation
    if (updateData.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updateData.date_of_birth)) {
        return res.status(400).json({ 
          success: false,
          error: 'Date of birth must be in YYYY-MM-DD format' 
        });
      }
    }

    if (updateData.joining_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updateData.joining_date)) {
        return res.status(400).json({ 
          success: false,
          error: 'Joining date must be in YYYY-MM-DD format' 
        });
      }
    }

    // Prepare update data with files
    const profileData = { ...updateData };

    // Add file buffers if uploaded - UPDATED FOR MULTIPLE FILES
    if (req.files) {
      if (req.files['user_image_file']) {
        profileData.user_image_file = {
          buffer: req.files['user_image_file'][0].buffer,
          mimetype: req.files['user_image_file'][0].mimetype,
          originalname: req.files['user_image_file'][0].originalname
        };
      }
      
      if (req.files['id_proof_images']) {
        profileData.id_proof_images_files = req.files['id_proof_images'].map(file => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }));
      }
    }

    // Handle base64 files for user image
    if (updateData.user_image_base64) {
      profileData.user_image_file = {
        base64: updateData.user_image_base64,
        type: updateData.user_image_type || 'image/jpeg'
      };
    }

    // Handle base64 files for ID proof images
    if (updateData.id_proof_images_base64 && Array.isArray(updateData.id_proof_images_base64)) {
      profileData.id_proof_images_files = updateData.id_proof_images_base64.map((base64, index) => ({
        base64: base64,
        type: updateData.id_proof_images_type && updateData.id_proof_images_type[index] 
          ? updateData.id_proof_images_type[index] 
          : 'image/jpeg'
      }));
    }

    const result = await User.updateProfile(req.user.userId, profileData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error updating profile' 
    });
  }
});

// Change own password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'New password must be at least 6 characters long' 
      });
    }

    // Verify and change password
    const result = await User.changePassword(
      req.user.userId, 
      currentPassword, 
      newPassword
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error changing password' 
    });
  }
});

// =============== ADMIN-ONLY USER MANAGEMENT ROUTES ===============

// Get users created by specific admin
// router.get('/users/created-by-me', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       search = '',
//       role = '',
//       branch_id = '',
//       status = ''
//     } = req.query;

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const offset = (pageNum - 1) * limitNum;

//     // Build WHERE conditions
//     const whereConditions = ['u.created_by = $1'];
//     const values = [req.user.userId];
//     let paramCount = 2;

//     if (search) {
//       whereConditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
//       values.push(`%${search}%`);
//       paramCount++;
//     }

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

//     const whereClause = whereConditions.length > 0 
//       ? `WHERE ${whereConditions.join(' AND ')}`
//       : '';

//     // Count query
//     const countQuery = `
//       SELECT COUNT(*) as total_count 
//       FROM users u
//       ${whereClause}
//     `;
    
//     const countResult = await pool.query(countQuery, values);
//     const totalCount = parseInt(countResult.rows[0].total_count);
//     const totalPages = Math.ceil(totalCount / limitNum);

//     // Data query
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
//       ORDER BY u.created_at DESC
//       LIMIT $${paramCount} OFFSET $${paramCount + 1}
//     `;

//     const dataValues = [...values, limitNum, offset];
//     const result = await pool.query(dataQuery, dataValues);

//     // Parse id_proof_images for each user
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

//     res.json({
//       success: true,
//       message: 'Users created by you retrieved successfully',
//       data: usersWithParsedImages,
//       pagination: {
//         page: pageNum,
//         totalPages: totalPages,
//         limit: limitNum,
//         total: totalCount
//       }
//     });

//   } catch (error) {
//     console.error('Get users created by me error:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Error fetching users created by you' 
//     });
//   }
// });



// router.get('/users/created-by-me', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
//   try {
//     // Extract query parameters
//     const {
//       page = 1,
//       limit = 10,
//       search = '',
//       role = '',
//       branch_id = '',
//       status = '',
//       sort_by = 'created_at',
//       sort_order = 'desc',
//       include_stats = 'false',
    
//     } = req.query;

//     // Validate parameters
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
    
//     if (pageNum < 1) {
//       return res.status(400).json({
//         success: false,
//         error: 'Page must be greater than 0'
//       });
//     }

//     if (limitNum < 1 || limitNum > 100) {
//       return res.status(400).json({
//         success: false,
//         error: 'Limit must be between 1 and 100'
//       });
//     }

//     // Validate sort parameters
//     const validSortFields = ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at', 'join_date'];
//     const validSortOrders = ['asc', 'desc'];
    
//     if (!validSortFields.includes(sort_by)) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid sort field. Valid fields: ${validSortFields.join(', ')}`
//       });
//     }

//     if (!validSortOrders.includes(sort_order.toLowerCase())) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid sort order. Use "asc" or "desc"'
//       });
//     }

//     // Validate role if provided
//     if (role) {
//       const validRoles = ['user', 'admin', 'superadmin', 'manager', 'staff', 'accountant', 'hr', 'technician', 'sales', 'accountantHead'];
//       if (!validRoles.includes(role)) {
//         return res.status(400).json({
//           success: false,
//           error: `Invalid role. Valid roles: ${validRoles.join(', ')}`
//         });
//       }
//     }

//     // Validate status if provided
//     if (status !== '' && status !== 'true' && status !== 'false') {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid status. Use "true", "false", or empty string for all'
//       });
//     }

//     // Prepare options for User.findAll with created_by filter
//     const options = {
//       page: pageNum,
//       limit: limitNum,
//       search: search.trim(),
//       role: role.trim(),
//       branch_id: branch_id.trim(),
//       status: status.trim(),
//       sort_by: sort_by,
//       sort_order: sort_order.toLowerCase(),
//       created_by: req.user.userId // Add created_by filter
//     };

//     // Get paginated users created by the current user
//     const result = await User.findAll(options);

//     // Include statistics if requested (only for users created by me)
//     let statistics = null;
//     if (include_stats === 'true') {
//       const statsFilters = {
//         search: options.search,
//         role: options.role,
//         branch_id: options.branch_id,
//         status: options.status,
//         created_by: req.user.userId // Filter statistics by created_by
//       };
//       statistics = await User.getStatistics(statsFilters);
//     }

//     // Prepare response (same format as /users route)
//     const response = {
//       success: true,
//       message: 'Users created by you retrieved successfully',
//       data: result.data,
//       pagination: result.pagination
//     };

//     // Add statistics to response if requested
//     if (statistics) {
//       response.statistics = statistics;
//     }

//     res.json(response);

//   } catch (error) {
//     console.error('Get users created by me error:', error);
//     res.status(500).json({ 
//       success: false,
//       error: error.message || 'Error fetching users created by you' 
//     });
//   }
// });




router.get('/users/created-by-me', authenticateToken, async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      branch_id = '',
      status = '',
      sort_by = 'created_at',
      sort_order = 'desc',
      include_stats = 'false',
      include_branch = 'false'
    } = req.query;

    // Validate parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be greater than 0'
      });
    }

    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    // Validate sort parameters
    const validSortFields = ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at', 'join_date'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sort_by)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sort field. Valid fields: ${validSortFields.join(', ')}`
      });
    }

    if (!validSortOrders.includes(sort_order.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sort order. Use "asc" or "desc"'
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['user', 'admin', 'superadmin', 'manager', 'staff', 'accountant', 'hr', 'technician', 'sales', 'accountantHead'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Valid roles: ${validRoles.join(', ')}`
        });
      }
    }

    // Validate status if provided
    if (status !== '' && status !== 'true' && status !== 'false') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Use "true", "false", or empty string for all'
      });
    }

    // Prepare options for User.findAll with created_by filter
    const options = {
      page: pageNum,
      limit: limitNum,
      search: search.trim(),
      role: role.trim(),
      branch_id: branch_id.trim(),
      status: status.trim(),
      sort_by: sort_by,
      sort_order: sort_order.toLowerCase(),
      created_by: req.user.userId, // Filter by current user
      current_user_role: req.user.role, // Pass current user role
      current_user_id: req.user.userId, // Pass current user ID
      include_branch: include_branch === 'true' // Include branch info if requested
    };

    // Get paginated users created by the current user
    const result = await User.findAll(options);

    // Include statistics if requested (only for users created by me)
    let statistics = null;
    if (include_stats === 'true') {
      const statsFilters = {
        search: options.search,
        role: options.role,
        branch_id: options.branch_id,
        status: options.status,
        created_by: req.user.userId,
        current_user_role: req.user.role
      };
      statistics = await User.getStatistics(statsFilters);
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Users created by you retrieved successfully',
      data: result.data,
      pagination: result.pagination,
      current_user: {
        id: req.user.userId,
        role: req.user.role,
        name: req.user.name
      }
    };

    // Add statistics to response if requested
    if (statistics) {
      response.statistics = statistics;
    }

    res.json(response);

  } catch (error) {
    console.error('Get users created by me error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error fetching users created by you' 
    });
  }
});





// Get all users with pagination, search, and filters (Admin only)
router.get('/users', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      branch_id = '',
      status = '',
      sort_by = 'created_at',
      sort_order = 'desc',
      include_stats = 'false'
    } = req.query;

    // Validate parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be greater than 0'
      });
    }

    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    // Validate sort parameters
    const validSortFields = ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at', 'join_date'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sort_by)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sort field. Valid fields: ${validSortFields.join(', ')}`
      });
    }

    if (!validSortOrders.includes(sort_order.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sort order. Use "asc" or "desc"'
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['user', 'admin', 'superadmin', 'manager', 'staff', 'accountant', 'hr', 'technician', 'sales', 'accountantHead'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Valid roles: ${validRoles.join(', ')}`
        });
      }
    }

    // Validate status if provided
    if (status !== '' && status !== 'true' && status !== 'false') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Use "true", "false", or empty string for all'
      });
    }

    // Prepare options for User.findAll
    const options = {
      page: pageNum,
      limit: limitNum,
      search: search.trim(),
      role: role.trim(),
      branch_id: branch_id.trim(),
      status: status.trim(),
      sort_by: sort_by,
      sort_order: sort_order.toLowerCase()
    };

    // Get paginated users
    const result = await User.findAll(options);

    // Include statistics if requested
    let statistics = null;
    if (include_stats === 'true') {
      const statsFilters = {
        search: options.search,
        role: options.role,
        branch_id: options.branch_id,
        status: options.status
      };
      statistics = await User.getStatistics(statsFilters);
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Users retrieved successfully',
      data: result.data,
      pagination: result.pagination
    };

    // Add statistics to response if requested
    if (statistics) {
      response.statistics = statistics;
    }

    res.json(response);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error fetching users' 
    });
  }
});

// Get user statistics (Admin only)
router.get('/users/statistics', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
  try {
    // Extract query parameters for filtering statistics
    const {
      search = '',
      role = '',
      branch_id = '',
      status = ''
    } = req.query;

    // Prepare filters
    const filters = {
      search: search.trim(),
      role: role.trim(),
      branch_id: branch_id.trim(),
      status: status.trim()
    };

    // Get statistics
    const statistics = await User.getStatistics(filters);

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: statistics
    });

  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching user statistics' 
    });
  }
});

// Create user with file uploads (Admin only)
router.post('/users', authenticateToken, authorizeRoles('admin', 'superadmin'), upload.fields([
  { name: 'user_image_file', maxCount: 1 },
  { name: 'id_proof_images', maxCount: 5 } // Changed to support multiple files
]), async (req, res) => {
  try {
    let userData = req.body;
    
    // Parse JSON if needed
    if (typeof userData === 'string' || userData instanceof String) {
      try {
        userData = JSON.parse(userData);
      } catch (e) {
        // If not JSON, use as is
      }
    }

    const adminRoles = ['admin', 'superadmin'];

    // Basic validation
    if (!userData.name || !userData.email || !userData.password) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email, and password are required' 
      });
    }

    // Role validation
    const validRoles = ['user', 'admin', 'manager', 'staff', 'accountant', 'hr', 
                       'superadmin', 'accountantHead', 'technician', 'sales'];
    const role = userData.role || 'user';
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role specified' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Password validation
    if (userData.password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Date validation
    if (userData.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(userData.date_of_birth)) {
        return res.status(400).json({ 
          success: false,
          error: 'Date of birth must be in YYYY-MM-DD format' 
        });
      }
    }

    if (userData.joining_date || userData.join_date) {
      const joiningDate = userData.joining_date || userData.join_date;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(joiningDate)) {
        return res.status(400).json({ 
          success: false,
          error: 'Joining date must be in YYYY-MM-DD format' 
        });
      }
    }

    // Business logic validation
    if (!adminRoles.includes(role) && !userData.branch_id) {
      return res.status(400).json({ 
        success: false,
        error: 'branch_id is required for non-admin/superadmin users' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }

    // Prepare user data with files
    const createData = {
      ...userData,
      role,
      password: userData.password,
      date_of_birth: userData.date_of_birth || null,
      join_date: userData.joining_date || userData.join_date || null
    };

    // Add file buffers if uploaded - UPDATED FOR MULTIPLE FILES
    if (req.files) {
      if (req.files['user_image_file']) {
        createData.user_image_file = {
          buffer: req.files['user_image_file'][0].buffer,
          mimetype: req.files['user_image_file'][0].mimetype,
          originalname: req.files['user_image_file'][0].originalname
        };
      }
      
      if (req.files['id_proof_images']) {
        createData.id_proof_images_files = req.files['id_proof_images'].map(file => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }));
      }
    }

    // Handle base64 files for user image
    if (userData.user_image_base64) {
      createData.user_image_file = {
        base64: userData.user_image_base64,
        type: userData.user_image_type || 'image/jpeg'
      };
    }

    // Handle base64 files for ID proof images
    if (userData.id_proof_images_base64 && Array.isArray(userData.id_proof_images_base64)) {
      createData.id_proof_images_files = userData.id_proof_images_base64.map((base64, index) => ({
        base64: base64,
        type: userData.id_proof_images_type && userData.id_proof_images_type[index] 
          ? userData.id_proof_images_type[index] 
          : 'image/jpeg'
      }));
    }

    // Set branch_id to null for admin/superadmin
    if (adminRoles.includes(role)) {
      createData.branch_id = null;
    }

    // Determine created_by
    let createdById = req.user.userId;

    // Create user with created_by logic
    const user = await User.create(createData, createdById);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error creating user' 
    });
  }
});


// Update user with file uploads (Admin only)
// router.put('/users/:id', authenticateToken, authorizeRoles('admin', 'superadmin'), upload.fields([
//   { name: 'user_image', maxCount: 1 },
//   { name: 'id_proof_images', maxCount: 5 } // Changed to support multiple files
// ]), async (req, res) => {
//   try {
//     const { id } = req.params;
//     let userData = req.body;
    
//     // Parse JSON if needed
//     if (typeof userData === 'string' || userData instanceof String) {
//       try {
//         userData = JSON.parse(userData);
//       } catch (e) {
//         // If not JSON, use as is
//       }
//     }
    
//     const adminRoles = ['admin', 'superadmin'];
    
//     // Role validation
//     if (userData.role) {
//       const validRoles = ['user', 'admin', 'manager', 'staff', 'accountant', 'hr', 
//                          'superadmin', 'accountantHead', 'technician', 'sales'];
//       if (!validRoles.includes(userData.role)) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Invalid role specified' 
//         });
//       }
//     }

//     // Date validation
//     if (userData.date_of_birth) {
//       const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//       if (!dateRegex.test(userData.date_of_birth)) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Date of birth must be in YYYY-MM-DD format' 
//         });
//       }
//     }

//     if (userData.joining_date || userData.join_date) {
//       const joiningDate = userData.joining_date || userData.join_date;
//       const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//       if (!dateRegex.test(joiningDate)) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Joining date must be in YYYY-MM-DD format' 
//         });
//       }
//     }

//     // Prevent admin from changing their own role to non-admin
//     if (req.user.userId === parseInt(id) && userData.role && !adminRoles.includes(userData.role)) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Cannot change your own role to non-admin' 
//       });
//     }

//     // Prepare update data with files
//     const updateData = { ...userData };

//     // Add file buffers if uploaded - UPDATED FOR MULTIPLE FILES
//     if (req.files) {
//       if (req.files['user_image']) {
//         updateData.user_image_file = {
//           buffer: req.files['user_image'][0].buffer,
//           mimetype: req.files['user_image'][0].mimetype,
//           originalname: req.files['user_image'][0].originalname
//         };
//       }

//       if (req.files['id_proof_images']) {
//         updateData.id_proof_images_files = req.files['id_proof_images'].map(file => ({
//           buffer: file.buffer,
//           mimetype: file.mimetype,
//           originalname: file.originalname
//         }));
//       }
//     }

//     // Handle base64 files for user image
//     if (userData.user_image_base64) {
//       updateData.user_image_file = {
//         base64: userData.user_image_base64,
//         type: userData.user_image_type || 'image/jpeg'
//       };
//     }

//     // Handle base64 files for ID proof images
//     if (userData.id_proof_images_base64 && Array.isArray(userData.id_proof_images_base64)) {
//       updateData.id_proof_images = userData.id_proof_images_base64.map((base64, index) => ({
//         base64: base64,
//         type: userData.id_proof_images_type && userData.id_proof_images_type[index] 
//           ? userData.id_proof_images_type[index] 
//           : 'image/jpeg'
//       }));
//     }

//     const updatedUser = await User.update(id, updateData);
//     if (!updatedUser) {
//       return res.status(404).json({ 
//         success: false,
//         error: 'User not found' 
//       });
//     }

//     res.json({
//       success: true,
//       message: 'User updated successfully',
//       data: updatedUser
//     });
//   } catch (error) {
//     console.error('Update user error:', error);
//     res.status(500).json({ 
//       success: false,
//       error: error.message || 'Error updating user' 
//     });
//   }
// });


router.put('/users/:id', authenticateToken, authorizeRoles('admin', 'superadmin'), upload.fields([
  { name: 'user_image', maxCount: 1 },
  { name: 'id_proof_images', maxCount: 5 } // For new images
]), async (req, res) => {
  try {
    const { id } = req.params;
    let userData = req.body;
    
    console.log('=== USER UPDATE REQUEST ===');
    console.log('User ID:', id);
    console.log('Request body:', userData);
    console.log('Files uploaded:', req.files ? Object.keys(req.files) : 'None');
    
    // Parse JSON fields if needed
    try {
      if (userData.remove_id_proof_images) {
        if (typeof userData.remove_id_proof_images === 'string') {
          userData.remove_id_proof_images = JSON.parse(userData.remove_id_proof_images);
        }
        console.log('Images to remove:', userData.remove_id_proof_images.length);
      }
    } catch (parseError) {
      console.error('Error parsing remove_id_proof_images:', parseError);
      userData.remove_id_proof_images = [];
    }
    
    // Parse other JSON fields
    if (typeof userData === 'string' || userData instanceof String) {
      try {
        userData = JSON.parse(userData);
      } catch (e) {
        console.log('Body is not JSON, using as is');
      }
    }
    
    const adminRoles = ['admin', 'superadmin'];
    
    // Role validation
    if (userData.role) {
      const validRoles = ['user', 'admin', 'manager', 'staff', 'accountant', 'hr', 
                         'superadmin', 'accountantHead', 'technician', 'sales'];
      if (!validRoles.includes(userData.role)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid role specified' 
        });
      }
    }

    // Date validation
    if (userData.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(userData.date_of_birth)) {
        return res.status(400).json({ 
          success: false,
          error: 'Date of birth must be in YYYY-MM-DD format' 
        });
      }
    }

    if (userData.joining_date || userData.join_date) {
      const joiningDate = userData.joining_date || userData.join_date;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(joiningDate)) {
        return res.status(400).json({ 
          success: false,
          error: 'Joining date must be in YYYY-MM-DD format' 
        });
      }
    }

    // Prevent admin from changing their own role to non-admin
    if (req.user.userId === parseInt(id) && userData.role && !adminRoles.includes(userData.role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot change your own role to non-admin' 
      });
    }

    // Prepare update data with files
    const updateData = { ...userData };
    
    console.log('Preparing update data with:', {
      hasRemoveImages: !!updateData.remove_id_proof_images,
      removeCount: updateData.remove_id_proof_images?.length || 0
    });

    // Add file buffers if uploaded - UPDATED FOR MULTIPLE FILES
    if (req.files) {
      if (req.files['user_image']) {
        updateData.user_image_file = {
          buffer: req.files['user_image'][0].buffer,
          mimetype: req.files['user_image'][0].mimetype,
          originalname: req.files['user_image'][0].originalname
        };
        console.log('User image uploaded:', req.files['user_image'][0].originalname);
      }

      if (req.files['id_proof_images']) {
        // These are NEW images to be added
        updateData.new_id_proof_images = req.files['id_proof_images'].map(file => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }));
        console.log('New ID proof images count:', req.files['id_proof_images'].length);
      }
    }

    // Handle base64 files for user image
    if (userData.user_image_base64) {
      updateData.user_image_file = {
        base64: userData.user_image_base64,
        type: userData.user_image_type || 'image/jpeg'
      };
    }

    // Handle base64 files for ID proof images
    if (userData.id_proof_images_base64 && Array.isArray(userData.id_proof_images_base64)) {
      updateData.new_id_proof_images = userData.id_proof_images_base64.map((base64, index) => ({
        base64: base64,
        type: userData.id_proof_images_type && userData.id_proof_images_type[index] 
          ? userData.id_proof_images_type[index] 
          : 'image/jpeg'
      }));
    }

    console.log('Calling User.update with data:', {
      id: id,
      hasUserImage: !!updateData.user_image_file,
      hasNewIdProofImages: updateData.new_id_proof_images?.length || 0,
      hasRemovedImages: updateData.remove_id_proof_images?.length || 0,
      removeImages: updateData.remove_id_proof_images || []
    });

    const updatedUser = await User.update(id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    console.log('User updated successfully:', {
      id: updatedUser.id,
      name: updatedUser.name,
      userImage: updatedUser.user_image ? 'Yes' : 'No',
      idProofImagesCount: updatedUser.id_proof_images?.length || 0
    });
    console.log('=== END USER UPDATE ===');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error updating user' 
    });
  }
});


// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete your own account' 
      });
    }

    const result = await User.delete(id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting user' 
    });
  }
});

// =============== ADDITIONAL ROUTES FOR CREATED_BY FUNCTIONALITY ===============


// Get users without creator (admin/superadmin users)
router.get('/users/system-users', authenticateToken, authorizeRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total_count 
      FROM users 
      WHERE created_by IS NULL
    `;
    
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Data query - users without creator (system users)
    const dataQuery = `
      SELECT 
        id, name, email, role, branch_id, status,
        personal_number, official_number, 
        user_image, id_document, id_proof_images, salary, 
        date_of_birth, join_date,
        created_by, created_at, updated_at
      FROM users 
      WHERE created_by IS NULL
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(dataQuery, [limitNum, offset]);

    // Parse id_proof_images for each user
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

    res.json({
      success: true,
      message: 'System users retrieved successfully',
      data: usersWithParsedImages,
      pagination: {
        page: pageNum,
        totalPages: totalPages,
        limit: limitNum,
        total: totalCount
      }
    });

  } catch (error) {
    console.error('Get system users error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching system users' 
    });
  }
});

module.exports = router;


