/**
 * Database Test Script
 * Tests the Drizzle integration and database connectivity
 */

import { getDb } from './src/lib/database/init';
import { fandoms, tags, stories } from './src/lib/database/schema';

async function testDatabase() {
  console.log('🔍 Testing database connection and Drizzle integration...\n');

  try {
    // Initialize database connection
    console.log('📡 Initializing database connection...');
    const db = await getDb();
    console.log('✅ Database connection initialized successfully\n');

    // Test fandoms table
    console.log('📊 Testing fandoms table...');
    const fandomResults = await db.select().from(fandoms);
    console.log(`✅ Found ${fandomResults.length} fandoms in database`);
    if (fandomResults.length > 0) {
      console.log('📝 Sample fandom:', fandomResults[0]);
    }
    console.log('');

    // Test tags table
    console.log('📊 Testing tags table...');
    const tagResults = await db.select().from(tags);
    console.log(`✅ Found ${tagResults.length} tags in database`);
    if (tagResults.length > 0) {
      console.log('📝 Sample tag:', tagResults[0]);
    }
    console.log('');

    // Test stories table
    console.log('📊 Testing stories table...');
    const storyResults = await db.select().from(stories);
    console.log(`✅ Found ${storyResults.length} stories in database`);
    if (storyResults.length > 0) {
      console.log('📝 Sample story:', storyResults[0]);
    }
    console.log('');

    // Test counts for stats dashboard
    console.log('📈 Testing counts for dashboard stats...');
    const counts = {
      fandoms: fandomResults.length,
      tags: tagResults.length,
      stories: storyResults.length,
    };
    console.log('📊 Current counts:', counts);
    console.log('');

    console.log('🎉 All database tests passed successfully!');
    console.log('💡 The Drizzle integration is working correctly.');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error(
      '💡 Make sure the database is properly set up and migrations are run.'
    );
    process.exit(1);
  }
}

// Run the test
testDatabase().catch(console.error);
