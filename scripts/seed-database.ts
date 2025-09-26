/**
 * Database Seed Script
 *
 * Seeds the database with initial data including:
 * - Sample fandoms
 * - Default admin user
 * - Basic validation rules and templates
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { DatabaseManager } from '../src/lib/database';
import { schema } from '../src/lib/database/schema';

async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    const dbManager = DatabaseManager.getInstance();

    await dbManager.initialize({
      type: 'sqlite',
      url: process.env.DATABASE_URL || './data/the-pensive-index.db',
    });

    const db = dbManager.getConnection();

    // Seed fandoms
    console.log('📚 Creating sample fandoms...');
    const currentTime = new Date(); // Date object

    await db
      .insert(schema.fandoms)
      .values([
        {
          id: 'harry-potter',
          name: 'Harry Potter',
          description: 'The wizarding world of Harry Potter',
          slug: 'harry-potter',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
        {
          id: 'percy-jackson',
          name: 'Percy Jackson',
          description: 'Camp Half-Blood and the world of Greek mythology',
          slug: 'percy-jackson',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
      ])
      .onConflictDoNothing();

    // Seed default admin user
    console.log('👨‍💼 Creating default admin user...');
    await db
      .insert(schema.adminUsers)
      .values({
        id: 'admin-001',
        email: 'admin@example.com',
        name: 'System Administrator',
        role: 'ProjectAdmin',
        permissions: [
          {
            id: 'all',
            name: 'All Permissions',
            description: 'Full access to all admin functions',
            scope: 'global' as const,
          },
        ],
        is_active: true,
        created_at: currentTime,
        updated_at: currentTime,
      })
      .onConflictDoNothing();

    // Seed some basic tags
    console.log('🏷️ Creating sample tags...');
    await db
      .insert(schema.tags)
      .values([
        {
          id: 'tag-time-travel',
          name: 'Time Travel',
          fandom_id: 'harry-potter',
          description: 'Stories involving time travel',
          category: 'plot-device',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
        {
          id: 'tag-romance',
          name: 'Romance',
          fandom_id: 'harry-potter',
          description: 'Romantic relationships',
          category: 'genre',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
        {
          id: 'tag-adventure',
          name: 'Adventure',
          fandom_id: 'percy-jackson',
          description: 'Action and adventure stories',
          category: 'genre',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
      ])
      .onConflictDoNothing();

    // Seed plot blocks
    console.log('📖 Creating sample plot blocks...');
    await db
      .insert(schema.plotBlocks)
      .values([
        {
          id: 'pb-goblin-inheritance',
          name: 'Goblin Inheritance',
          fandom_id: 'harry-potter',
          category: 'inheritance',
          description: 'Harry discovers his inheritance through Gringotts',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
        {
          id: 'pb-camp-arrival',
          name: 'Camp Half-Blood Arrival',
          fandom_id: 'percy-jackson',
          category: 'beginning',
          description: 'Character arrives at Camp Half-Blood',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
      ])
      .onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
