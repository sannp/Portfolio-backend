#!/usr/bin/env node

/**
 * Local script to process a PDF resume file and directly update database
 * Usage: node scripts/upload-resume-pdf.js
 */

// Load environment variables BEFORE any imports
require('dotenv').config();

const fs = require('fs');
const pdfParse = require('pdf-parse');
const aiService = require('../src/services/aiService');
const dbManager = require('../src/database/dbConfig');
const chunkingService = require('../src/api/projects/portfolio/services/chunkingService');
const embeddingService = require('../src/api/projects/portfolio/services/embeddingService');

// Load schema SQL
const schemaSQL = fs.readFileSync('./src/api/projects/portfolio/database/schema.sql', 'utf8');

// PDF file path - update this to your resume PDF location
const PDF_FILE_PATH = './scripts/resume.pdf';

/**
 * Extract text from PDF file
 * @param {String} filePath - Path to PDF file
 * @returns {Promise<String>} Extracted text
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error.message);
    throw error;
  }
}

/**
 * Parse resume text into structured data using AI
 * @param {String} resumeText - Raw text extracted from PDF
 * @returns {Promise<Object>} Structured resume data
 */
async function parseResumeText(resumeText) {
  try {
    const systemPrompt = `You are an expert in parsing resumes and extracting relevant information. Your task is to read through the provided resume text extracted from a PDF, identify key pieces of information, and organize them into the specified structured data format. The output should be a JSON object with the following fields: 'name', 'email', 'phone', 'linkedin', 'github', 'summary', 'experience' (an array of objects each containing 'title', 'company', 'start_date', 'end_date'), 'education' (an array of objects each containing 'degree', 'university', 'start_year', 'end_year'), 'skills' (an array), and 'projects' (an array of objects with 'name' and 'description'). Ensure that all extracted information is accurate and relevant to the resume content. If certain fields are not present in the resume, include them with empty values or appropriate placeholders. Return ONLY valid JSON, no markdown formatting.`;

    const userPrompt = `Parse the following resume text and extract structured data:\n\n${resumeText}`;

    const result = await aiService.chat([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ], {
      provider: 'gemini',
      fallback: true,
      maxTokens: 8000
    });

    if (!result.success) {
      throw new Error('AI parsing failed');
    }

    const aiResponse = result.data.response || result.data.content || result.data.message;
    
    // Parse JSON response - handle markdown code blocks
    let jsonString = aiResponse;
    
    // Remove markdown code blocks if present
    if (jsonString.includes('```json')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.replace(/```\n?/g, '');
    }
    
    const structuredData = JSON.parse(jsonString);
    
    return structuredData;
  } catch (error) {
    console.error('Error parsing resume text:', error.message);
    throw error;
  }
}

/**
 * Initialize database schema
 */
async function initializeDatabaseSchema() {
  try {
    const pool = dbManager.getPortfolioPostgresConnection();
    if (!pool) {
      throw new Error('Portfolio PostgreSQL connection not available');
    }

    console.log('🔧 Initializing database schema...');
    
    // Execute the entire schema file at once
    try {
      await pool.query(schemaSQL);
    } catch (error) {
      // Ignore errors for IF NOT EXISTS statements
      if (!error.message.includes('already exists')) {
        console.warn('Schema warning:', error.message);
      }
    }

    console.log('✅ Database schema initialized\n');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
    throw error;
  }
}

/**
 * Save structured data to database and generate RAG embeddings
 * @param {Object} structuredData - Parsed resume data
 * @returns {Promise<Object>} Result with resume ID and embedding stats
 */
async function saveToDatabase(structuredData) {
  try {
    const pool = dbManager.getPortfolioPostgresConnection();
    if (!pool) {
      throw new Error('Portfolio PostgreSQL connection not available');
    }

    // Check if resume exists
    const existingQuery = 'SELECT * FROM resumes ORDER BY updated_at DESC LIMIT 1';
    const existingResult = await pool.query(existingQuery);

    let resumeId;

    if (existingResult.rows.length > 0) {
      // Update existing resume
      resumeId = existingResult.rows[0].id;

      const updateQuery = `
        UPDATE resumes
        SET name = $1, email = $2, phone = $3, linkedin = $4, github = $5,
            notice_period = $6, current_location = $7, preferred_location = $8,
            expected_salary = $9, summary = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
      `;

      const values = [
        structuredData.name || null,
        structuredData.email || null,
        structuredData.phone || null,
        structuredData.linkedin ? (structuredData.linkedin.startsWith('http') ? structuredData.linkedin : `https://${structuredData.linkedin}`) : null,
        structuredData.github ? (structuredData.github.startsWith('http') ? structuredData.github : `https://${structuredData.github}`) : null,
        structuredData.notice_period || null,
        structuredData.current_location || null,
        structuredData.preferred_location || null,
        structuredData.expected_salary || null,
        structuredData.summary || null,
        resumeId
      ];

      await pool.query(updateQuery, values);
    } else {
      // Create new resume
      const insertQuery = `
        INSERT INTO resumes (name, email, phone, linkedin, github, notice_period,
                            current_location, preferred_location, expected_salary, summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        structuredData.name || null,
        structuredData.email || null,
        structuredData.phone || null,
        structuredData.linkedin ? (structuredData.linkedin.startsWith('http') ? structuredData.linkedin : `https://${structuredData.linkedin}`) : null,
        structuredData.github ? (structuredData.github.startsWith('http') ? structuredData.github : `https://${structuredData.github}`) : null,
        structuredData.notice_period || null,
        structuredData.current_location || null,
        structuredData.preferred_location || null,
        structuredData.expected_salary || null,
        structuredData.summary || null
      ];

      const insertResult = await pool.query(insertQuery, values);
      resumeId = insertResult.rows[0].id;
    }

    // Chunk and embed resume data
    const chunks = chunkingService.chunkResume(structuredData);
    const processedChunks = chunkingService.splitLargeChunks(chunks);

    const embeddingResult = await embeddingService.generateAndStoreEmbeddings(resumeId, processedChunks);

    return {
      resumeId,
      embeddingResult
    };
  } catch (error) {
    console.error('Error saving to database:', error.message);
    throw error;
  }
}

/**
 * Main function to process resume
 * @param {String} filePath - Path to PDF file
 */
async function processResume(filePath) {
  try {
    console.log('📄 Processing resume PDF...');

    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await dbManager.initialize();
    console.log('✅ Database connected\n');

    // Initialize database schema
    await initializeDatabaseSchema();

    // Step 1: Extract text from PDF
    console.log('📖 Extracting text from PDF...');
    const text = await extractTextFromPDF(filePath);
    console.log(`✅ Text extracted (${text.length} characters)`);
    console.log(`Preview: ${text.substring(0, 200)}...\n`);

    // Step 2: Parse text into structured resume data
    console.log('🤖 Parsing resume text with AI...');
    const structuredData = await parseResumeText(text);
    console.log('✅ Resume parsed successfully');
    console.log(`Name: ${structuredData.name || 'N/A'}`);
    console.log(`Email: ${structuredData.email || 'N/A'}`);
    console.log(`Experience: ${structuredData.experience?.length || 0} entries`);
    console.log(`Education: ${structuredData.education?.length || 0} entries`);
    console.log(`Skills: ${structuredData.skills?.length || 0} skills\n`);

    // Step 3: Save to database and generate RAG embeddings
    console.log('� Saving to database and generating RAG embeddings...');
    const result = await saveToDatabase(structuredData);
    console.log('✅ Resume saved successfully');
    console.log(`Resume ID: ${result.resumeId}`);
    console.log(`Embeddings: ${result.embeddingResult.processed} chunks processed, ${result.embeddingResult.failed} failed\n`);

    // Close database connection
    await dbManager.closeAll();
    console.log('🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Error processing resume:', error.message);
    await dbManager.closeAll();
    process.exit(1);
  }
}

// Entry point
const pdfFilePath = PDF_FILE_PATH;

// Check if file exists
if (!fs.existsSync(pdfFilePath)) {
  console.error(`❌ File not found: ${pdfFilePath}`);
  console.log('Please update PDF_FILE_PATH in the script to your resume PDF location');
  process.exit(1);
}

// Check if file is a PDF
if (!pdfFilePath.toLowerCase().endsWith('.pdf')) {
  console.error('❌ File must be a PDF');
  process.exit(1);
}

processResume(pdfFilePath);
