// import dotenv from "dotenv";


// import pkg from "pg";

const dotenv = require("dotenv"); 

const pkg= require("pg");

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  ssl: {
    rejectUnauthorized: false,
  },
  connectionString: process.env.DATABASE_URL,
  max: 75,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => console.log("✅ Connected to PostgreSQL"));
pool.on("acquire", () => console.log("📥 Client checked out from pool"));
pool.on("remove", () => console.log("❌ Client removed from pool"));
pool.on("error", (err) => {
  console.error("💥 Unexpected error on PostgreSQL client", err);
  process.exit(-1);
});

process.on("SIGINT", async () => {
  await pool.end();
  console.log("🔒 PostgreSQL pool has ended");
  process.exit(0);
});

export default pool;
