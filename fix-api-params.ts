import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get all TypeScript files in the API directory
function findApiFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findApiFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix params in a file
function fixParamsInFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Pattern 1: { params }: { params: { id: string } }
  const pattern1 = /\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*([^}]+)\s*\}\s*\}/g;
  if (pattern1.test(content)) {
    content = content.replace(
      pattern1,
      '{ params }: { params: Promise<{ $1 }> }'
    );
    modified = true;
  }

  // Pattern 2: const { id } = params;
  const pattern2 = /const\s*\{\s*([^}]+)\s*\}\s*=\s*params;/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'const { $1 } = await params;');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Main execution
const apiDir = './app/api';
const apiFiles = findApiFiles(apiDir);

console.log(`Found ${apiFiles.length} API files`);

for (const file of apiFiles) {
  try {
    fixParamsInFile(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
}

console.log('Finished fixing API parameters');
