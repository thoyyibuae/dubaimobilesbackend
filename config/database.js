// const { Pool } = require('pg');
// require('dotenv').config();
// const fs = require('fs');
// const path = require('path');

// // Try multiple possible certificate paths with priority for config/certs
// const getCertificatePath = () => {
//   const possiblePaths = [
//     // 1. Primary: config/certs in current working directory (project root)
//     path.join(process.cwd(), 'config', 'certs', 'global-bundle.pem'),
    
//     // 2. If database.js is in config folder
//     path.join(__dirname, 'certs', 'global-bundle.pem'),
    
//     // 3. If database.js is outside config folder
//     path.join(__dirname, '..', 'config', 'certs', 'global-bundle.pem'),
//     path.join(__dirname, '..', '..', 'config', 'certs', 'global-bundle.pem'),
    
//     // 4. Just certs folder in project root
//     path.join(process.cwd(), 'certs', 'global-bundle.pem'),
    
//     // 5. Absolute paths for Windows
//     'F:\\dubai_mobiles\\backend\\dubaimobilesbackend\\config\\certs\\global-bundle.pem',
//     'C:\\Users\\HP\\test-deploy\\app\\config\\certs\\global-bundle.pem',
    
//     // 6. Production paths on Ubuntu server
//     '/home/ubuntu/app/config/certs/global-bundle.pem',
//     '/home/ubuntu/dubaimobilesbackend/config/certs/global-bundle.pem',
//     '/home/ubuntu/config/certs/global-bundle.pem'
//   ];
  
//   console.log('🔍 Looking for SSL certificate in common locations...');
  
//   for (const certPath of possiblePaths) {
//     try {
//       console.log(`  Checking: ${certPath}`);
//       if (fs.existsSync(certPath)) {
//         console.log(`✅ Certificate FOUND at: ${certPath}`);
//         const stats = fs.statSync(certPath);
//         console.log(`   File size: ${stats.size} bytes, Modified: ${stats.mtime}`);
//         return certPath;
//       }
//     } catch (err) {
//       // Silent fail, continue checking next path
//     }
//   }
  
//   console.log('❌ Certificate NOT FOUND in any location');
//   console.log('💡 Tip: Download it with:');
//   console.log('   Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -OutFile "config\\certs\\global-bundle.pem"');
//   return null;
// };

// // Get certificate path
// const certPath = getCertificatePath();

// // Database configuration with SSL handling
// let sslConfig;
// if (certPath) {
//   // Use certificate if found
//   sslConfig = {
//     rejectUnauthorized: true,
//     ca: fs.readFileSync(certPath).toString()
//   };
//   console.log('🔐 SSL enabled with certificate');
// } else if (process.env.DB_SSL === 'false' || process.env.NODE_ENV === 'development') {
//   // Disable SSL for development or if explicitly disabled
//   console.log('⚠️ Running without SSL (development mode)');
//   sslConfig = {
//     rejectUnauthorized: false
//   };
// } else {
//   // For production without certificate, you might want to throw an error
//   console.error('❌ SSL certificate required for production');
//   console.log('💡 Please download the certificate:');
//   console.log('   1. Create folder: mkdir -p config\\certs');
//   console.log('   2. Download: Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -OutFile "config\\certs\\global-bundle.pem"');
//   throw new Error('SSL certificate not found. Required for production database connection.');
// }

// // Create a single pool instance
// const pool = new Pool({
//   user: process.env.DB_USER || 'postgres',
//   host: process.env.DB_HOST || 'dubaimobiles.ctyq8mu2yjol.ap-southeast-2.rds.amazonaws.com',
//   database: process.env.DB_NAME || 'dubaimobiles',
//   password: process.env.DB_PASSWORD || 'Dubaimobiles',
//   port: process.env.DB_PORT || 5432,
//   ssl: sslConfig,
// });

// // Test connection
// pool.on('connect', () => {
//   console.log('✅ Database connected successfully');
// });

// pool.on('error', (err) => {
//   console.error('❌ Unexpected database error:', err);
// });

// // Function to create transaction table if not exists
// const createTransactionTable = async () => {
//   try {
//     console.log('🔄 Checking/Creating transactions table...');
    
//     // Check if transactions table exists
//     const checkTableQuery = `
//       SELECT EXISTS (
//         SELECT FROM information_schema.tables 
//         WHERE table_schema = 'public' 
//         AND table_name = 'transactions'
//       );
//     `;
    
//     const tableExists = await pool.query(checkTableQuery);
    
//     if (!tableExists.rows[0].exists) {
//       console.log('📦 Creating transactions table...');
      
//       // Create transaction_type enum
//       await pool.query(`
//         DO $$ 
//         BEGIN 
//           IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
//             CREATE TYPE transaction_type AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER');
//             RAISE NOTICE 'Created transaction_type enum';
//           END IF;
//         END $$;
//       `);
      
//       // Create transactions table
//       await pool.query(`
//         CREATE TABLE transactions (
//           id SERIAL PRIMARY KEY,
//           from_person VARCHAR(255) NOT NULL,
//           to_person VARCHAR(255) NOT NULL,
//           amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
//           purpose VARCHAR(500),
//           timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//           type transaction_type NOT NULL,
//           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
//           CONSTRAINT valid_transaction CHECK (
//             (type = 'TRANSFER' AND from_person != to_person) OR
//             (type IN ('CREDIT', 'DEBIT'))
//           )
//         );
//       `);
      
//       console.log('✅ Transactions table created successfully');
      
//       // Create indexes
//       await createTransactionIndexes();
      
//       // Create trigger for updated_at
//       await createUpdatedAtTrigger();
      
//       // Insert sample data if in development
//       if (process.env.NODE_ENV === 'development' && process.env.INSERT_SAMPLE_DATA === 'true') {
//         await insertSampleTransactionData();
//       }
//     } else {
//       console.log('✅ Transactions table already exists');
//     }
    
//     return true;
//   } catch (error) {
//     console.error('❌ Error creating transactions table:', error.message);
//     // Don't throw error - just log it and continue
//     return false;
//   }
// };

// // Create indexes for transactions table
// const createTransactionIndexes = async () => {
//   try {
//     const indexes = [
//       'CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)',
//       'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
//       'CREATE INDEX IF NOT EXISTS idx_transactions_from_person ON transactions(from_person)',
//       'CREATE INDEX IF NOT EXISTS idx_transactions_to_person ON transactions(to_person)',
//       'CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount)',
//       'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)'
//     ];
    
//     for (const indexQuery of indexes) {
//       await pool.query(indexQuery);
//     }
    
//     console.log('✅ Transaction indexes created successfully');
//   } catch (error) {
//     console.log('ℹ️ Index creation note:', error.message);
//   }
// };

// // Create trigger for updated_at column
// const createUpdatedAtTrigger = async () => {
//   try {
//     // Create function
//     await pool.query(`
//       CREATE OR REPLACE FUNCTION update_updated_at_column()
//       RETURNS TRIGGER AS $$
//       BEGIN
//         NEW.updated_at = CURRENT_TIMESTAMP;
//         RETURN NEW;
//       END;
//       $$ language 'plpgsql';
//     `);
    
//     // Create trigger
//     await pool.query(`
//       DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
//       CREATE TRIGGER update_transactions_updated_at
//         BEFORE UPDATE ON transactions
//         FOR EACH ROW
//         EXECUTE FUNCTION update_updated_at_column();
//     `);
    
//     console.log('✅ Updated_at trigger created successfully');
//   } catch (error) {
//     console.log('ℹ️ Trigger creation note:', error.message);
//   }
// };

// // Insert sample transaction data
// const insertSampleTransactionData = async () => {
//   try {
//     const sampleData = [
//       ['John Doe', 'Jane Smith', 1500.75, 'Monthly salary', 'CREDIT'],
//       ['Company Inc', 'John Doe', 500.00, 'Bonus payment', 'CREDIT'],
//       ['Jane Smith', 'Utility Co', 150.25, 'Electricity bill', 'DEBIT'],
//       ['John Doe', 'Rent Corp', 1200.00, 'Monthly rent', 'DEBIT'],
//       ['John Doe', 'Jane Smith', 300.50, 'Loan repayment', 'TRANSFER']
//     ];
    
//     for (const data of sampleData) {
//       await pool.query(
//         `INSERT INTO transactions (from_person, to_person, amount, purpose, type) 
//          VALUES ($1, $2, $3, $4, $5)`,
//         data
//       );
//     }
    
//     console.log('✅ Inserted 5 sample transactions');
//   } catch (error) {
//     console.log('ℹ️ Sample data insertion note:', error.message);
//   }
// };

// // Health check function
// const checkDatabaseHealth = async () => {
//   try {
//     const result = await pool.query('SELECT NOW() as current_time');
//     return {
//       healthy: true,
//       current_time: result.rows[0].current_time,
//       message: 'Database connection is healthy'
//     };
//   } catch (error) {
//     return {
//       healthy: false,
//       error: error.message,
//       message: 'Database connection failed'
//     };
//   }
// };

// // Initialize database (call this from server.js)
// const initializeDatabases = async () => {
//   try {
//     console.log('🚀 Initializing database connection...');
    
//     // Test connection first
//     const health = await checkDatabaseHealth();
    
//     if (!health.healthy) {
//       throw new Error(`Database connection failed: ${health.error}`);
//     }
    
//     console.log('✅ Database connection verified');
    
//     // Create transaction table
//     const tableCreated = await createTransactionTable();
    
//     if (!tableCreated) {
//       console.log('⚠️ Transaction table creation had issues, but continuing...');
//     }
    
//     return {
//       success: true,
//       message: 'Database initialized successfully',
//       health
//     };
//   } catch (error) {
//     console.error('❌ Database initialization failed:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: 'Database initialization failed'
//     };
//   }
// };

// // Test connection on startup
// (async () => {
//   try {
//     console.log('🔌 Testing initial database connection...');
//     const health = await checkDatabaseHealth();
//     if (health.healthy) {
//       console.log('✅ Initial database connection successful');
//     } else {
//       console.log('⚠️ Initial connection check:', health.message);
//     }
//   } catch (error) {
//     console.log('⚠️ Could not perform initial connection check:', error.message);
//   }
// })();

// module.exports = {
//   pool,
//   query: (text, params) => pool.query(text, params),
//   initializeDatabases,
//   checkDatabaseHealth,
//   createTransactionTable
// };



const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');


// Try multiple possible certificate paths with priority for config/certs
const getCertificatePath = () => {
  const possiblePaths = [
    // 1. Primary: config/certs in current working directory (project root)
    path.join(process.cwd(), 'config', 'certs', 'global-bundle.pem'),
    
    // 2. If database.js is in config folder
    path.join(__dirname, 'certs', 'global-bundle.pem'),
    
    // 3. If database.js is outside config folder
    path.join(__dirname, '..', 'config', 'certs', 'global-bundle.pem'),
    path.join(__dirname, '..', '..', 'config', 'certs', 'global-bundle.pem'),
    
    // 4. Just certs folder in project root
    path.join(process.cwd(), 'certs', 'global-bundle.pem'),
    
    // 5. Absolute paths for Windows
    'F:\\dubai_mobiles\\backend\\dubaimobilesbackend\\config\\certs\\global-bundle.pem',
    'C:\\Users\\HP\\test-deploy\\app\\config\\certs\\global-bundle.pem',
    
    // 6. Production paths on Ubuntu server
    '/home/ubuntu/app/config/certs/global-bundle.pem',
    '/home/ubuntu/dubaimobilesbackend/config/certs/global-bundle.pem',
    '/home/ubuntu/config/certs/global-bundle.pem'
  ];
  
  console.log('🔍 Looking for SSL certificate in common locations...');
  
  for (const certPath of possiblePaths) {
    try {
      console.log(`  Checking: ${certPath}`);
      if (fs.existsSync(certPath)) {
        console.log(`✅ Certificate FOUND at: ${certPath}`);
        const stats = fs.statSync(certPath);
        console.log(`   File size: ${stats.size} bytes, Modified: ${stats.mtime}`);
        return certPath;
      }
    } catch (err) {
      // Silent fail, continue checking next path
    }
  }
  
  console.log('❌ Certificate NOT FOUND in any location');
  console.log('💡 Tip: Download it with:');
  console.log('   Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -OutFile "config\\certs\\global-bundle.pem"');
  return null;
};


// Get certificate path
const certPath = getCertificatePath();


// Database configuration with SSL handling
let sslConfig;
if (certPath) {
  // Use certificate if found
  sslConfig = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(certPath).toString()
  };
  console.log('🔐 SSL enabled with certificate');
} else if (process.env.DB_SSL === 'false' || process.env.NODE_ENV === 'development') {
  // Disable SSL for development or if explicitly disabled
  console.log('⚠️ Running without SSL (development mode)');
  sslConfig = {
    rejectUnauthorized: false
  };
} else {
  // For production without certificate, you might want to throw an error
  console.error('❌ SSL certificate required for production');
  console.log('💡 Please download the certificate:');
  console.log('   1. Create folder: mkdir -p config\\certs');
  console.log('   2. Download: Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -OutFile "config\\certs\\global-bundle.pem"');
  throw new Error('SSL certificate not found. Required for production database connection.');
}


// Create a single pool instance
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'dubaimobiles.ctyq8mu2yjol.ap-southeast-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'dubaimobiles',
  password: process.env.DB_PASSWORD || 'Dubaimobiles',
  port: process.env.DB_PORT || 5432,
  ssl: sslConfig,
});


// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});


pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});


// Function to create transaction table if not exists
const createTransactionTable = async () => {
  try {
    console.log('🔄 Checking/Creating transactions table...');
    
    // Check if transactions table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions'
      );
    `;
    
    const tableExists = await pool.query(checkTableQuery);
    
    if (!tableExists.rows[0].exists) {
      console.log('📦 Creating transactions table...');
      
      // Create transaction_type enum
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
            CREATE TYPE transaction_type AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER');
            RAISE NOTICE 'Created transaction_type enum';
          END IF;
        END $$;
      `);
      
      // Create transactions table
      await pool.query(`
        CREATE TABLE transactions (
          id SERIAL PRIMARY KEY,
          from_person VARCHAR(255) NOT NULL,
          to_person VARCHAR(255) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
          purpose VARCHAR(500),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          type transaction_type NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT valid_transaction CHECK (
            (type = 'TRANSFER' AND from_person != to_person) OR
            (type IN ('CREDIT', 'DEBIT'))
          )
        );
      `);
      
      console.log('✅ Transactions table created successfully');
      
      // Create indexes
      await createTransactionIndexes();
      
      // Create trigger for updated_at
      await createUpdatedAtTrigger();
      
      // Insert sample data if in development
      if (process.env.NODE_ENV === 'development' && process.env.INSERT_SAMPLE_DATA === 'true') {
        await insertSampleTransactionData();
      }
    } else {
      console.log('✅ Transactions table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating transactions table:', error.message);
    // Don't throw error - just log it and continue
    return false;
  }
};


// Create indexes for transactions table
const createTransactionIndexes = async () => {
  try {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_from_person ON transactions(from_person)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_to_person ON transactions(to_person)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)'
    ];
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Transaction indexes created successfully');
  } catch (error) {
    console.log('ℹ️ Index creation note:', error.message);
  }
};


// Create trigger for updated_at column
const createUpdatedAtTrigger = async () => {
  try {
    // Create function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
      CREATE TRIGGER update_transactions_updated_at
        BEFORE UPDATE ON transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Updated_at trigger created successfully');
  } catch (error) {
    console.log('ℹ️ Trigger creation note:', error.message);
  }
};


// Insert sample transaction data
const insertSampleTransactionData = async () => {
  try {
    const sampleData = [
      ['John Doe', 'Jane Smith', 1500.75, 'Monthly salary', 'CREDIT'],
      ['Company Inc', 'John Doe', 500.00, 'Bonus payment', 'CREDIT'],
      ['Jane Smith', 'Utility Co', 150.25, 'Electricity bill', 'DEBIT'],
      ['John Doe', 'Rent Corp', 1200.00, 'Monthly rent', 'DEBIT'],
      ['John Doe', 'Jane Smith', 300.50, 'Loan repayment', 'TRANSFER']
    ];
    
    for (const data of sampleData) {
      await pool.query(
        `INSERT INTO transactions (from_person, to_person, amount, purpose, type) 
         VALUES ($1, $2, $3, $4, $5)`,
        data
      );
    }
    
    console.log('✅ Inserted 5 sample transactions');
  } catch (error) {
    console.log('ℹ️ Sample data insertion note:', error.message);
  }
};


// Health check function
const checkDatabaseHealth = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    return {
      healthy: true,
      current_time: result.rows[0].current_time,
      message: 'Database connection is healthy'
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      message: 'Database connection failed'
    };
  }
};


// Initialize database (call this from server.js)
const initializeDatabases = async () => {
  try {
    console.log('🚀 Initializing database connection...');
    
    // Test connection first
    const health = await checkDatabaseHealth();
    
    if (!health.healthy) {
      throw new Error(`Database connection failed: ${health.error}`);
    }
    
    console.log('✅ Database connection verified');
    
    // Create transaction table
    const tableCreated = await createTransactionTable();
    
    if (!tableCreated) {
      console.log('⚠️ Transaction table creation had issues, but continuing...');
    }
    
    return {
      success: true,
      message: 'Database initialized successfully',
      health
    };
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Database initialization failed'
    };
  }
};


// Test connection on startup
(async () => {
  try {
    console.log('🔌 Testing initial database connection...');
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log('✅ Initial database connection successful');
    } else {
      console.log('⚠️ Initial connection check:', health.message);
    }
  } catch (error) {
    console.log('⚠️ Could not perform initial connection check:', error.message);
  }
})();


// Export pool directly as default, attach helper functions
module.exports = pool;
// module.exports.query = (text, params) => pool.query(text, params);
module.exports.initializeDatabases = initializeDatabases;
module.exports.checkDatabaseHealth = checkDatabaseHealth;
module.exports.createTransactionTable = createTransactionTable;
