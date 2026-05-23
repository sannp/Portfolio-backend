/**
 * Manual Test Script for Recruiter Chatbot
 * Tests the resume information API and RAG functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/resume-information`;

// Sample resume data for testing
const sampleResume = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  linkedin: 'https://linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
  notice_period: '2 weeks',
  current_location: 'San Francisco, CA',
  preferred_location: 'Remote',
  expected_salary: '$120,000 - $150,000',
  summary: 'Senior Software Engineer with 8+ years of experience in full-stack development, specializing in React, Node.js, and cloud architecture. Passionate about building scalable applications and mentoring junior developers.',
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      duration: '2020 - Present',
      description: 'Led development of microservices architecture',
      responsibilities: [
        'Designed and implemented RESTful APIs',
        'Mentored team of 5 junior developers',
        'Improved system performance by 40%'
      ],
      achievements: [
        'Reduced deployment time by 60%',
        'Led migration to AWS infrastructure'
      ]
    },
    {
      title: 'Software Engineer',
      company: 'Startup Inc',
      duration: '2017 - 2020',
      description: 'Full-stack development for e-commerce platform',
      responsibilities: [
        'Developed React components and Node.js services',
        'Implemented CI/CD pipelines',
        'Collaborated with UX team on feature design'
      ],
      achievements: [
        'Launched MVP in 6 months',
        'Integrated payment processing system'
      ]
    }
  ],
  education: [
    {
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduationYear: '2017',
      gpa: '3.8',
      coursework: ['Data Structures', 'Algorithms', 'Database Systems', 'Machine Learning']
    }
  ],
  skills: {
    programming: ['JavaScript', 'TypeScript', 'Python', 'Java'],
    frameworks: ['React', 'Node.js', 'Express', 'Spring Boot'],
    databases: ['PostgreSQL', 'MongoDB', 'Redis'],
    cloud: ['AWS', 'Docker', 'Kubernetes'],
    tools: ['Git', 'Jenkins', 'Jira']
  },
  projects: [
    {
      name: 'E-commerce Platform',
      description: 'Full-stack e-commerce solution with real-time inventory management',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis'],
      role: 'Lead Developer',
      duration: '8 months',
      outcomes: [
        'Processed $1M+ in transactions',
        'Handled 10k+ daily active users'
      ]
    },
    {
      name: 'Task Management App',
      description: 'Collaborative task management tool with real-time updates',
      technologies: ['React', 'Socket.io', 'MongoDB'],
      role: 'Full-stack Developer',
      duration: '4 months',
      outcomes: [
        '500+ active users',
        '99.9% uptime'
      ]
    }
  ]
};

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testCreateResume() {
  console.log('\n=== Testing Resume Creation ===');
  try {
    const response = await axios.post(API_URL, sampleResume);
    console.log('✅ Resume created/updated successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data.data.id;
  } catch (error) {
    console.log('❌ Resume creation failed:', error.message);
    if (error.response) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function testGetResume() {
  console.log('\n=== Testing Get Resume ===');
  try {
    const response = await axios.get(API_URL);
    console.log('✅ Resume retrieved successfully');
    console.log('Resume:', JSON.stringify(response.data.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Get resume failed:', error.message);
    return false;
  }
}

async function testPatchResume() {
  console.log('\n=== Testing Resume Patch ===');
  try {
    const updates = {
      notice_period: '1 month',
      expected_salary: '$130,000 - $160,000'
    };
    const response = await axios.patch(API_URL, updates);
    console.log('✅ Resume patched successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Resume patch failed:', error.message);
    return false;
  }
}

async function testDeleteResume() {
  console.log('\n=== Testing Resume Delete ===');
  try {
    const response = await axios.delete(API_URL);
    console.log('✅ Resume deleted successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Resume delete failed:', error.message);
    return false;
  }
}

async function testChunkingService() {
  console.log('\n=== Testing Chunking Service ===');
  try {
    const chunkingService = require('../../src/api/projects/portfolio/services/chunkingService');
    const chunks = chunkingService.chunkResume(sampleResume);
    console.log(`✅ Chunking service generated ${chunks.length} chunks`);
    
    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1} [${chunk.type}]: ${chunk.text.substring(0, 100)}...`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ Chunking service test failed:', error.message);
    return false;
  }
}

async function testGuardrailService() {
  console.log('\n=== Testing Guardrail Service ===');
  try {
    const guardrailService = require('../../src/api/projects/portfolio/services/guardrailService');
    
    // Test allowed question
    const allowedQuestion = 'What is the candidate\'s experience with React?';
    const allowedResult = await guardrailService.checkQuestion(allowedQuestion);
    console.log(`✅ Allowed question test: ${allowedResult.isAllowed ? 'PASS' : 'FAIL'}`);
    
    // Test blocked question
    const blockedQuestion = 'What is the candidate\'s family status?';
    const blockedResult = await guardrailService.checkQuestion(blockedQuestion);
    console.log(`✅ Blocked question test: ${!blockedResult.isAllowed ? 'PASS' : 'FAIL'}`);
    
    return true;
  } catch (error) {
    console.log('❌ Guardrail service test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Recruiter Chatbot Manual Tests\n');
  console.log('⚠️  Make sure PostgreSQL is configured with pgvector extension\n');

  const results = {
    chunkingService: await testChunkingService(),
    guardrailService: await testGuardrailService()
  };

  console.log('\n=== Test Summary ===');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${test}: ${result ? '✅ PASS' : '❌ FAIL'}`);
  });

  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  console.log(`\nTotal: ${passCount}/${totalCount} tests passed`);
}

// Run tests
runTests().catch(console.error);
