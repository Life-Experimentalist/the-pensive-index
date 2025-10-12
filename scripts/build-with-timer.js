#!/usr/bin/env node

/**
 * Build with Timer
 * Wraps the build process and displays total build time
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function formatTime(milliseconds) {
  const totalSeconds = (milliseconds / 1000).toFixed(2);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function printHeader(text, color = colors.cyan) {
  const line = '='.repeat(70);
  console.log(`\n${color}${line}${colors.reset}`);
  console.log(`${color}${colors.bright}${text}${colors.reset}`);
  console.log(`${color}${line}${colors.reset}\n`);
}

function printSuccess(time) {
  printHeader('✅ BUILD SUCCESSFUL', colors.green);
  console.log(
    `${colors.bright}⏱️  Total Build Time: ${colors.green}${time}${colors.reset}\n`
  );
}

function printFailure(time, error) {
  printHeader('❌ BUILD FAILED', colors.red);
  console.log(
    `${colors.bright}⏱️  Time until failure: ${colors.yellow}${time}${colors.reset}`
  );
  console.log(`${colors.red}Error: ${error.message}${colors.reset}\n`);
}

async function main() {
  printHeader('🚀 Starting Build Process', colors.cyan);

  const startTime = Date.now();
  let nextBuildTime, docsBuildTime;

  try {
    // Step 1: Next.js build
    console.log(
      `${colors.cyan}📦 Building Next.js application...${colors.reset}\n`
    );
    const nextStart = Date.now();

    try {
      execSync('next build', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (err) {
      throw new Error(`Next.js build failed: ${err.message}`);
    }

    nextBuildTime = Date.now() - nextStart;
    console.log(
      `\n${colors.green}✓ Next.js build completed in ${formatTime(
        nextBuildTime
      )}${colors.reset}\n`
    );

    // Step 2: Documentation build
    console.log(`${colors.cyan}📚 Building documentation...${colors.reset}\n`);
    const docsStart = Date.now();

    try {
      execSync('npm run build:docs', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    } catch (err) {
      throw new Error(`Documentation build failed: ${err.message}`);
    }

    docsBuildTime = Date.now() - docsStart;
    console.log(
      `\n${colors.green}✓ Documentation build completed in ${formatTime(
        docsBuildTime
      )}${colors.reset}\n`
    );

    // Calculate total time
    const totalTime = Date.now() - startTime;
    const formattedTime = formatTime(totalTime);

    // Print success summary
    printSuccess(formattedTime);

    // Print breakdown
    console.log(`${colors.bright}Build Breakdown:${colors.reset}`);
    console.log(`  Next.js:       ${formatTime(nextBuildTime)}`);
    console.log(`  Documentation: ${formatTime(docsBuildTime)}`);
    console.log(
      `  ${colors.bright}Total:         ${colors.green}${formattedTime}${colors.reset}\n`
    );

    process.exit(0);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const formattedTime = formatTime(totalTime);

    printFailure(formattedTime, error);

    // Print partial results if available
    if (nextBuildTime || docsBuildTime) {
      console.log(`${colors.bright}Partial Build Times:${colors.reset}`);
      if (nextBuildTime) {
        console.log(`  Next.js:       ${formatTime(nextBuildTime)}`);
      }
      if (docsBuildTime) {
        console.log(`  Documentation: ${formatTime(docsBuildTime)}`);
      }
      console.log();
    }

    process.exit(1);
  }
}

main();
