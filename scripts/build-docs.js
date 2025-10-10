#!/usr/bin/env node

/**
 * Build script to copy docs to output directory for deployment
 * This script ensures the current docs/index.html is available at /docs route
 */

const fs = require('fs');
const path = require('path');

function copyRecursively(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursively(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function buildDocs() {
  try {
    console.log('🚀 Building docs structure...');

    // Check if this is a static export build or server build
    const outDir = path.join(process.cwd(), 'out');
    const nextDir = path.join(process.cwd(), '.next');

    // For static export builds
    if (fs.existsSync(outDir)) {
      const docsOutDir = path.join(outDir, 'docs');

      // Create docs directory in output
      if (!fs.existsSync(docsOutDir)) {
        fs.mkdirSync(docsOutDir, { recursive: true });
      }

      // Copy docs content to /docs route
      const docsSourceDir = path.join(process.cwd(), 'docs');

      console.log('📦 Copying docs to static export output...');

      if (fs.existsSync(docsSourceDir)) {
        console.log('📄 Copying docs to /docs route...');
        copyRecursively(docsSourceDir, docsOutDir);
      } else {
        console.log('⚠️  No docs directory found to copy');
      }

      // Copy CNAME for custom domain
      const cnameSource = path.join(process.cwd(), 'CNAME');
      const cnameDest = path.join(outDir, 'CNAME');
      if (fs.existsSync(cnameSource)) {
        console.log('🌐 Copying CNAME for custom domain...');
        fs.copyFileSync(cnameSource, cnameDest);
      }

      // Create a redirect from /wiki to /docs for future compatibility
      const wikiDir = path.join(outDir, 'wiki');
      if (!fs.existsSync(wikiDir)) {
        fs.mkdirSync(wikiDir, { recursive: true });
      }

      const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <meta http-equiv="refresh" content="0; url=/docs/">
  <link rel="canonical" href="/docs/">
</head>
<body>
  <p>Redirecting to <a href="/docs/">documentation</a>...</p>
  <script>
    window.location.href = '/docs/';
  </script>
</body>
</html>`;

      fs.writeFileSync(path.join(wikiDir, 'index.html'), redirectHtml);

      console.log('✅ Docs built successfully for static export!');
    }
    // For server builds
    else if (fs.existsSync(nextDir)) {
      console.log('✅ Server build detected - docs will be served from source');
      console.log('ℹ️  Docs are available in development and production');
      console.log('ℹ️  No additional build steps needed for server mode');
    } else {
      console.log('❌ Next.js build output not found. Run "next build" first.');
      process.exit(1);
    }

    console.log('✅ Docs build complete!');
    console.log('📁 Structure:');
    console.log('   / → Next.js App (main website)');
    console.log('   /docs → Documentation');
  } catch (error) {
    console.error('❌ Error building docs:', error);
    process.exit(1);
  }
}

buildDocs();
