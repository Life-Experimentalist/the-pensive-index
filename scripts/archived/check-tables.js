const Database = require('better-sqlite3');
const db = new Database('./data/the-pensive-index.db');

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();
console.log('Tables in database:');
tables.forEach(t => console.log(' -', t.name));

db.close();
