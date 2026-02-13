const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const seed = require('./seeds/run');

/**
 * Auto-initialize database on first startup.
 * - Creates schema if users table doesn't exist
 * - Runs full seed (users + artists + projects + everything) if empty
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
      console.log('[initDb] No data found — running full seed...');
      await seed();
      console.log('[initDb] Full seed complete.');
    }

    console.log('[initDb] Database ready.');
  } catch (err) {
    console.error('[initDb] Initialization failed:', err.message);
    throw err;
  }
}

module.exports = initDb;
