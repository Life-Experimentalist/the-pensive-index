/**
 * Run Database Migrations on D1
 *
 * This script applies all SQL migrations to the Cloudflare D1 database.
 * It can run against local D1 (default) or remote D1 (with --remote flag).
 *
 * Usage:
 *   npm run db:migrate:d1          # Apply to local D1
 *   npm run db:migrate:d1 --remote # Apply to production D1
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(process.cwd(), 'migrations');
const isRemote = process.argv.includes('--remote');

console.log(
  `\n🔄 Running D1 migrations (${isRemote ? 'REMOTE' : 'LOCAL'})...\n`
);

// Get all migration files sorted by name
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('❌ No migration files found in migrations/');
  process.exit(1);
}

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  console.log(`📋 Running ${file}...`);

  try {
    const remoteFlag = isRemote ? '--remote' : '';
    const command = `wrangler d1 execute pensive-index ${remoteFlag} --file="${filePath}"`;

    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    successCount++;
    console.log(`✅ ${file} completed\n`);
  } catch (error: any) {
    // Check if error is due to already existing column/table
    const errorMessage = error.message || '';
    if (
      errorMessage.includes('duplicate column') ||
      errorMessage.includes('already exists')
    ) {
      skipCount++;
      console.log(`⚠️  ${file} already applied, skipping...\n`);
    } else {
      errorCount++;
      console.error(`❌ ${file} failed:`, error.message, '\n');
    }
  }
}

console.log('\n' + '='.repeat(50));
console.log('📊 Migration Summary:');
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ⚠️  Skipped: ${skipCount}`);
console.log(`   ❌ Failed: ${errorCount}`);
console.log('='.repeat(50) + '\n');

if (errorCount > 0) {
  console.log('⚠️  Some migrations failed. Please review the errors above.\n');
  process.exit(1);
} else {
  console.log('🎉 All migrations completed successfully!\n');
}
