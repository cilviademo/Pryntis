const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const seed = require('./seeds/run');

/**
 * Auto-initialize database on first startup.
 * - Creates schema if users table doesn't exist
 * - Runs incremental table migrations for new tables
 * - Runs full seed if empty
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
    } else {
      // Ensure new tables exist (incremental migration)
      await ensureNewTables();
    }

    // Check if demo data is populated (artists is the main indicator)
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM artists');
    if (parseInt(countRows[0].count, 10) === 0) {
      console.log('[initDb] No demo data found — running full seed...');
      await seed();
      console.log('[initDb] Full seed complete.');
    }

    console.log('[initDb] Database ready.');
  } catch (err) {
    console.error('[initDb] Initialization failed:', err.message);
    throw err;
  }
}

/**
 * Create new tables if they don't already exist (incremental migration).
 */
async function ensureNewTables() {
  const migrations = [
    {
      table: 'activity_reactions',
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
            CREATE TYPE reaction_type AS ENUM ('thumbs_up', 'eyes', 'check', 'alert');
          END IF;
        END $$;
        CREATE TABLE IF NOT EXISTS activity_reactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reaction reaction_type NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(activity_id, user_id, reaction)
        );
        CREATE INDEX IF NOT EXISTS idx_reactions_activity ON activity_reactions(activity_id);
      `,
    },
    {
      table: 'activity_comments',
      sql: `
        CREATE TABLE IF NOT EXISTS activity_comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_comments_activity ON activity_comments(activity_id);
      `,
    },
    {
      table: 'audit_log',
      sql: `
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID,
          details JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at DESC);
      `,
    },
    {
      table: 'templates',
      sql: `
        CREATE TABLE IF NOT EXISTS templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          body TEXT NOT NULL,
          source_url VARCHAR(1000),
          last_verified_at TIMESTAMPTZ,
          verification_status VARCHAR(50) DEFAULT 'unverified',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
      `,
    },
  ];

  for (const m of migrations) {
    const { rows: check } = await db.query(
      "SELECT to_regclass($1) AS exists",
      [`public.${m.table}`]
    );
    if (!check[0].exists) {
      console.log(`[initDb] Creating table: ${m.table}`);
      await db.query(m.sql);
    }
  }

  // Expand user_role enum if new roles are missing
  const newRoles = ['owner', 'audio_engineer', 'contributor'];
  for (const role of newRoles) {
    const { rows: enumCheck } = await db.query(
      `SELECT 1 FROM pg_enum WHERE enumlabel = $1 AND enumtypid = 'user_role'::regtype`,
      [role]
    );
    if (enumCheck.length === 0) {
      console.log(`[initDb] Adding role to user_role enum: ${role}`);
      await db.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`);
    }
  }
}

module.exports = initDb;
