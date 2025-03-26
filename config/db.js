import pkg from "pg";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const { Pool } = pkg;

// Determine if we need SSL: use it in production or if the DB_HOST indicates a remote server
const isProduction = process.env.NODE_ENV === "production" || process.env.DB_HOST.includes("render.com");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ Database connection error:", err));

export default pool;
