const { execSync } = require('child_process');
const fs = require('fs');

function formatTime(ms) {
  if (ms >= 60000) {
    const m = Math.floor(ms / 60000);
    const s = ((ms % 60000) / 1000).toFixed(2);
    return `${m}m ${s}s`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

const start = Date.now();
console.log('\n🚀 Starting Next.js build (timed)');
try {
  // Use local next binary for faster execution
  execSync('next build', { stdio: 'inherit' });
} catch (err) {
  const took = Date.now() - start;
  console.error('\n❌ Build failed after', formatTime(took));
  process.exit(err.status || 1);
}

const total = Date.now() - start;
console.log('\n✅ Build completed in', formatTime(total));

process.exit(0);
