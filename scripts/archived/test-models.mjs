import {
  FandomModel,
  TagModel,
  PlotBlockModel,
} from '../../src/lib/database/models/index.js';

async function testModels() {
  console.log('\n=== Testing Model Fixes ===\n');

  try {
    // Get Harry Potter by slug
    console.log('1. Getting Harry Potter fandom by slug...');
    const fandom = await FandomModel.getBySlug('harry-potter');
    console.log(
      `   Found: ${fandom?.name} (ID: ${
        fandom?.id
      }, Type: ${typeof fandom?.id})`
    );

    if (!fandom) {
      console.log('   ERROR: Fandom not found!');
      return;
    }

    // Get tags for Harry Potter
    console.log('\n2. Getting tags for Harry Potter...');
    const tags = await TagModel.getByFandom(fandom.id);
    console.log(`   Found: ${tags.length} tags`);
    if (tags.length > 0) {
      console.log(`   First tag: ${tags[0].name}`);
    }

    // Get tropes for Harry Potter
    console.log('\n3. Getting tropes for Harry Potter...');
    const tropes = await PlotBlockModel.getRootBlocks(fandom.id);
    console.log(`   Found: ${tropes.length} tropes`);
    if (tropes.length > 0) {
      console.log(`   First trope: ${tropes[0].name}`);
    }

    console.log('\n✅ All model tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testModels();
