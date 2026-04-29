require('dotenv').config();

const request = require('supertest');
const { app, initializeApp } = require('../../src/app');

const API_SECRET = process.env.API_SECRET || 'test-secret';
const BASE_URL = '/api/v1/ai';

async function runTests() {
  console.log('🌐 Manual AI Routes Tests\n');
  console.log('=' .repeat(50));
  console.log(`API Secret: ${API_SECRET ? '✅ Set' : '❌ Not set'}`);

  let passed = 0;
  let failed = 0;

  // Initialize app (database connections)
  try {
    await initializeApp();
    console.log('✅ Database initialized');
  } catch (error) {
    console.log('⚠️  Database init failed (may be optional):', error.message);
  }

  // Test 1: Providers endpoint without auth
  console.log('\n🔓 Test 1: GET /providers without auth');
  try {
    const response = await request(app)
      .get(`${BASE_URL}/providers`);
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected without auth (401)');
      passed++;
    } else {
      console.log('❌ Expected 401, got', response.status);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 2: Providers endpoint with auth
  console.log('\n🔐 Test 2: GET /providers with auth');
  try {
    const response = await request(app)
      .get(`${BASE_URL}/providers`)
      .set('X-API-Secret', API_SECRET);
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Successfully retrieved providers');
      console.log('   Providers:', response.body.data.providers.map(p => p.name).join(', '));
      console.log('   Priority:', response.body.data.priority.join(', '));
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 3: Availability endpoint
  console.log('\n📡 Test 3: GET /availability with auth');
  try {
    const response = await request(app)
      .get(`${BASE_URL}/availability`)
      .set('X-API-Secret', API_SECRET);
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Availability check completed');
      console.log('   Overall Available:', response.body.data.available);
      console.log('   Providers:');
      response.body.data.providers.forEach(p => {
        const icon = p.available ? '🟢' : '🔴';
        console.log(`     ${icon} ${p.name}: ${p.available ? 'Available' : 'Unavailable'}`);
      });
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 4: Generate endpoint without body
  console.log('\n⚠️  Test 4: POST /generate without prompt');
  try {
    const response = await request(app)
      .post(`${BASE_URL}/generate`)
      .set('X-API-Secret', API_SECRET)
      .send({});
    
    if (response.status === 400) {
      console.log('✅ Correctly rejected missing prompt (400)');
      console.log('   Message:', response.body.message);
      passed++;
    } else {
      console.log('❌ Expected 400, got', response.status);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 5: Generate endpoint with valid data
  console.log('\n✍️  Test 5: POST /generate with prompt');
  try {
    const response = await request(app)
      .post(`${BASE_URL}/generate`)
      .set('X-API-Secret', API_SECRET)
      .send({
        prompt: 'Say "hello" in exactly one word',
        maxTokens: 10,
        temperature: 0.3
      });
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Text generated successfully');
      console.log('   Provider:', response.body.data.provider);
      console.log('   Model:', response.body.data.model);
      console.log('   Content:', response.body.data.data.content?.substring(0, 100));
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 6: Generate with specific provider
  console.log('\n✍️  Test 6: POST /generate with specific provider (openai)');
  try {
    const response = await request(app)
      .post(`${BASE_URL}/generate`)
      .set('X-API-Secret', API_SECRET)
      .send({
        prompt: 'Say "hi" in one word',
        provider: 'openai',
        maxTokens: 10
      });
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Text generated with OpenAI');
      console.log('   Provider:', response.body.data.provider);
      console.log('   Content:', response.body.data.data.content?.substring(0, 100));
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 7: Chat endpoint
  console.log('\n💬 Test 7: POST /chat with messages');
  try {
    const response = await request(app)
      .post(`${BASE_URL}/chat`)
      .set('X-API-Secret', API_SECRET)
      .send({
        messages: [{ role: 'user', content: 'What is 2+2? Answer in one word.' }],
        maxTokens: 10
      });
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Chat response received');
      console.log('   Provider:', response.body.data.provider);
      console.log('   Response:', response.body.data.data.content?.substring(0, 100));
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 8: Embed endpoint
  console.log('\n🔢 Test 8: POST /embed with text');
  try {
    const response = await request(app)
      .post(`${BASE_URL}/embed`)
      .set('X-API-Secret', API_SECRET)
      .send({
        text: 'Hello world',
        provider: 'openai'
      });
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Embedding generated');
      console.log('   Provider:', response.body.data.provider);
      console.log('   Embedding length:', response.body.data.data.embedding?.length);
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Test 9: Analyze endpoint
  console.log('\n📊 Test 9: POST /analyze with text');
  try {
    const response = await request(app)
      .post(`${BASE_URL}/analyze`)
      .set('X-API-Secret', API_SECRET)
      .send({
        text: 'I love this amazing product!'
      });
    
    if (response.status === 200 && response.body.success) {
      console.log('✅ Text analyzed');
      console.log('   Provider:', response.body.data.provider);
      console.log('   Result:', JSON.stringify(response.body.data.data).substring(0, 200));
      passed++;
    } else {
      console.log('❌ Unexpected response:', response.status, response.body);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All route tests passed!' : '\n⚠️  Some tests failed');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
