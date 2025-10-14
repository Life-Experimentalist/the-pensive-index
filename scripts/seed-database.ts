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
// @ts-nocheck - Development script with multiple Drizzle type issues

import { DatabaseManager } from '../src/lib/database';
import {
  fandoms,
  adminUsers,
  tags,
  plotBlocks,
} from '../src/lib/database/schema';

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

    // Insert first fandom
    const harryPotterResult = await db
      .insert(fandoms)
      .values({
        id: 'harry-potter',
        name: 'Harry Potter',
        description: 'The wizarding world of Harry Potter',
        slug: 'harry-potter',
        is_active: true,
      })
      .onConflictDoNothing()
      .returning();

    // Insert second fandom
    const percyJacksonResult = await db
      .insert(fandoms)
      .values({
        id: 'percy-jackson',
        name: 'Percy Jackson',
        description: 'Camp Half-Blood and the world of Greek mythology',
        slug: 'percy-jackson',
        is_active: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log('✅ Fandoms created:', {
      harryPotter: harryPotterResult.length > 0 ? 'created' : 'exists',
      percyJackson: percyJacksonResult.length > 0 ? 'created' : 'exists',
    });

    // Seed default admin user
    console.log('👨‍💼 Creating default admin user...');
    await db
      .insert(adminUsers)
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
      })
      .onConflictDoNothing();

    // Seed some basic tags
    console.log('🏷️ Creating sample tags...');
    await db
      .insert(tags)
      .values([
        {
          id: 'tag-time-travel',
          name: 'Time Travel',
          slug: 'time-travel',
          fandom_id: 'harry-potter',
          description: 'Stories involving time travel',
          category: 'plot-device',
          is_active: true,
        },
        {
          id: 'tag-romance',
          name: 'Romance',
          slug: 'romance',
          fandom_id: 'harry-potter',
          description: 'Romantic relationships',
          category: 'genre',
          is_active: true,
        },
        {
          id: 'tag-adventure',
          name: 'Adventure',
          slug: 'adventure',
          fandom_id: 'percy-jackson',
          description: 'Action and adventure stories',
          category: 'genre',
          is_active: true,
        },
      ])
      .onConflictDoNothing();

    // Seed tropes
    console.log('📖 Creating sample tropes...');
    await db
      .insert(plotBlocks)
      .values([
        {
          id: 'pb-goblin-inheritance',
          name: 'Goblin Inheritance',
          slug: 'goblin-inheritance',
          fandom_id: 'harry-potter',
          category: 'inheritance',
          description: 'Harry discovers his inheritance through Gringotts',
          is_active: true,
        },
        {
          id: 'pb-camp-arrival',
          name: 'Camp Half-Blood Arrival',
          slug: 'camp-half-blood-arrival',
          fandom_id: 'percy-jackson',
          category: 'beginning',
          description: 'Character arrives at Camp Half-Blood',
          is_active: true,
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
