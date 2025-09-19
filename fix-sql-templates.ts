// Fix SQL templates in queries.ts
// Run with: npx tsx fix-sql-templates.ts

import * as fs from 'fs';
import * as path from 'path';

// File paths
const queryFilePath = path.join(__dirname, 'src', 'lib', 'database', 'queries.ts');
const treeQueriesFilePath = path.join(__dirname, 'src', 'lib', 'database', 'tree-queries.ts');

// Fix SQL templates in a file
function fixSqlTemplates(filePath: string) {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace all sql<number> with sql
  content = content.replace(/sql<number>/g, 'sql');

  // Add mapWith(Number) after sql templates for counts
  content = content.replace(/sql`count\(\*\)`/g, 'sql`count(*)`');
  content = content.replace(/sql`count\((.*?)\)`/g, 'sql`count($1)`');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${filePath}`);
}

// Fix both files
fixSqlTemplates(queryFilePath);
fixSqlTemplates(treeQueriesFilePath);

console.log('SQL templates fixed in database query files');