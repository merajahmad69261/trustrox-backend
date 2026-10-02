const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbPool = null;
let sqliteDb = null;
let isSQLite = false;

// Promisified helpers for SQLite
function sqliteRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ insertId: this.lastID, affectedRows: this.changes });
    });
  });
}

function sqliteAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function sqliteGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function sqliteExec(sql) {
  return new Promise((resolve, reject) => {
    sqliteDb.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Connect to Database (MySQL with SQLite fallback)
async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  };
  const dbName = process.env.DB_NAME || 'trustrox_db';

  try {
    const rootConnection = await mysql.createConnection(dbConfig);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await rootConnection.end();

    dbPool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const conn = await dbPool.getConnection();
    conn.release();
    console.log(`[Database] Connected to MySQL database "${dbName}" successfully.`);
    isSQLite = false;
    await setupSchemaAndSeedMySQL();
  } catch (err) {
    console.warn(`[Database] MySQL connection failed (${err.message}). Falling back to embedded SQLite database...`);
    isSQLite = true;

    const dbPath = path.join(__dirname, '../../trustrox.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);

    console.log('[Database] Connected to SQLite database.');
    await setupSchemaAndSeedSQLite();
  }
}

async function setupSchemaAndSeedMySQL() {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      address VARCHAR(400) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user', 'owner') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_email (email),
      INDEX idx_users_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS stores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      address VARCHAR(400) NOT NULL,
      owner_id INT NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_stores_name (name),
      INDEX idx_stores_email (email),
      INDEX idx_stores_owner (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      store_id INT NOT NULL,
      rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_store (user_id, store_id),
      INDEX idx_ratings_store (store_id),
      INDEX idx_ratings_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const statements = schemaSQL.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await dbPool.query(stmt);
  }

  await seedDefaultAdminMySQL();
}

async function seedDefaultAdminMySQL() {
  const [rows] = await dbPool.query('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
  if (rows.length === 0) {
    const hashedPassword = await bcrypt.hash('Admin@1234!', 10);
    const adminName = 'System Administrator Account';
    const adminEmail = 'admin@trustrox.com';
    const adminAddress = '100 Enterprise Boulevard, Main Corporate Tower, Suite 500, Tech City';

    await dbPool.query(
      'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
      [adminName, adminEmail, adminAddress, hashedPassword, 'admin']
    );
    console.log('[Database Seed] Created default System Administrator (admin@trustrox.com / Admin@1234!).');
  }
}

async function setupSchemaAndSeedSQLite() {
  await sqliteExec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'owner')) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      owner_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE (user_id, store_id)
    );
  `);

  const existingAdmin = await sqliteGet('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@1234!', 10);
    const adminName = 'System Administrator Account';
    const adminEmail = 'admin@trustrox.com';
    const adminAddress = '100 Enterprise Boulevard, Main Corporate Tower, Suite 500, Tech City';

    await sqliteRun(
      'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
      [adminName, adminEmail, adminAddress, hashedPassword, 'admin']
    );
    console.log('[Database Seed] Created default System Administrator in SQLite (admin@trustrox.com / Admin@1234!).');
  }
}

// Universal query function returning array of rows for SELECT or result object for INSERT/UPDATE
async function query(sql, params = []) {
  if (!isSQLite) {
    const [rows] = await dbPool.query(sql, params);
    return rows;
  } else {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = await sqliteAll(sql, params);
      return rows;
    } else {
      const result = await sqliteRun(sql, params);
      return { insertId: result.insertId, affectedRows: result.affectedRows };
    }
  }
}

module.exports = {
  initDatabase,
  query,
  getIsSQLite: () => isSQLite,
};
