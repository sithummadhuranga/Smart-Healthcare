#!/usr/bin/env node
/**
 * Production-grade lockfile validation script
 * 
 * Validates that all required lockfiles exist and are valid JSON
 * Used in CI/CD pipelines and local development
 * 
 * Exit codes:
 *   0 = all lockfiles valid
 *   1 = missing or invalid lockfiles
 */

const fs = require('fs');
const path = require('path');

const SERVICES = [
  'api-gateway',
  'auth-service',
  'patient-service',
  'doctor-service',
  'appointment-service',
  'telemedicine-service',
  'payment-service',
  'notification-service',
  'frontend', // React SPA
];

const REPO_ROOT = path.resolve(__dirname, '..');

console.log('🔍 Validating lockfiles...\n');

let hasErrors = false;
const results = [];

for (const service of SERVICES) {
  const lockfilePath = path.join(REPO_ROOT, service, 'package-lock.json');
  
  try {
    // Check file existence
    if (!fs.existsSync(lockfilePath)) {
      results.push({
        service,
        status: '❌ MISSING',
        path: lockfilePath,
      });
      hasErrors = true;
      continue;
    }

    // Verify file is readable and valid JSON
    const content = fs.readFileSync(lockfilePath, 'utf8');
    JSON.parse(content);

    // Verify file has reasonable size (corrupted lockfiles are often tiny)
    const stats = fs.statSync(lockfilePath);
    if (stats.size < 100) {
      results.push({
        service,
        status: '⚠️  INVALID SIZE',
        path: lockfilePath,
        size: `${stats.size} bytes`,
      });
      hasErrors = true;
      continue;
    }

    results.push({
      service,
      status: '✅ VALID',
      path: lockfilePath,
      size: `${(stats.size / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    results.push({
      service,
      status: '❌ ERROR',
      path: lockfilePath,
      error: error.message,
    });
    hasErrors = true;
  }
}

// Display results
console.table(results, ['service', 'status', 'size']);

if (hasErrors) {
  console.error('\n❌ VALIDATION FAILED');
  console.error('Missing or invalid lockfiles detected.\n');
  console.error('Resolution:');
  console.error('  1. Ensure all services are in the root directory');
  console.error('  2. Run: npm install (in each service directory)');
  console.error('  3. Commit package-lock.json files to git\n');
  process.exit(1);
}

console.log('\n✅ All lockfiles valid and ready for CI/CD\n');
process.exit(0);
