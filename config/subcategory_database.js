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





const { Pool } = require('pg');

const sslConfig = {
  rejectUnauthorized: false
};

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'dubaimobiles.ctyq8mu2yjol.ap-southeast-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'dubaimobiles',
  password: process.env.DB_PASSWORD || 'Dubaimobiles',
  port: process.env.DB_PORT || 5432,
  ssl: sslConfig,
});


pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Function to create subcategories table
const createSubcategoriesTable = async () => {
  try {
    console.log('🔄 Checking/Creating subcategories table...');
    
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subcategories'
      );
    `;
    
    const tableExists = await pool.query(checkTableQuery);
    
    if (!tableExists.rows[0].exists) {
      console.log('📦 Creating subcategories table...');
      
      await pool.query(`
        CREATE TABLE subcategories (
          id SERIAL PRIMARY KEY,
          maincategoryId INTEGER NOT NULL,
          subName VARCHAR(255) NOT NULL,
          icon_image VARCHAR(500),
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (maincategoryId) REFERENCES categories(id) ON DELETE CASCADE
        );
      `);
      
      console.log('✅ Subcategories table created successfully');
      
      await createSubcategoriesIndexes();
      await createSubcategoriesUpdatedAtTrigger();
      
      console.log('✅ Subcategories table setup completed');
    } else {
      console.log('✅ Subcategories table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating subcategories table:', error.message);
    return false;
  }
};

const createSubcategoriesIndexes = async () => {
  try {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_subcategories_maincategoryId ON subcategories(maincategoryId)',
      'CREATE INDEX IF NOT EXISTS idx_subcategories_subName ON subcategories(subName)',
      'CREATE INDEX IF NOT EXISTS idx_subcategories_created_at ON subcategories(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_subcategories_created_by ON subcategories(created_by)'
    ];
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Subcategories indexes created successfully');
  } catch (error) {
    console.log('ℹ️ Subcategories index creation note:', error.message);
  }
};

const createSubcategoriesUpdatedAtTrigger = async () => {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_subcategories_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_subcategories_updated_at ON subcategories;
      CREATE TRIGGER update_subcategories_updated_at
        BEFORE UPDATE ON subcategories
        FOR EACH ROW
        EXECUTE FUNCTION update_subcategories_updated_at_column();
    `);
    
    console.log('✅ Subcategories updated_at trigger created successfully');
  } catch (error) {
    console.log('ℹ️ Subcategories trigger creation note:', error.message);
  }
};

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

const initializeSubCategoryDatabases = async () => {
  try {
    console.log('🚀 Initializing database connection...');
    
    const health = await checkDatabaseHealth();
    
    if (!health.healthy) {
      throw new Error(`Database connection failed: ${health.error}`);
    }
    
    console.log('✅ Database connection verified');
    
    const subcategoriesCreated = await createSubcategoriesTable();
    
    if (!subcategoriesCreated) {
      console.log('⚠️ Subcategories table creation had issues, but continuing...');
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


module.exports = {
  pool,
  initializeSubCategoryDatabases,
  checkDatabaseHealth
};