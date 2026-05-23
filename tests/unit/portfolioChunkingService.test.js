/**
 * Unit tests for Chunking Service
 * Tests resume data chunking functionality
 */

const chunkingService = require('../../src/api/projects/portfolio/services/chunkingService');

describe('ChunkingService', () => {
  describe('chunkResume', () => {
    test('should chunk complete resume data', () => {
      const resumeData = {
        name: 'John Doe',
        summary: 'Senior Software Engineer with 5 years of experience',
        experience: [
          {
            title: 'Senior Developer',
            company: 'Tech Corp',
            duration: '2020-Present',
            description: 'Led development of microservices'
          }
        ],
        education: [
          {
            institution: 'University of California',
            degree: 'Bachelor of Science',
            field: 'Computer Science'
          }
        ],
        skills: {
          programming: ['JavaScript', 'Python'],
          frameworks: ['React', 'Node.js']
        },
        projects: [
          {
            name: 'E-commerce Platform',
            description: 'Full-stack e-commerce solution',
            technologies: ['React', 'Node.js']
          }
        ]
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(5); // summary, experience, education, skills, projects
      expect(chunks[0].type).toBe('summary');
      expect(chunks[1].type).toBe('experience');
      expect(chunks[2].type).toBe('education');
      expect(chunks[3].type).toBe('skills');
      expect(chunks[4].type).toBe('project');
    });

    test('should handle partial resume data', () => {
      const resumeData = {
        name: 'Jane Smith',
        summary: 'Software Engineer',
        experience: [
          {
            title: 'Developer',
            company: 'Startup Inc'
          }
        ]
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(2); // summary, experience
      expect(chunks[0].type).toBe('summary');
      expect(chunks[1].type).toBe('experience');
    });

    test('should handle empty resume data', () => {
      const resumeData = {
        name: 'Test User'
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(0);
    });

    test('should handle null and undefined values gracefully', () => {
      const resumeData = {
        name: 'Test User',
        experience: null,
        education: undefined,
        skills: null
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(0);
    });

    test('should preserve metadata in chunks', () => {
      const resumeData = {
        name: 'John Doe',
        experience: [
          {
            title: 'Senior Developer',
            company: 'Tech Corp',
            duration: '2020-Present'
          }
        ]
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks[0].metadata).toHaveProperty('source');
      expect(chunks[0].metadata).toHaveProperty('company');
      expect(chunks[0].metadata).toHaveProperty('title');
    });
  });

  describe('_formatExperienceChunk', () => {
    test('should format complete experience entry', () => {
      const exp = {
        title: 'Senior Developer',
        company: 'Tech Corp',
        duration: '2020-Present',
        description: 'Led development of microservices',
        responsibilities: ['Team leadership', 'Code review'],
        achievements: ['Reduced latency by 50%']
      };

      const result = chunkingService._formatExperienceChunk(exp);

      expect(result).toContain('Senior Developer at Tech Corp');
      expect(result).toContain('Duration: 2020-Present');
      expect(result).toContain('Led development of microservices');
      expect(result).toContain('Key responsibilities:');
      expect(result).toContain('Key achievements:');
    });

    test('should handle minimal experience data', () => {
      const exp = {
        title: 'Developer',
        company: 'Startup Inc'
      };

      const result = chunkingService._formatExperienceChunk(exp);

      expect(result).toContain('Developer at Startup Inc');
    });

    test('should return null for empty experience', () => {
      const result = chunkingService._formatExperienceChunk({});

      expect(result).toBeNull();
    });
  });

  describe('_formatEducationChunk', () => {
    test('should format complete education entry', () => {
      const edu = {
        institution: 'University of California',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationYear: '2020',
        gpa: '3.8',
        coursework: ['Data Structures', 'Algorithms']
      };

      const result = chunkingService._formatEducationChunk(edu);

      expect(result).toContain('Bachelor of Science from University of California');
      expect(result).toContain('Field of study: Computer Science');
      expect(result).toContain('Graduated: 2020');
      expect(result).toContain('GPA: 3.8');
      expect(result).toContain('Relevant coursework:');
    });

    test('should handle minimal education data', () => {
      const edu = {
        institution: 'MIT',
        degree: 'Master of Science'
      };

      const result = chunkingService._formatEducationChunk(edu);

      expect(result).toContain('Master of Science from MIT');
    });
  });

  describe('_formatSkillsChunk', () => {
    test('should format skills as string', () => {
      const skills = 'JavaScript, Python, React, Node.js';

      const result = chunkingService._formatSkillsChunk(skills);

      expect(result).toBe('JavaScript, Python, React, Node.js');
    });

    test('should format skills as object with arrays', () => {
      const skills = {
        programming: ['JavaScript', 'Python'],
        frameworks: ['React', 'Node.js'],
        databases: ['PostgreSQL', 'MongoDB']
      };

      const result = chunkingService._formatSkillsChunk(skills);

      expect(result).toContain('programming:');
      expect(result).toContain('frameworks:');
      expect(result).toContain('databases:');
    });

    test('should handle skills as object with strings', () => {
      const skills = {
        languages: 'JavaScript, Python',
        tools: 'Git, Docker'
      };

      const result = chunkingService._formatSkillsChunk(skills);

      expect(result).toContain('languages:');
      expect(result).toContain('tools:');
    });

    test('should return null for empty skills', () => {
      const result = chunkingService._formatSkillsChunk({});

      expect(result).toBeNull();
    });
  });

  describe('_formatProjectChunk', () => {
    test('should format complete project entry', () => {
      const project = {
        name: 'E-commerce Platform',
        description: 'Full-stack e-commerce solution',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        role: 'Lead Developer',
        duration: '6 months',
        outcomes: ['Launched successfully', '1000+ users']
      };

      const result = chunkingService._formatProjectChunk(project);

      expect(result).toContain('Project: E-commerce Platform');
      expect(result).toContain('Technologies: React, Node.js, PostgreSQL');
      expect(result).toContain('Role: Lead Developer');
      expect(result).toContain('Duration: 6 months');
      expect(result).toContain('Outcomes:');
    });

    test('should handle minimal project data', () => {
      const project = {
        name: 'Task Manager',
        description: 'Productivity app'
      };

      const result = chunkingService._formatProjectChunk(project);

      expect(result).toContain('Project: Task Manager');
      expect(result).toContain('Productivity app');
    });
  });

  describe('_estimateTokens', () => {
    test('should estimate tokens accurately for short text', () => {
      const text = 'Hello world';
      const result = chunkingService._estimateTokens(text);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10);
    });

    test('should estimate tokens for longer text', () => {
      const text = 'This is a longer text that should have more tokens estimated based on the character count divided by four.';
      const result = chunkingService._estimateTokens(text);

      expect(result).toBeGreaterThan(5);
    });

    test('should return 0 for empty string', () => {
      const result = chunkingService._estimateTokens('');

      expect(result).toBe(0);
    });
  });

  describe('splitLargeChunks', () => {
    test('should not split chunks within token limit', () => {
      const chunks = [
        { text: 'This is a normal chunk', type: 'summary', metadata: {} }
      ];

      const result = chunkingService.splitLargeChunks(chunks, 300);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(chunks[0].text);
    });

    test('should split large chunks by sentences', () => {
      const largeText = 'This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.';
      const chunks = [
        { text: largeText.repeat(10), type: 'summary', metadata: {} }
      ];

      const result = chunkingService.splitLargeChunks(chunks, 50);

      expect(result.length).toBeGreaterThan(1);
    });

    test('should preserve metadata in split chunks', () => {
      const largeText = 'First sentence. Second sentence. Third sentence.';
      const chunks = [
        { text: largeText.repeat(20), type: 'experience', metadata: { company: 'Tech Corp' } }
      ];

      const result = chunkingService.splitLargeChunks(chunks, 50);

      result.forEach(chunk => {
        expect(chunk.metadata).toHaveProperty('company');
        expect(chunk.metadata.company).toBe('Tech Corp');
      });
    });

    test('should handle empty chunks array', () => {
      const result = chunkingService.splitLargeChunks([], 300);

      expect(result).toHaveLength(0);
    });

    test('should respect custom maxTokens parameter', () => {
      const chunks = [
        { text: 'This is a test chunk with moderate length', type: 'summary', metadata: {} }
      ];

      const result = chunkingService.splitLargeChunks(chunks, 10);

      // With very low maxTokens, it should split
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle resume with null fields', () => {
      const resumeData = {
        name: 'Test User',
        experience: null,
        education: null,
        skills: null,
        projects: null
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(0);
    });

    test('should handle resume with empty arrays', () => {
      const resumeData = {
        name: 'Test User',
        experience: [],
        education: [],
        skills: {},
        projects: []
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(0);
    });

    test('should handle very long text in description', () => {
      const resumeData = {
        name: 'Test User',
        summary: 'A'.repeat(10000) // Very long summary
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toHaveLength(10000);
    });

    test('should handle special characters in text', () => {
      const resumeData = {
        name: 'Test User',
        summary: 'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?/~`'
      };

      const chunks = chunkingService.chunkResume(resumeData);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toContain('Special chars:');
    });
  });
});
