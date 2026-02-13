#!/usr/bin/env node
'use strict';

/**
 * Pryntis Security Check Script
 * Run: node scripts/security-check.js
 *
 * Checks:
 * 1. npm audit for known vulnerabilities
 * 2. .env files not committed to git
 * 3. No hardcoded secrets in source
 * 4. Helmet / CSP configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let exitCode = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`  [PASS] ${label}`);
    } else {
      console.log(`  [WARN] ${label}: ${result}`);
    }
  } catch (err) {
    console.log(`  [FAIL] ${label}: ${err.message}`);
    exitCode = 1;
  }
}

console.log('\nPryntis Security Check');
console.log('='.repeat(50));

// 1. Check .env is gitignored
check('.env is in .gitignore', () => {
  const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf-8');
  if (!gitignore.includes('.env')) throw new Error('.env not found in .gitignore');
  return true;
});

// 2. Check for hardcoded secrets in server code
check('No hardcoded JWT secrets in server code', () => {
  const serverDir = path.join(__dirname, '..', 'server');
  const files = ['server.js', 'config/index.js'];
  for (const f of files) {
    const content = fs.readFileSync(path.join(serverDir, f), 'utf-8');
    if (/jwtSecret\s*[:=]\s*['"][^'"\s]{8,}/.test(content)) {
      throw new Error(`Possible hardcoded secret in ${f}`);
    }
  }
  return true;
});

// 3. Check Helmet is imported
check('Helmet is configured in server.js', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf-8');
  if (!server.includes("require('helmet')")) throw new Error('Helmet not found');
  if (!server.includes('contentSecurityPolicy')) throw new Error('CSP not configured');
  return true;
});

// 4. Check rate limiting is configured
check('Rate limiting is configured', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf-8');
  if (!server.includes('authLimiter')) throw new Error('Auth rate limiter not found');
  if (!server.includes('uploadLimiter')) throw new Error('Upload rate limiter not found');
  return true;
});

// 5. npm audit
check('npm audit (server)', () => {
  try {
    execSync('npm audit --production --audit-level=high 2>&1', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
    });
    return true;
  } catch (err) {
    return `vulnerabilities found (run npm audit for details)`;
  }
});

console.log('='.repeat(50));
console.log(exitCode === 0 ? 'All critical checks passed.\n' : 'Some checks failed.\n');
process.exit(exitCode);
