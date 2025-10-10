import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'the-pensive-index.db');
const db = new Database(dbPath);

// Harry Potter fandom ID is 1 (based on earlier data)
const fandomId = '1';

// Tag classes for Harry Potter
const tagClasses = [
  {
    id: 'hp-characters',
    name: 'Characters',
    slug: 'characters',
    description: 'Character-related tags',
    fandom_id: fandomId,
    validation_rules: JSON.stringify({}),
  },
  {
    id: 'hp-relationships',
    name: 'Relationships',
    slug: 'relationships',
    description: 'Character relationships and pairings',
    fandom_id: fandomId,
    validation_rules: JSON.stringify({}),
  },
  {
    id: 'hp-themes',
    name: 'Themes',
    slug: 'themes',
    description: 'Story themes and concepts',
    fandom_id: fandomId,
    validation_rules: JSON.stringify({}),
  },
  {
    id: 'hp-plot-elements',
    name: 'Plot Elements',
    slug: 'plot-elements',
    description: 'Plot devices and story elements',
    fandom_id: fandomId,
    validation_rules: JSON.stringify({}),
  },
];

// Harry Potter tags for Reptilia28 Challenge testing
const tags = [
  {
    id: 'hp-tag-time-travel',
    name: 'Time Travel',
    slug: 'time-travel',
    description: 'Stories involving time travel',
    fandom_id: fandomId,
    tag_class_id: 'hp-plot-elements',
  },
  {
    id: 'hp-tag-harry-hermione',
    name: 'H/Hr',
    slug: 'harry-hermione',
    description: 'Harry Potter and Hermione Granger pairing',
    fandom_id: fandomId,
    tag_class_id: 'hp-relationships',
  },
  {
    id: 'hp-tag-soul-bond',
    name: 'Soul Bond',
    slug: 'soul-bond',
    description: 'Stories featuring soul bonds between characters',
    fandom_id: fandomId,
    tag_class_id: 'hp-plot-elements',
  },
  {
    id: 'hp-tag-dumbledore-bashing',
    name: 'Dumbledore Bashing',
    slug: 'dumbledore-bashing',
    description: 'Stories critical of Albus Dumbledore',
    fandom_id: fandomId,
    tag_class_id: 'hp-characters',
  },
  {
    id: 'hp-tag-grey-harry',
    name: 'Grey Harry',
    slug: 'grey-harry',
    description: 'Harry Potter with morally grey characterization',
    fandom_id: fandomId,
    tag_class_id: 'hp-characters',
  },
  {
    id: 'hp-tag-contract',
    name: 'Contract',
    slug: 'contract',
    description: 'Stories involving magical contracts',
    fandom_id: fandomId,
    tag_class_id: 'hp-plot-elements',
  },
  {
    id: 'hp-tag-dimension-travel',
    name: 'Dimension Travel',
    slug: 'dimension-travel',
    description: 'Travel between alternate dimensions or universes',
    fandom_id: fandomId,
    tag_class_id: 'hp-plot-elements',
  },
  {
    id: 'hp-tag-peggy-sue',
    name: 'Peggy Sue',
    slug: 'peggy-sue',
    description: 'Character relives their life with foreknowledge',
    fandom_id: fandomId,
    tag_class_id: 'hp-plot-elements',
  },
];

// Reptilia28 Challenge trope
const reptilia28Description = `The Reptilia28 Challenge is a popular Harry Potter fanfiction premise where:

**Requirements:**
- Harry is killed/dies (typically during the final battle or another major event)
- He is sent to an in-between realm (often resembling King's Cross)
- Death gives him a choice to go back in time and redo his life
- The specific moment he returns to varies by story (often the start of his Hogwarts years)
- He retains all his memories and knowledge from his previous life

**Common Elements (Optional):**
- Harry/Hermione pairing (H/Hr) is the most common
- Soul bond between Harry and his romantic partner
- Grey or darker characterization of Harry
- Dumbledore manipulation or bashing
- Focus on changing past mistakes
- Preparation for future threats (especially Voldemort)
- Magical contracts or ancient magic
- Dimension travel elements in some variations

**Challenge Variations:**
The challenge has spawned many interpretations, with authors adding their own unique twists such as:
- Different time periods to return to
- Various romantic pairings (though H/Hr is traditional)
- Different powers or advantages gained
- Variations in who else remembers or is involved
- Different approaches to changing the timeline

This challenge explores themes of second chances, redemption, preparation, and the consequences of foreknowledge. It's named after the FFN user Reptilia28 who popularized this story premise.`;

const tropes = [
  {
    id: 'hp-trope-reptilia28',
    name: 'Reptilia28 Challenge',
    slug: 'reptilia28-challenge',
    description: reptilia28Description,
    fandom_id: fandomId,
  },
];

console.log('Starting database seed for Harry Potter tags and tropes...\n');

try {
  // Insert tag classes
  console.log('Inserting tag classes...');
  const insertTagClass = db.prepare(`
    INSERT OR IGNORE INTO tag_classes (id, name, slug, description, fandom_id, validation_rules)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const tagClass of tagClasses) {
    insertTagClass.run(
      tagClass.id,
      tagClass.name,
      tagClass.slug,
      tagClass.description,
      tagClass.fandom_id,
      tagClass.validation_rules
    );
    console.log(`  ✓ ${tagClass.name}`);
  }

  // Insert tags
  console.log('\nInserting tags...');
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, name, slug, description, fandom_id, tag_class_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const tag of tags) {
    insertTag.run(
      tag.id,
      tag.name,
      tag.slug,
      tag.description,
      tag.fandom_id,
      tag.tag_class_id
    );
    console.log(`  ✓ ${tag.name}`);
  }

  // Insert tropes (plot blocks)
  console.log('\nInserting tropes...');
  const insertTrope = db.prepare(`
    INSERT OR IGNORE INTO plot_blocks (id, name, slug, description, fandom_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const trope of tropes) {
    insertTrope.run(
      trope.id,
      trope.name,
      trope.slug,
      trope.description,
      trope.fandom_id
    );
    console.log(`  ✓ ${trope.name}`);
  }

  console.log('\n✅ Database seeding completed successfully!');

  // Verify the data
  console.log('\nVerifying inserted data:');
  const tagCount = db
    .prepare('SELECT COUNT(*) as count FROM tags WHERE fandom_id = ?')
    .get(fandomId);
  const tropeCount = db
    .prepare('SELECT COUNT(*) as count FROM plot_blocks WHERE fandom_id = ?')
    .get(fandomId);

  console.log(`  Tags for Harry Potter: ${tagCount.count}`);
  console.log(`  Tropes for Harry Potter: ${tropeCount.count}`);
} catch (error) {
  console.error('Error seeding database:', error);
  process.exit(1);
} finally {
  db.close();
}
