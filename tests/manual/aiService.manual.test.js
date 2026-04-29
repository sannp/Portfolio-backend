require('dotenv').config();

const aiService = require('../../src/services/aiService');

async function runTests() {
  console.log('🧪 Manual AI Service Tests\n');
  console.log('=' .repeat(50));

  let passed = 0;
  let failed = 0;

  // Test 1: Check Availability
  console.log('\n📡 Test 1: checkAvailability()');
  try {
    const availability = await aiService.checkAvailability();
    console.log('✅ Availability check completed');
    console.log('   Overall Available:', availability.overallAvailable);
    console.log('   Default Provider:', availability.defaultProvider);
    console.log('   Provider Status:');
    Object.entries(availability.providers).forEach(([name, status]) => {
      const icon = status.available ? '🟢' : '🔴';
      console.log(`     ${icon} ${name}: ${status.available ? 'Available' : 'Unavailable'}`);
      if (status.error) console.log(`        Error: ${status.error}`);
    });
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 2: Get Available Providers
  console.log('\n📋 Test 2: getAvailableProviders()');
  try {
    const providers = aiService.getAvailableProviders();
    console.log('✅ Providers:', providers.join(', '));
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 3: Get All Provider Models
  console.log('\n🔧 Test 3: getAllProviderModels()');
  try {
    const models = aiService.getAllProviderModels();
    console.log('✅ Available models:');
    Object.entries(models).forEach(([provider, modelList]) => {
      console.log(`   ${provider}: ${modelList.join(', ')}`);
    });
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 4: Generate Text
  console.log('\n✍️  Test 4: generateText()');
  try {
    const result = await aiService.generateText('Say "hello" in exactly one word', {
      maxTokens: 10,
      temperature: 0.3
    });
    console.log('✅ Text generated successfully');
    console.log('   Provider:', result.provider);
    console.log('   Model:', result.model);
    console.log('   Content:', result.data.content?.substring(0, 100));
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 5: Generate Text with specific provider
  console.log('\n✍️  Test 5: generateText() with specific provider (openai)');
  try {
    const result = await aiService.generateText('Say "hi" in one word', {
      provider: 'openai',
      maxTokens: 10
    });
    console.log('✅ Text generated with OpenAI');
    console.log('   Provider:', result.provider);
    console.log('   Content:', result.data.content?.substring(0, 100));
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 6: Chat
  console.log('\n💬 Test 6: chat()');
  try {
    const messages = [
      { role: 'user', content: 'What is 2+2? Answer in one word.' }
    ];
    const result = await aiService.chat(messages, { maxTokens: 10 });
    console.log('✅ Chat response received');
    console.log('   Provider:', result.provider);
    console.log('   Response:', result.data.content?.substring(0, 100));
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 7: Embeddings
  console.log('\n🔢 Test 7: embedText()');
  try {
    const result = await aiService.embedText('Hello world', { provider: 'openai' });
    console.log('✅ Embedding generated');
    console.log('   Provider:', result.provider);
    console.log('   Embedding length:', result.data.embedding?.length);
    console.log('   Model:', result.data.model);
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Test 8: Text Analysis
  console.log('\n📊 Test 8: analyzeText()');
  try {
    const result = await aiService.analyzeText('I love this amazing product!', {
      maxTokens: 100
    });
    console.log('✅ Text analyzed');
    console.log('   Provider:', result.provider);
    console.log('   Result:', JSON.stringify(result.data).substring(0, 200));
    passed++;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
