/**
 * Test script to verify admin user count query
 * Tests the same query used in the dashboard stats API
 */

const Database = require('better-sqlite3');
const path = require('path');

// Open database connection
const dbPath = path.join(__dirname, '..', 'data', 'the-pensive-index.db');
const db = new Database(dbPath);

console.log('Testing admin user queries...\n');

// Test 1: Count all admin users
const allAdmins = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
console.log('1. Total admin users:', allAdmins.count);

// Test 2: Count active admin users
const activeAdmins = db
  .prepare('SELECT COUNT(*) as count FROM admin_users WHERE is_active = 1')
  .get();
console.log('2. Active admin users:', activeAdmins.count);

// Test 3: Show all admin users with details
const adminList = db
  .prepare('SELECT id, email, name, role, is_active FROM admin_users')
  .all();
console.log('\n3. Admin user details:');
adminList.forEach((admin, index) => {
  console.log(`   ${index + 1}. ${admin.name} (${admin.email})`);
  console.log(`      Role: ${admin.role}`);
  console.log(`      Active: ${admin.is_active ? 'Yes' : 'No'}`);
  console.log('');
});

// Test 4: Show fandom count for comparison
const fandomCount = db.prepare('SELECT COUNT(*) as count FROM fandoms').get();
const activeFandomCount = db
  .prepare('SELECT COUNT(*) as count FROM fandoms WHERE is_active = 1')
  .get();
console.log('4. Fandom counts (for comparison):');
console.log(`   Total fandoms: ${fandomCount.count}`);
console.log(`   Active fandoms: ${activeFandomCount.count}`);

// Test 5: Show tag count
const tagCount = db.prepare('SELECT COUNT(*) as count FROM tags').get();
console.log('\n5. Tag count:', tagCount.count);

db.close();
console.log('\n✅ Test complete!');
