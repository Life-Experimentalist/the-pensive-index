const Database = require('better-sqlite3');
const db = new Database('./data/the-pensive-index.db');

console.log('\n=== FANDOMS ===');
const fandoms = db.prepare('SELECT id, name, slug FROM fandoms').all();
fandoms.forEach(f => console.log(`  ID: ${f.id}, Slug: ${f.slug}, Name: ${f.name}`));

console.log('\n=== TAGS (first 5) ===');
const tags = db.prepare('SELECT id, name, fandom_id FROM tags LIMIT 5').all();
tags.forEach(t => console.log(`  ID: ${t.id}, Name: ${t.name}, Fandom: ${t.fandom_id}`));

console.log('\n=== PLOT BLOCKS (first 5) ===');
const blocks = db.prepare('SELECT id, name, fandom_id FROM plot_blocks LIMIT 5').all();
blocks.forEach(b => console.log(`  ID: ${b.id}, Name: ${b.name}, Fandom: ${b.fandom_id}`));

db.close();
