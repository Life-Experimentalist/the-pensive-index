/**
 * Enhanced Database Seed Script for Pathway Builder
 * Seeds comprehensive fandom data including tags, tropes, and tag classes
 *
 * Run with: npm run seed-pathway-data
 * Or with wrangler: wrangler d1 execute DB --file=./scripts/seed-pathway-data.sql
 */

import { DatabaseManager } from '../src/lib/database';
import { schema } from '../src/lib/database/schema';

async function seedPathwayData() {
  console.log('🌱 Seeding pathway builder data...');

  try {
    const dbManager = DatabaseManager.getInstance();

    await dbManager.initialize({
      type: 'sqlite',
      url: process.env.DATABASE_URL || './data/the-pensive-index.db',
    });

    const db = dbManager.getConnection();
    const currentTime = new Date();

    // 1. Ensure Harry Potter fandom exists
    console.log('📚 Setting up Harry Potter fandom...');
    await db
      .insert(schema.fandoms)
      .values({
        id: 'harry-potter',
        name: 'Harry Potter',
        description: 'The wizarding world of Harry Potter',
        slug: 'harry-potter',
        is_active: true,
        created_at: currentTime,
        updated_at: currentTime,
      })
      .onConflictDoNothing();

    // 2. Create Tag Classes for validation
    console.log('🏷️ Creating tag classes...');
    await db
      .insert(schema.tagClasses)
      .values([
        {
          id: 'tc-harry-shipping',
          fandom_id: 'harry-potter',
          name: 'Harry Shipping',
          slug: 'harry-shipping',
          description: 'Romantic pairings involving Harry Potter',
          validation_rules: {
            mutual_exclusion: {
              within_class: true,
              conflicting_tags: [],
              conflicting_classes: [],
            },
          },
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
        {
          id: 'tc-hermione-shipping',
          fandom_id: 'harry-potter',
          name: 'Hermione Shipping',
          slug: 'hermione-shipping',
          description: 'Romantic pairings involving Hermione Granger',
          validation_rules: {
            mutual_exclusion: {
              within_class: true,
              conflicting_tags: [],
              conflicting_classes: [],
            },
          },
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        },
      ])
      .onConflictDoNothing();

    // 3. Create comprehensive tag set
    console.log('🏷️ Creating tags...');
    const tagData = [
      // Harry Shipping Tags (Class: tc-harry-shipping)
      {
        id: 'tag-harry-hermione',
        name: 'Harry/Hermione',
        tag_class_id: 'tc-harry-shipping',
        category: 'shipping',
        description: 'Harry Potter and Hermione Granger romance',
      },
      {
        id: 'tag-harry-ginny',
        name: 'Harry/Ginny',
        tag_class_id: 'tc-harry-shipping',
        category: 'shipping',
        description: 'Harry Potter and Ginny Weasley romance',
      },
      {
        id: 'tag-harry-luna',
        name: 'Harry/Luna',
        tag_class_id: 'tc-harry-shipping',
        category: 'shipping',
        description: 'Harry Potter and Luna Lovegood romance',
      },

      // Hermione Shipping Tags (Class: tc-hermione-shipping)
      {
        id: 'tag-hermione-ron',
        name: 'Hermione/Ron',
        tag_class_id: 'tc-hermione-shipping',
        category: 'shipping',
        description: 'Hermione Granger and Ron Weasley romance',
      },
      {
        id: 'tag-hermione-draco',
        name: 'Hermione/Draco',
        tag_class_id: 'tc-hermione-shipping',
        category: 'shipping',
        description: 'Hermione Granger and Draco Malfoy romance',
      },

      // Genre Tags
      {
        id: 'tag-time-travel',
        name: 'Time Travel',
        tag_class_id: null,
        category: 'plot-device',
        description: 'Stories involving time travel',
      },
      {
        id: 'tag-angst',
        name: 'Angst',
        tag_class_id: null,
        category: 'tone',
        description: 'Emotional distress and conflict',
      },
      {
        id: 'tag-fluff',
        name: 'Fluff',
        tag_class_id: null,
        category: 'tone',
        description: 'Light-hearted and feel-good content',
      },
      {
        id: 'tag-adventure',
        name: 'Adventure',
        tag_class_id: null,
        category: 'genre',
        description: 'Action and adventure stories',
      },
      {
        id: 'tag-mystery',
        name: 'Mystery',
        tag_class_id: null,
        category: 'genre',
        description: 'Mystery and detective stories',
      },
    ];

    for (const tag of tagData) {
      await db
        .insert(schema.tags)
        .values({
          ...tag,
          fandom_id: 'harry-potter',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        })
        .onConflictDoNothing();
    }

    // 4. Create tropes with dependencies
    console.log('📦 Creating tropes...');
    const plotBlockData = [
      {
        id: 'pb-goblin-inheritance',
        name: 'Goblin Inheritance',
        description: 'Harry discovers his magical inheritance at Gringotts',
        category: 'worldbuilding',
        parent_id: null,
        dependency_type: null,
      },
      {
        id: 'pb-black-lordship',
        name: 'Black Lordship',
        description: 'Harry becomes Lord Black',
        category: 'power-gain',
        parent_id: 'pb-goblin-inheritance',
        dependency_type: 'requires',
      },
      {
        id: 'pb-slytherin-lordship',
        name: 'Slytherin Lordship',
        description: 'Harry claims the Slytherin Lordship',
        category: 'power-gain',
        parent_id: 'pb-goblin-inheritance',
        dependency_type: 'requires',
      },
      {
        id: 'pb-potter-heritage',
        name: 'Potter Heritage',
        description: 'Harry discovers the true extent of the Potter legacy',
        category: 'worldbuilding',
        parent_id: 'pb-goblin-inheritance',
        dependency_type: 'requires',
      },
      {
        id: 'pb-triwizard-tournament',
        name: 'Triwizard Tournament',
        description: 'Fourth year tournament participation',
        category: 'canon-event',
        parent_id: null,
        dependency_type: null,
      },
      {
        id: 'pb-emancipation',
        name: 'Magical Emancipation',
        description: 'Harry becomes legally emancipated',
        category: 'legal',
        parent_id: 'pb-triwizard-tournament',
        dependency_type: 'requires',
      },
      {
        id: 'pb-sirius-death',
        name: 'Sirius Death',
        description: 'Sirius Black dies at the Department of Mysteries',
        category: 'canon-event',
        parent_id: null,
        dependency_type: null,
      },
      {
        id: 'pb-wrong-bwl',
        name: 'Wrong Boy Who Lived',
        description: 'Harry is not the actual Boy Who Lived',
        category: 'au-divergence',
        parent_id: null,
        dependency_type: null,
      },
    ];

    for (const plotBlock of plotBlockData) {
      await db
        .insert(schema.plotBlocks)
        .values({
          ...plotBlock,
          fandom_id: 'harry-potter',
          is_active: true,
          created_at: currentTime,
          updated_at: currentTime,
        })
        .onConflictDoNothing();
    }

    console.log('✅ Pathway data seeding complete!');
    console.log(`   - Created ${tagData.length} tags`);
    console.log(`   - Created ${plotBlockData.length} tropes`);
    console.log('   - Created 2 tag classes for validation');
  } catch (error) {
    console.error('❌ Error seeding pathway data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedPathwayData()
    .then(() => {
      console.log('🎉 Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedPathwayData };
