import Database from 'better-sqlite3';

const db = new Database('./data/the-pensive-index.db');

console.log('📋 Checking database schema...\n');

// Check fandoms table
console.log('=== FANDOMS TABLE ===');
const fandomsInfo = db.pragma('table_info(fandoms)');
fandomsInfo.forEach((col: any) => {
  console.log(
    `  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${
      col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''
    }`
  );
});

console.log('\n=== PLOT_BLOCKS TABLE ===');
const plotBlocksInfo = db.pragma('table_info(plot_blocks)');
plotBlocksInfo.forEach((col: any) => {
  console.log(
    `  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${
      col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''
    }`
  );
});

// Check if display_order exists
const hasDisplayOrder = plotBlocksInfo.some(
  (col: any) => col.name === 'display_order'
);
console.log(`\n✓ display_order column exists: ${hasDisplayOrder}`);

// Check if metadata exists in fandoms
const hasMetadata = fandomsInfo.some((col: any) => col.name === 'metadata');
console.log(`✓ metadata column exists in fandoms: ${hasMetadata}`);

db.close();
