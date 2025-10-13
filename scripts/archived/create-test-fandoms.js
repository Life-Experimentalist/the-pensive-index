// Create Test Fandoms Script
// Adds some test fandoms to the database for development

const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, '..', 'data', 'the-pensive-index.db');
  const db = new Database(dbPath);

  const fandoms = [
    {
      name: 'Harry Potter',
      slug: 'harry-potter',
      description: 'The magical world of Harry Potter by J.K. Rowling',
    },
    {
      name: 'Percy Jackson',
      slug: 'percy-jackson',
      description:
        "Greek mythology meets modern day in Rick Riordan's Percy Jackson series",
    },
    {
      name: 'Marvel Cinematic Universe',
      slug: 'mcu',
      description: 'The Marvel Cinematic Universe and its superheroes',
    },
    {
      name: 'Naruto',
      slug: 'naruto',
      description: 'The ninja world of Naruto by Masashi Kishimoto',
    },
    {
      name: 'My Hero Academia',
      slug: 'hero-academia',
      description: 'The superhero academy world of My Hero Academia',
    },
  ];

  console.log('🌟 Creating test fandoms...');

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO fandoms (name, slug, description, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `);

  fandoms.forEach(fandom => {
    try {
      const result = insertStmt.run(
        fandom.name,
        fandom.slug,
        fandom.description
      );
      if (result.changes > 0) {
        console.log(`✅ Created fandom: ${fandom.name}`);
      } else {
        console.log(`⚠️  Fandom already exists: ${fandom.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating fandom ${fandom.name}:`, error.message);
    }
  });

  // Show all fandoms
  const allFandoms = db.prepare('SELECT * FROM fandoms ORDER BY name').all();
  console.log('\n📚 Available fandoms:');
  allFandoms.forEach(fandom => {
    console.log(`  • ${fandom.name} (ID: ${fandom.id})`);
  });

  db.close();
  console.log('\n🎉 Test fandoms created successfully!');
} catch (error) {
  console.error('💥 Failed to create fandoms:', error);
}
