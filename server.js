// server.js


const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
// Update server.js to include branch routes
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoute');
const departmentRoutes = require('./routes/departmentRoute');
const brandRoutes = require('./routes/brandRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const stockRoutes = require('./routes/stockRoute');
const transactionRoutes = require('./routes/transactionRoutes');

const normalUserRoutes = require('./routes/normal_user_routes');


const { initializeDatabases } = require('./config/database');

const { createNormalUsersTable, testConnection } = require('./config/normal_users_db');





const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug environment variables
console.log('Environment Variables:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Configured' : 'Missing!');

// Check required env variables
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

// Import database config
const pool = require('./config/database');

// Database initialization function
const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Initializing database schema...');

    // First, check if users table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);

    if (!tableExists.rows[0].exists) {
      // Create users table with all columns
      console.log('📁 Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'manager', 'staff'))
        )
      `);
      console.log('✅ Users table created');
    } else {
      // Check if role column exists
      console.log('📊 Checking table structure...');
      const columns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
      `);

      const columnNames = columns.rows.map(row => row.column_name);

      // Add role column if it doesn't exist
      if (!columnNames.includes('role')) {
        console.log('➕ Adding role column to users table...');
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN role VARCHAR(20) DEFAULT 'user'
        `);

        // Add constraint separately
        await client.query(`
          ALTER TABLE users 
          ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'manager', 'staff'))
        `);
        console.log('✅ Role column added with constraints');
      }

      // Check if branches table exists
      const branchesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
      )
    `);

      if (!branchesTableExists.rows[0].exists) {
        // Create branches table
        console.log('📁 Creating branches table...');
        await client.query(`
        CREATE TABLE branches (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) UNIQUE NOT NULL,
          address TEXT DEFAULT '',
          city VARCHAR(100) DEFAULT '',
          state VARCHAR(100) DEFAULT '',
          country VARCHAR(100) DEFAULT 'USA',
          postal_code VARCHAR(20) DEFAULT '',
          phone VARCHAR(20) DEFAULT '',
          email VARCHAR(100) DEFAULT '',
          manager_id VARCHAR(100) DEFAULT '',
          latitude DECIMAL(10, 8) DEFAULT 0.0,
          longitude DECIMAL(11, 8) DEFAULT 0.0,
          opening_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'active',
          currency VARCHAR(10) DEFAULT 'USD',
          supported_payment_methods TEXT[] DEFAULT ARRAY['cash', 'card', 'upi'],
          operating_hours JSONB DEFAULT '{
            "monday": {"open": "09:00", "close": "21:00"},
            "tuesday": {"open": "09:00", "close": "21:00"},
            "wednesday": {"open": "09:00", "close": "21:00"},
            "thursday": {"open": "09:00", "close": "21:00"},
            "friday": {"open": "09:00", "close": "21:00"},
            "saturday": {"open": "10:00", "close": "20:00"},
            "sunday": {"open": "11:00", "close": "18:00"}
          }'::jsonb,
          departments JSONB DEFAULT '[]'::jsonb,
          settings JSONB DEFAULT '{}'::jsonb,
          created_by VARCHAR(100) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'maintenance', 'closed'))
        )
      `);
        console.log('✅ Branches table created');

        // Create indexes
        await client.query(`
        CREATE INDEX idx_branches_status ON branches(status);
        CREATE INDEX idx_branches_country ON branches(country);
        CREATE INDEX idx_branches_city ON branches(city);
        CREATE INDEX idx_branches_code ON branches(code);
      `);
        console.log('✅ Indexes created');
      }

      // Check if departments table exists
      const departmentsExists = await client.query(`
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'departments'
  )
`);

      if (!departmentsExists.rows[0].exists) {
        console.log('📁 Creating departments table...');
        await client.query(`
    CREATE TABLE departments (
      id SERIAL PRIMARY KEY,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      head_id VARCHAR(100) NOT NULL,
      staff_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      description TEXT,
      contact_email VARCHAR(100),
      contact_phone VARCHAR(20),
      location VARCHAR(255),
      budget DECIMAL(15, 2) DEFAULT 0.00,
      created_by VARCHAR(100) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT valid_staff_count CHECK (staff_count >= 0),
      CONSTRAINT valid_budget CHECK (budget >= 0)
    )
  `);
        console.log('✅ Departments table created');

        // Create indexes for departments table
        await client.query(`
    CREATE INDEX idx_departments_branch_id ON departments(branch_id);
    CREATE INDEX idx_departments_type ON departments(type);
    CREATE INDEX idx_departments_head_id ON departments(head_id);
    CREATE INDEX idx_departments_is_active ON departments(is_active);
  `);
        console.log('✅ Department indexes created');
      }

      await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_image VARCHAR(500),
        created_by INTEGER,  
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);



      // Create index for brands
      await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
    `);

      console.log('✅ Brands table created/verified');

      // Create Categories table
      await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

      // Create index for categories
      await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    `);

      console.log('✅ Categories table created/verified');

      // Create trigger function for updating updated_at timestamp
      await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

      // Create triggers for both tables
      await pool.query(`
      DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
      CREATE TRIGGER update_brands_updated_at
      BEFORE UPDATE ON brands
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

      await pool.query(`
      DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
      CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    }

    const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'suppliers'
            );
        `;

    const result = await pool.query(checkTableQuery);
    const tableExistss = result.rows[0].exists;

    if (!tableExistss) {
      console.log('Suppliers table does not exist. Creating table...');

      const createTableQuery = `
                CREATE TABLE suppliers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    address TEXT,
                    phone_number VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
                CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);
                
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';

                DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
                CREATE TRIGGER update_suppliers_updated_at
                    BEFORE UPDATE ON suppliers
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `;

      await pool.query(createTableQuery);
      console.log('✅ Suppliers table created successfully!');
      console.log("🔍 Checking if stocks table exists...");
    }

    // ALWAYS CHECK / CREATE STOCKS TABLE
    console.log("🔍 Checking if stocks table exists...");

    const stocksTableExists = await pool.query(`
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'stocks'
  );
`);

    if (!stocksTableExists.rows[0].exists) {
      console.log("📁 Creating stocks table...");

      await pool.query(`
    CREATE TABLE stocks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      brand_id INT REFERENCES brands(id) ON DELETE SET NULL,
      branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
      supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
      cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      dealer_price DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      shop_price DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
      quantity INT DEFAULT 0,
      low_stock_threshold INT DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'pcs',
      status VARCHAR(20) DEFAULT 'active',
      images TEXT[] DEFAULT '{}',
      specifications JSONB DEFAULT '{}'::jsonb,
     created_by INTEGER,  
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);


  

      await pool.query(`
    CREATE OR REPLACE FUNCTION update_stock_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  
    DROP TRIGGER IF EXISTS update_stocks_updated_at ON stocks;
    CREATE TRIGGER update_stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_updated_at();
  `);

      console.log("✅ Stocks table created!");
    } else {
      console.log("✔ Stocks table already exists");
    }

    console.log('🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('Error details:', error);
  } finally {
    client.release();
  }
};


// Initialize database before starting server
const startServer = async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    console.log('🔄 Initializing database...');
    
    const dbResult = await initializeDatabases();
    
    if (dbResult.success) {
      console.log('✅ Database initialized successfully');
    } else {
      console.warn('⚠️ Database initialization had issues, but continuing...');
    }

     const resultcreateNormalUsersTable = await createNormalUsersTable();
    if (resultcreateNormalUsersTable.success) {
      console.log('✅ Database initialized successfully');
    } else {
      console.warn('⚠️ Database initialization had issues, but continuing...');
    }



    // Routes
    app.use('/api/auth/admin', authRoutes);
    app.use('/api/branches', branchRoutes);
    app.use('/api/departments', departmentRoutes);
    app.use('/api/brands', brandRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/suppliers', supplierRoutes);
    app.use('/api/stocks', stockRoutes);
    app.use('/api/transactions/user', transactionRoutes);
    app.use('/api/normal-users', normalUserRoutes);


    // Health check endpoint
 app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        database: "connected", 
        timestamp: new Date().toISOString(),
        server: "AWS EC2",
        nodeVersion: process.version
    });
});





    // API Documentation
    app.get('/', (req, res) => {
      res.json({
        message: 'Dubai Mobiles Backend API',
        version: '1.0.0',
        endpoints: {
          auth: {
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            profile: 'GET /api/auth/profile',
            users: 'GET /api/auth/users (admin only)',
            updateRole: 'PATCH /api/auth/users/:id/role (admin only)',
            deleteUser: 'DELETE /api/auth/users/:id (admin only)',
            adminDashboard: 'GET /api/auth/admin-dashboard (admin/manager)'
          },
          health: 'GET /health'
        },
        note: 'For admin routes, include Authorization header: Bearer <token>'
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', err);

      // Multer file size error
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 5MB' });
      }

      // Multer file type error
      if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
