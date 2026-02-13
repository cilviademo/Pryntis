const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./config/db');

/**
 * Auto-initialize database on first startup.
 * - Creates schema if users table doesn't exist
 * - Seeds demo users if the users table is empty
 */
async function initDb() {
  try {
    // Check if the users table exists
    const { rows } = await db.query(
      "SELECT to_regclass('public.users') AS exists"
    );

    if (!rows[0].exists) {
      console.log('[initDb] No tables found — creating schema...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await db.query(schemaSql);
      console.log('[initDb] Schema created.');
    }

    // Check if any users exist
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(countRows[0].count, 10) === 0) {
      console.log('[initDb] No users found — seeding demo accounts...');

      const adminHash = await bcrypt.hash('admin123', 12);
      const managerHash = await bcrypt.hash('manager123', 12);
      const viewerHash = await bcrypt.hash('viewer123', 12);

      await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
          ('admin@pryntis.io',   $1, 'Marc',   'Miller-Nelson', 'admin'),
          ('manager@pryntis.io', $2, 'Taylor', 'Brooks',        'manager'),
          ('viewer@pryntis.io',  $3, 'Riley',  'Chen',          'viewer')`,
        [adminHash, managerHash, viewerHash]
      );
      console.log('[initDb] 3 demo users seeded.');
    }

    console.log('[initDb] Database ready.');
  } catch (err) {
    console.error('[initDb] Initialization failed:', err.message);
    throw err;
  }
}

module.exports = initDb;
