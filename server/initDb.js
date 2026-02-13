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
    {
      table: 'asset_versions',
      sql: `
        CREATE TABLE IF NOT EXISTS asset_versions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
          version_number INTEGER NOT NULL DEFAULT 1,
          title VARCHAR(255),
          file_name VARCHAR(255),
          storage_key VARCHAR(500),
          status VARCHAR(50) DEFAULT 'draft',
          notes TEXT,
          uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
          parent_version_id UUID REFERENCES asset_versions(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_asset_ver_asset ON asset_versions(asset_id);
        CREATE INDEX IF NOT EXISTS idx_asset_ver_parent ON asset_versions(parent_version_id);
      `,
    },
    {
      table: 'entity_comments',
      sql: `
        CREATE TABLE IF NOT EXISTS entity_comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          mentions UUID[] DEFAULT '{}',
          timestamp_ref DECIMAL(10,2),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ecomments_entity ON entity_comments(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_ecomments_user ON entity_comments(user_id);
      `,
    },
    {
      table: 'media_files',
      sql: `
        CREATE TABLE IF NOT EXISTS media_files (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          owner_type VARCHAR(50) NOT NULL,
          owner_id UUID NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          size_bytes BIGINT NOT NULL,
          storage_key VARCHAR(500) NOT NULL,
          storage_provider VARCHAR(20) NOT NULL DEFAULT 'local',
          version INTEGER NOT NULL DEFAULT 1,
          checksum_sha256 VARCHAR(64),
          uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
          is_current BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_media_owner ON media_files(owner_type, owner_id);
        CREATE INDEX IF NOT EXISTS idx_media_uploader ON media_files(uploaded_by);
      `,
    },
    {
      table: 'calendar_events',
      sql: `
        CREATE TABLE IF NOT EXISTS calendar_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_type VARCHAR(50) NOT NULL DEFAULT 'meeting',
          start_at TIMESTAMPTZ NOT NULL,
          end_at TIMESTAMPTZ NOT NULL,
          timezone VARCHAR(50) DEFAULT 'UTC',
          status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
          owner_type VARCHAR(50),
          owner_id UUID,
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          created_by UUID NOT NULL REFERENCES users(id),
          updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_cal_dates ON calendar_events(start_at, end_at);
        CREATE INDEX IF NOT EXISTS idx_cal_assigned ON calendar_events(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_cal_owner ON calendar_events(owner_type, owner_id);
      `,
    },
    {
      table: 'notifications',
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL DEFAULT 'info',
          title VARCHAR(255) NOT NULL,
          body TEXT,
          link_url VARCHAR(500),
          is_read BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_notif_date ON notifications(created_at DESC);
      `,
    },
    {
      table: 'organizations',
      sql: `
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_org_memberships (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL DEFAULT 'member',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, org_id)
        );
        CREATE INDEX IF NOT EXISTS idx_org_member_user ON user_org_memberships(user_id);
        CREATE INDEX IF NOT EXISTS idx_org_member_org ON user_org_memberships(org_id);
      `,
    },
    {
      table: 'ledger_accounts',
      sql: `
        CREATE TABLE IF NOT EXISTS ledger_accounts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ledger_artist ON ledger_accounts(artist_id);
      `,
    },
    {
      table: 'ledger_transactions',
      sql: `
        CREATE TABLE IF NOT EXISTS ledger_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(14,2) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
          reference VARCHAR(255),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ltx_account ON ledger_transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_ltx_type ON ledger_transactions(type);
        CREATE INDEX IF NOT EXISTS idx_ltx_date ON ledger_transactions(transaction_date DESC);
      `,
    },
    {
      table: 'royalty_splits',
      sql: `
        CREATE TABLE IF NOT EXISTS royalty_splits (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL,
          party_name VARCHAR(255) NOT NULL,
          artist_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
          label_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
          producer_points DECIMAL(5,2) NOT NULL DEFAULT 0,
          engineer_points DECIMAL(5,2) NOT NULL DEFAULT 0,
          producer_paid_record_one BOOLEAN NOT NULL DEFAULT false,
          producer_post_recoup_only BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_splits_account ON royalty_splits(account_id);
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
