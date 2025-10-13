const Database = require('better-sqlite3');

const db = new Database('./data/the-pensive-index.db');

// Sample fandoms to add
const fandoms = [
  {
    id: 'hp-01',
    name: 'Harry Potter',
    slug: 'harry-potter',
    description:
      'The wizarding world of Harry Potter, Hogwarts, and the fight against dark forces',
    is_active: 1,
  },
  {
    id: 'pj-01',
    name: 'Percy Jackson',
    slug: 'percy-jackson',
    description: 'Greek gods, demigods, and epic quests in the modern world',
    is_active: 1,
  },
  {
    id: 'mcu-01',
    name: 'Marvel Cinematic Universe',
    slug: 'mcu',
    description:
      'Superheroes, villains, and epic battles across the Marvel Cinematic Universe',
    is_active: 1,
  },
  {
    id: 'naruto-01',
    name: 'Naruto',
    slug: 'naruto',
    description:
      'Ninjas, jutsu, and the journey of Naruto Uzumaki to become Hokage',
    is_active: 1,
  },
  {
    id: 'lotr-01',
    name: 'Lord of the Rings',
    slug: 'lord-of-the-rings',
    description:
      'Middle-earth, hobbits, elves, and the quest to destroy the One Ring',
    is_active: 1,
  },
];

// Check if fandoms already exist
const existingFandoms = db.prepare('SELECT id FROM fandoms').all();

if (existingFandoms.length > 0) {
  console.log(`✅ Database already has ${existingFandoms.length} fandoms`);
  console.log('\nExisting fandoms:');
  const allFandoms = db
    .prepare('SELECT name, slug, description FROM fandoms')
    .all();
  allFandoms.forEach(f => {
    console.log(`  - ${f.name} (/${f.slug})`);
    console.log(`    ${f.description || 'No description'}`);
  });
} else {
  console.log('📝 Adding sample fandoms...\n');

  const insert = db.prepare(`
    INSERT INTO fandoms (id, name, slug, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `);

  fandoms.forEach(fandom => {
    try {
      insert.run(
        fandom.id,
        fandom.name,
        fandom.slug,
        fandom.description,
        fandom.is_active
      );
      console.log(`✅ Added: ${fandom.name}`);
    } catch (error) {
      console.log(`❌ Failed to add ${fandom.name}:`, error.message);
    }
  });

  console.log('\n✅ Sample fandoms added successfully!');
}

db.close();
