#!/usr/bin/env node

/**
 * Preflight checks for the Pryntis Panel project.
 *
 * Verifies that the environment is correctly configured before
 * starting the server. Run with:
 *   node scripts/preflight.js
 *   npm run preflight
 */

const path = require('path');
const fs = require('fs');

// Expected tables from the schema
const EXPECTED_TABLES = [
  'users',
  'artists',
  'projects',
  'project_collaborators',
  'subscription_tiers',
  'artist_subscriptions',
  'assets',
  'asset_tags',
  'placements',
  'ownership_records',
  'usage_records',
  'revenue_events',
  'recoupable_expenses',
  'tasks',
  'activity_feed',
  'contacts',
];

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  \x1b[32mPASS\x1b[0m  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  \x1b[31mFAIL\x1b[0m  ${label}`);
  if (detail) console.log(`        ${detail}`);
  failed++;
}

async function run() {
  console.log('\nPryntis Panel — Preflight Checks\n');

  // ── 1. .env file exists ────────────────────────────────────────
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    pass('.env file exists');
  } else {
    fail('.env file exists', `Expected at ${envPath}`);
  }

  // Load dotenv so the remaining checks can use process.env
  require('dotenv').config({ path: envPath });

  // ── 2. DATABASE_URL is set ─────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.length > 0) {
    pass('DATABASE_URL is set');
  } else {
    fail('DATABASE_URL is set', 'Set DATABASE_URL in your .env file');
    printSummary();
    return;
  }

  // ── 3. Can connect to PostgreSQL ───────────────────────────────
  let pool;
  try {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: dbUrl });
    const result = await pool.query('SELECT 1 AS ok');
    if (result.rows[0].ok === 1) {
      pass('PostgreSQL connection');
    } else {
      fail('PostgreSQL connection', 'Unexpected query result');
      printSummary();
      return;
    }
  } catch (err) {
    fail('PostgreSQL connection', err.message);
    printSummary();
    return;
  }

  // ── 4. Schema tables exist ─────────────────────────────────────
  try {
    const { rows } = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'`
    );
    const existing = new Set(rows.map((r) => r.table_name));

    for (const table of EXPECTED_TABLES) {
      if (existing.has(table)) {
        pass(`Table "${table}" exists`);
      } else {
        fail(`Table "${table}" exists`, 'Run: npm run db:schema');
      }
    }
  } catch (err) {
    fail('Schema table check', err.message);
  }

  // ── Clean up ───────────────────────────────────────────────────
  if (pool) {
    await pool.end();
  }

  printSummary();
}

function printSummary() {
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Preflight script crashed:', err);
  process.exit(1);
});
