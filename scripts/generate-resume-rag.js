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
const Projects = require('../models/Projects');
const chunkingService = require('../src/api/projects/personal/services/chunkingService');
const embeddingService = require('../src/api/projects/personal/services/embeddingService');

// Load schema SQL
const schemaSQL = fs.readFileSync('./src/api/projects/personal/database/schema.sql', 'utf8');

// PDF file path - update this to your resume PDF location
const PDF_FILE_PATH = './scripts/resume_full.pdf';

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
    const systemPrompt = `You are an expert in parsing resumes and extracting relevant information. Your task is to read through the provided resume text extracted from a PDF, identify key pieces of information, and organize them into the specified structured data format.

The output should be a JSON object with the following fields:
- 'name': String
- 'email': String
- 'phone': String
- 'linkedin': String
- 'github': String
- 'summary': String
- 'experience': An array of objects, each containing:
  - 'title': String
  - 'company': String
  - 'duration': String (e.g. 'Oct 2020 - Present' or 'Jan 2018 - Sep 2020')
  - 'description': String (a summary of what they did in this role)
  - 'responsibilities': Array of Strings (key tasks and responsibilities)
  - 'achievements': Array of Strings (major achievements and contributions)
- 'education': An array of objects, each containing:
  - 'degree': String
  - 'institution': String (name of the school/university)
  - 'field': String (field of study)
  - 'graduationYear': String or Number (year of graduation)
  - 'gpa': String or Number
  - 'coursework': Array of Strings (relevant courses/subjects)
- 'skills': An object where keys are skill categories (e.g. 'Languages', 'Frontend', 'Backend', 'Tools') and values are arrays of strings listing the specific skills in that category.
- 'projects': An array of objects, each containing:
  - 'name': String
  - 'description': String
  - 'technologies': Array of Strings (tools and tech stack used)
  - 'role': String
  - 'duration': String
  - 'outcomes': Array of Strings (key achievements or outcomes of the project)

Ensure that all extracted information is accurate and relevant to the resume content. If certain fields are not present in the resume, include them with empty values or appropriate placeholders. Return ONLY valid JSON, no markdown formatting.`;

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
    
    // Add notice period
    structuredData.notice_period = '30 days';
    
    // Add total experience information to the summary as requested
    if (structuredData.summary) {
      structuredData.summary = `Total Experience: 6 years. ${structuredData.summary}`;
    } else {
      structuredData.summary = `Total Experience: 6 years.`;
    }
    
    return structuredData;
  } catch (error) {
    console.error('Error parsing resume text:', error.message);
    throw error;
  }
}

/**
 * Clear old resume data
 */
async function clearOldData() {
  try {
    const pool = dbManager.getPostgresConnection();
    if (!pool) {
      throw new Error('PostgreSQL connection not available');
    }

    console.log('🗑️  Clearing old resume data...');

    // Delete all resume chunks first (due to foreign key constraint)
    try {
      await pool.query('DELETE FROM resume_chunks');
    } catch (error) {
      console.warn('Warning clearing chunks (table may not exist):', error.message);
    }

    // Delete all resumes
    const result = await pool.query('DELETE FROM resumes');
    console.log(`✅ Cleared ${result.rowCount} resume(s)\n`);
  } catch (error) {
    console.error('❌ Error clearing old data:', error.message);
    throw error;
  }
}

/**
 * Initialize database schema
 */
async function initializeDatabaseSchema() {
  try {
    const pool = dbManager.getPostgresConnection();
    if (!pool) {
      throw new Error('PostgreSQL connection not available');
    }

    console.log('🔧 Initializing database schema...');
    
    // Execute the entire schema file at once
    try {
      await pool.query(schemaSQL);
    } catch (error) {
      console.warn('Schema warning:', error.message);
      console.warn('Schema error details:', error);
    }

    console.log('✅ Database schema initialized\n');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
    console.error('Error details:', error);
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
    const pool = dbManager.getPostgresConnection();
    if (!pool) {
      throw new Error('PostgreSQL connection not available');
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

    // Clear old data
    await clearOldData();

    // Step 1: Extract text from PDF
    console.log('📖 Extracting text from PDF...');
    const text = await extractTextFromPDF(filePath);
    console.log(`✅ Text extracted (${text.length} characters)`);
    console.log(`Preview: ${text.substring(0, 200)}...\n`);

    // Step 2: Parse text into structured resume data
    console.log('🤖 Parsing resume text with AI...');
    const structuredData = await parseResumeText(text);
    console.log('✅ Resume parsed successfully');

    // Fetch projects from MongoDB and append to structuredData
    console.log('📚 Fetching projects from MongoDB...');
    try {
      const mongoProjects = await Projects.find({ type: 'project' }).sort({ createdDate: -1 });
      if (!structuredData.projects) {
        structuredData.projects = [];
      }
      
      const formattedMongoProjects = mongoProjects.map(p => ({
        name: p.title,
        description: p.description,
        technologies: p.badges || [],
        role: "Developer / Creator",
        duration: p.createdDate ? new Date(p.createdDate).getFullYear().toString() : "N/A",
        outcomes: []
      }));
      
      structuredData.projects = [...structuredData.projects, ...formattedMongoProjects];
      console.log(`✅ Appended ${formattedMongoProjects.length} projects from MongoDB`);
    } catch (err) {
      console.warn('⚠️ Could not fetch projects from MongoDB:', err.message);
    }

    console.log(`Name: ${structuredData.name || 'N/A'}`);
    console.log(`Email: ${structuredData.email || 'N/A'}`);
    console.log(`Experience: ${structuredData.experience?.length || 0} entries`);
    console.log(`Education: ${structuredData.education?.length || 0} entries`);
    console.log(`Skills: ${Object.values(structuredData.skills || {}).reduce((acc, curr) => acc + (curr.length || 0), 0)} skills`);
    console.log(`Projects: ${structuredData.projects?.length || 0} entries\n`);

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
