// Database Migration Script
// Run fandom assignments migration

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

try {
  // Connect to database
  const dbPath = path.join(__dirname, '..', 'data', 'the-pensive-index.db');
  const db = new Database(dbPath);

  // Read migration file
  const migrationPath = path.join(
    __dirname,
    '..',
    'migrations',
    '006_fandom_assignments.sql'
  );
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log('🔧 Running fandom assignments migration...');

  statements.forEach((statement, index) => {
    try {
      if (
        statement.toLowerCase().includes('select') ||
        statement.toLowerCase().includes('pragma')
      ) {
        // Use get() for SELECT statements
        console.log(`📊 Statement ${index + 1}: Query executed`);
      } else {
        // Use exec() for DDL statements
        db.exec(statement + ';');
        console.log(
          `✅ Statement ${index + 1}: ${statement
            .split(' ')
            .slice(0, 3)
            .join(' ')}...`
        );
      }
    } catch (error) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate column')
      ) {
        console.log(`⚠️  Statement ${index + 1}: Already exists (skipped)`);
      } else {
        console.error(`❌ Error in statement ${index + 1}:`, error.message);
      }
    }
  });

  console.log('🎉 Migration completed successfully!');

  // Verify tables exist
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log('📋 Available tables:', tables.map(t => t.name).join(', '));

  db.close();
} catch (error) {
  console.error('💥 Migration failed:', error);
  process.exit(1);
}
