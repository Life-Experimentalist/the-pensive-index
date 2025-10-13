/**
 * Raw SQL Seed Script for Pathway Builder
 * Uses raw SQL to bypass Drizzle type checking
 */

import Database from 'better-sqlite3';
import * as path from 'path';

async function seedPathwayData() {
  console.log('🌱 Seeding pathway builder data with raw SQL...');

  const dbPath = path.join(process.cwd(), 'data', 'the-pensive-index.db');
  const db = new Database(dbPath);

  try {
    // 1. Harry Potter fandom (uses INTEGER id, TEXT timestamps)
    console.log('📚 Creating Harry Potter fandom...');
    db.prepare(
      `
      INSERT OR IGNORE INTO fandoms (name, description, slug, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(
      'Harry Potter',
      'The wizarding world of Harry Potter',
      'harry-potter',
      1
    );

    // Get the fandom ID and convert to TEXT for foreign keys
    const fandom = db
      .prepare('SELECT id FROM fandoms WHERE slug = ?')
      .get('harry-potter') as { id: number };
    const fandomId = fandom.id.toString(); // Convert INTEGER to TEXT

    console.log(`   - Fandom ID: ${fandomId}`);

    // 2. Tag Classes (uses TEXT id, TEXT fandom_id, INTEGER timestamps)
    console.log('🏷️ Creating tag classes...');
    const tagClassRules = JSON.stringify({
      mutual_exclusion: {
        within_class: true,
        conflicting_tags: [],
        conflicting_classes: [],
      },
    });

    db.prepare(
      `
      INSERT OR IGNORE INTO tag_classes (id, fandom_id, name, slug, description, validation_rules, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `
    ).run(
      'tc-harry-shipping',
      fandomId,
      'Harry Shipping',
      'harry-shipping',
      'Romantic pairings involving Harry Potter',
      tagClassRules,
      1
    );

    db.prepare(
      `
      INSERT OR IGNORE INTO tag_classes (id, fandom_id, name, slug, description, validation_rules, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `
    ).run(
      'tc-hermione-shipping',
      fandomId,
      'Hermione Shipping',
      'hermione-shipping',
      'Romantic pairings involving Hermione Granger',
      tagClassRules,
      1
    );

    const harryShippingId = 'tc-harry-shipping';
    const hermioneShippingId = 'tc-hermione-shipping';

    // 3. Tags (uses TEXT id, TEXT fandom_id, TEXT tag_class_id, INTEGER timestamps)
    console.log('🔖 Creating tags...');
    const tagInsert = db.prepare(`
      INSERT OR IGNORE INTO tags (id, name, slug, fandom_id, tag_class_id, category, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `);

    const tags = [
      [
        'tag-harry-hermione',
        'Harry/Hermione',
        'harry-hermione',
        fandomId,
        harryShippingId,
        'shipping',
        'Harry Potter and Hermione Granger romance',
        1,
      ],
      [
        'tag-harry-ginny',
        'Harry/Ginny',
        'harry-ginny',
        fandomId,
        harryShippingId,
        'shipping',
        'Harry Potter and Ginny Weasley romance',
        1,
      ],
      [
        'tag-harry-luna',
        'Harry/Luna',
        'harry-luna',
        fandomId,
        harryShippingId,
        'shipping',
        'Harry Potter and Luna Lovegood romance',
        1,
      ],
      [
        'tag-hermione-ron',
        'Hermione/Ron',
        'hermione-ron',
        fandomId,
        hermioneShippingId,
        'shipping',
        'Hermione Granger and Ron Weasley romance',
        1,
      ],
      [
        'tag-hermione-draco',
        'Hermione/Draco',
        'hermione-draco',
        fandomId,
        hermioneShippingId,
        'shipping',
        'Hermione Granger and Draco Malfoy romance',
        1,
      ],
      [
        'tag-time-travel',
        'Time Travel',
        'time-travel',
        fandomId,
        null,
        'plot-device',
        'Stories involving time travel',
        1,
      ],
      [
        'tag-angst',
        'Angst',
        'angst',
        fandomId,
        null,
        'tone',
        'Emotional distress and conflict',
        1,
      ],
      [
        'tag-fluff',
        'Fluff',
        'fluff',
        fandomId,
        null,
        'tone',
        'Light-hearted and feel-good content',
        1,
      ],
      [
        'tag-adventure',
        'Adventure',
        'adventure',
        fandomId,
        null,
        'genre',
        'Action and adventure stories',
        1,
      ],
      [
        'tag-mystery',
        'Mystery',
        'mystery',
        fandomId,
        null,
        'genre',
        'Mystery and detective stories',
        1,
      ],
    ];

    for (const tag of tags) {
      tagInsert.run(...tag);
    }

    // 4. Tropees TEXT id, TEXT fandom_id, TEXT parent_id, INTEGER timestamps)
    console.log('📦 Creating tropes...');
    const plotBlockInsert = db.prepare(`
      INSERT OR IGNORE INTO plot_blocks (id, name, slug, fandom_id, description, display_order, parent_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `);

    // First, insert root tropes (no parent)
    const rootBlocks = [
      [
        'pb-goblin-inheritance',
        'Goblin Inheritance',
        'goblin-inheritance',
        fandomId,
        'Harry discovers his magical inheritance at Gringotts',
        1,
        null,
        1,
      ],
      [
        'pb-triwizard-tournament',
        'Triwizard Tournament',
        'triwizard-tournament',
        fandomId,
        'Fourth year tournament participation',
        2,
        null,
        1,
      ],
      [
        'pb-sirius-death',
        'Sirius Death',
        'sirius-death',
        fandomId,
        'Sirius Black dies at the Department of Mysteries',
        3,
        null,
        1,
      ],
      [
        'pb-wrong-bwl',
        'Wrong Boy Who Lived',
        'wrong-boy-who-lived',
        fandomId,
        'Harry is not the actual Boy Who Lived',
        4,
        null,
        1,
      ],
    ];

    for (const block of rootBlocks) {
      plotBlockInsert.run(...block);
    }

    // Now insert child tropes with parent references
    const childBlocks = [
      [
        'pb-black-lordship',
        'Black Lordship',
        'black-lordship',
        fandomId,
        'Harry becomes Lord Black',
        1,
        'pb-goblin-inheritance',
        1,
      ],
      [
        'pb-slytherin-lordship',
        'Slytherin Lordship',
        'slytherin-lordship',
        fandomId,
        'Harry claims the Slytherin Lordship',
        2,
        'pb-goblin-inheritance',
        1,
      ],
      [
        'pb-potter-heritage',
        'Potter Heritage',
        'potter-heritage',
        fandomId,
        'Harry discovers the true extent of the Potter legacy',
        3,
        'pb-goblin-inheritance',
        1,
      ],
      [
        'pb-emancipation',
        'Magical Emancipation',
        'magical-emancipation',
        fandomId,
        'Harry becomes legally emancipated',
        1,
        'pb-triwizard-tournament',
        1,
      ],
    ];

    for (const block of childBlocks) {
      plotBlockInsert.run(...block);
    }

    console.log('✅ Pathway data seeding complete!');
    console.log(`   - Created 10 tags`);
    console.log(`   - Created 8 tropes`);
    console.log('   - Created 2 tag classes for validation');
  } catch (error) {
    console.error('❌ Error seeding pathway data:', error);
    throw error;
  } finally {
    db.close();
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
