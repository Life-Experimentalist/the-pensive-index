/**
 * Direct test of the fandoms API endpoint logic
 */

import { FandomModel } from '../src/lib/database/models';

async function testFandomsAPI() {
  try {
    console.log('Testing Fandoms API Logic...\n');

    const startTime = Date.now();
    const fandoms = await FandomModel.getAllActive();
    const executionTime = Date.now() - startTime;

    console.log(`✓ Query executed in ${executionTime}ms`);
    console.log(`✓ Found ${fandoms.length} active fandoms\n`);

    fandoms.forEach(fandom => {
      console.log(`Fandom #${fandom.id}:`);
      console.log(`  Name: ${fandom.name}`);
      console.log(`  Slug: ${fandom.slug}`);
      console.log(`  Active: ${fandom.is_active}`);
      console.log();
    });

    // Simulate API response format
    const response = {
      fandoms: fandoms.map(fandom => ({
        id: fandom.id,
        name: fandom.name,
        slug: fandom.slug,
        description: fandom.description,
        storyCount: 0,
        tagCount: 0,
        plotBlockCount: 0,
        isActive: fandom.is_active,
        lastUpdated: fandom.updated_at,
      })),
      metadata: {
        total: fandoms.length,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('\nAPI Response Preview:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error testing fandoms API:');
    console.error(error);
    process.exit(1);
  }
}

testFandomsAPI();
