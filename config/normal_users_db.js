require('dotenv').config();
const { Pool } = require('pg');


// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
 
});

// Create normal_users table with all constraints and indexes
const createNormalUsersTable = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating normal_users table...');
    
    // 1. Create normal_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS normal_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        branch_id INTEGER,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign key to branches table (if exists)
        CONSTRAINT fk_normal_users_branch 
            FOREIGN KEY (branch_id) 
            REFERENCES branches(id) 
            ON DELETE SET NULL,
        
            

        -- Role validation
        CONSTRAINT chk_normal_users_role 
            CHECK (role IN ('user', 'accountant', 'technician',
            'salesPerson','hr','manager'
            , 'staff')),
        
        -- Status validation
        CONSTRAINT chk_normal_users_status 
            CHECK (status IN ('active', 'inactive', 'suspended', 'pending'))
      )
    `);
    console.log('✅ normal_users table created');
    
    // 2. Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_normal_users_email ON normal_users(email);
      CREATE INDEX IF NOT EXISTS idx_normal_users_branch_id ON normal_users(branch_id);
      CREATE INDEX IF NOT EXISTS idx_normal_users_role ON normal_users(role);
      CREATE INDEX IF NOT EXISTS idx_normal_users_status ON normal_users(status);
      CREATE INDEX IF NOT EXISTS idx_normal_users_created_at ON normal_users(created_at DESC);
    `);
    console.log('✅ Indexes created');
    
    // 3. Create trigger for auto-updating updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_normal_users_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_normal_users_updated_at ON normal_users;
      CREATE TRIGGER update_normal_users_updated_at
          BEFORE UPDATE ON normal_users
          FOR EACH ROW
          EXECUTE FUNCTION update_normal_users_updated_at();
    `);
    console.log('✅ Trigger created');
    
    // 4. Insert sample data (optional)
    try {
      const sampleDataCheck = await client.query(`
        SELECT COUNT(*) as count FROM normal_users WHERE email = 'test@example.com'
      `);
      
      // if (parseInt(sampleDataCheck.rows[0].count) === 0) {
      //   await client.query(`
      //     INSERT INTO normal_users (name, email, phone, role, status) 
      //     VALUES 
      //       ('John Doe', 'test@example.com', '+1234567890', 'user', 'active'),
      //       ('Jane Smith', 'jane@example.com', '+9876543210', 'admin', 'active'),
      //       ('Bob Wilson', 'bob@example.com', '+1122334455', 'staff', 'active')
      //   `);
      //   console.log('✅ Sample data inserted');
      // }
      
    } catch (sampleError) {
      console.log('⚠️  Sample data not inserted (already exists or error)');
    }
    
    console.log('🎉 normal_users table setup complete!');
    
    return { success: true, message: 'normal_users table created successfully' };
    
  } catch (error) {
    console.error('❌ Error creating normal_users table:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('relation "branches" does not exist')) {
      console.log('💡 Tip: branches table does not exist. Creating without foreign key...');
      
      // Try creating without foreign key constraint
      await client.query(`
        CREATE TABLE IF NOT EXISTS normal_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          branch_id INTEGER,
          role VARCHAR(50) DEFAULT 'user',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT chk_normal_users_role 
              CHECK (role IN ( 'user', 'accountant', 'technician',
            'salesPerson','hr','manager'
            , 'staff')),
          
          CONSTRAINT chk_normal_users_status 
              CHECK (status IN ('active', 'inactive', 'suspended', 'pending'))
        )
      `);
      
      console.log('✅ normal_users table created without foreign key');
      return { success: true, message: 'Table created without foreign key (branches table missing)' };
    }
    
    return { success: false, error: error.message };
    
  } finally {
    client.release();
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ Database connected:', result.rows[0].time);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Get normal_users statistics
const getNormalUsersStats = async () => {
  try {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM normal_users',
      by_role: 'SELECT role, COUNT(*) as count FROM normal_users GROUP BY role',
      by_status: 'SELECT status, COUNT(*) as count FROM normal_users GROUP BY status',
      active: 'SELECT COUNT(*) as count FROM normal_users WHERE status = \'active\''
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      results[key] = result.rows;
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Get normal_users stats error:', error);
    return { success: false, error: error.message };
  }
};

// Check if normal_users table exists
const tableExists = async () => {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'normal_users'
      )
    `);
    return result.rows[0].exists;
  } catch (error) {
    console.error('Table exists check error:', error);
    return false;
  }
};

// Get normal_users table schema
const getTableSchema = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'normal_users'
      ORDER BY ordinal_position
    `);
    return { success: true, schema: result.rows };
  } catch (error) {
    console.error('Get table schema error:', error);
    return { success: false, error: error.message };
  }
};

// Export everything
// module.exports = {
//   // Core database pool
//   pool,
//   query: (text, params) => pool.query(text, params),
  
//   // Normal users specific functions
//   createNormalUsersTable,
//   getNormalUsersStats,
//   tableExists,
//   getTableSchema,
//   testConnection
// };

module.exports =pool;
  // Core database pool
  

  
  // Normal users specific functions
 module.exports.createNormalUsersTable= createNormalUsersTable;
  module.exports.getNormalUsersStats = getNormalUsersStats;
  module.exports.tableExists = tableExists;
  module.exports.getTableSchema = getTableSchema;
 module.exports. testConnection = testConnection;