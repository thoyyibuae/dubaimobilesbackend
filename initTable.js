// initTables.js or add to server.js initialization
const pool = require('./config/database');

const initializeBranchTable = async () => {
  const client = await pool.connect();
  
  
  try {
    console.log('🔄 Initializing branches table...');
    
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📁 Creating branches table...');
      
      await client.query(`
        CREATE TABLE branches (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) UNIQUE NOT NULL,
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100) DEFAULT 'USA',
          postal_code VARCHAR(20),
          phone VARCHAR(20),
          email VARCHAR(100),
          manager_id VARCHAR(100),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          opening_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          currency VARCHAR(10) DEFAULT 'USD',
          supported_payment_methods TEXT[] DEFAULT '{"cash", "card", "upi"}',
          operating_hours JSONB DEFAULT '{
            "monday": {"open": "09:00", "close": "21:00"},
            "tuesday": {"open": "09:00", "close": "21:00"},
            "wednesday": {"open": "09:00", "close": "21:00"},
            "thursday": {"open": "09:00", "close": "21:00"},
            "friday": {"open": "09:00", "close": "21:00"},
            "saturday": {"open": "10:00", "close": "20:00"},
            "sunday": {"open": "11:00", "close": "18:00"}
          }',
          departments JSONB DEFAULT '[]',
          settings JSONB DEFAULT '{}',
          created_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'maintenance', 'closed')),
        )
      `);
      
      console.log('✅ Branches table created');
      
      // Create indexes for better performance
      await client.query(`
        CREATE INDEX idx_branches_status ON branches(status);
        CREATE INDEX idx_branches_country ON branches(country);
        CREATE INDEX idx_branches_city ON branches(city);
      `);
      
      console.log('✅ Indexes created');
    } else {
      console.log('✅ Branches table already exists');
    }
    
  } catch (error) {
    console.error('❌ Error initializing branches table:', error.message);
    console.error('Error details:', error);
  } finally {
    client.release();
  }
};

// Update your server.js initialization function to include this
const initializeDatabase = async () => {
  // ... existing user table initialization ...
  
  // Initialize branches table
  await initializeBranchTable();
};

module.exports = { initializeBranchTable };