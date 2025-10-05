const Database = require('better-sqlite3');

const db = new Database('./data/the-pensive-index.db');

// Check if pathways table exists
const result = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='pathways'`
  )
  .get();

if (result) {
  console.log('✅ Pathways table exists');

  // Get columns
  const cols = db.prepare('PRAGMA table_info(pathways)').all();
  console.log('\nColumns:');
  cols.forEach(col => {
    console.log(
      `  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${
        col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''
      }`
    );
  });
} else {
  console.log('❌ Pathways table does not exist');
  console.log('\nAttempting to create...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS pathways (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      fandom_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      selected_tags TEXT NOT NULL DEFAULT '[]',
      selected_plot_blocks TEXT NOT NULL DEFAULT '[]',
      is_public INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      match_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pathways_user_id ON pathways(user_id);
    CREATE INDEX IF NOT EXISTS idx_pathways_public ON pathways(is_public) WHERE is_public = 1;
    CREATE INDEX IF NOT EXISTS idx_pathways_fandom_id ON pathways(fandom_id);
  `);

  console.log('✅ Pathways table created successfully');
}

db.close();
