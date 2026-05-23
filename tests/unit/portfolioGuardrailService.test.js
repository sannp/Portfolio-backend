/**
 * Unit tests for Guardrail Service
 * Tests out-of-scope question detection and PII filtering
 */

const guardrailService = require('../../src/api/projects/portfolio/services/guardrailService');

describe('GuardrailService', () => {
  describe('checkQuestion', () => {
    describe('Allowed professional questions', () => {
      test('should allow questions about experience', async () => {
        const question = 'How many years of experience do you have in software development?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBeNull();
      });

      test('should allow questions about skills', async () => {
        const question = 'What programming languages are you proficient in?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBeNull();
      });

      test('should allow questions about education', async () => {
        const question = 'What degree did you obtain from university?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBeNull();
      });

      test('should allow questions about projects', async () => {
        const question = 'Can you tell me about your recent projects?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBeNull();
      });

      test('should allow questions about job responsibilities', async () => {
        const question = 'What were your key responsibilities in your last role?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBeNull();
      });
    });

    describe('Blocked personal life questions', () => {
      test('should block questions about family', async () => {
        const question = 'Tell me about your family';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('personal');
      });

      test('should block questions about marriage', async () => {
        const question = 'Are you married?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('personal');
      });

      test('should block questions about children', async () => {
        const question = 'Do you have any children?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('personal');
      });

      test('should block questions about spouse', async () => {
        const question = 'What does your spouse do?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('personal');
      });

      test('should block questions about personal life', async () => {
        const question = 'What do you do in your personal life?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('personal');
      });
    });

    describe('Blocked health questions', () => {
      test('should block questions about health', async () => {
        const question = 'How is your health?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('health');
      });

      test('should block questions about medical conditions', async () => {
        const question = 'Do you have any medical conditions?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('health');
      });

      test('should block questions about hospital visits', async () => {
        const question = 'Have you ever been hospitalized?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('health');
      });

      test('should block questions about medication', async () => {
        const question = 'What medications are you taking?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('health');
      });
    });

    describe('Blocked politics questions', () => {
      test('should block questions about political views', async () => {
        const question = 'What are your political views?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('politics');
      });

      test('should block questions about voting', async () => {
        const question = 'Who did you vote for in the last election?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('politics');
      });
    });

    describe('Blocked religion questions', () => {
      test('should block questions about religious beliefs', async () => {
        const question = 'What is your religion?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('religion');
      });

      test('should block questions about faith', async () => {
        const question = 'How does your faith influence your work?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('religion');
      });
    });

    describe('Blocked finance questions', () => {
      test('should block questions about salary', async () => {
        const question = 'What is your current salary?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('finance');
      });

      test('should block questions about income', async () => {
        const question = 'How much income do you make?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('finance');
      });

      test('should block questions about bank accounts', async () => {
        const question = 'What bank do you use?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('finance');
      });
    });

    describe('Blocked hobbies questions', () => {
      test('should block questions about hobbies', async () => {
        const question = 'What are your hobbies?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('hobbies');
      });

      test('should block questions about leisure activities', async () => {
        const question = 'What do you do for leisure?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('hobbies');
      });

      test('should block questions about entertainment', async () => {
        const question = 'What movies do you like?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('hobbies');
      });
    });

    describe('Blocked inappropriate questions', () => {
      test('should block questions about hacking', async () => {
        const question = 'Can you teach me how to hack?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('inappropriate');
      });

      test('should block questions about illegal activities', async () => {
        const question = 'Have you ever committed a crime?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('inappropriate');
      });

      test('should block violent content', async () => {
        const question = 'Do you support violence?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('inappropriate');
      });
    });

    describe('Edge cases', () => {
      test('should handle mixed content (blocked keyword present)', async () => {
        const question = 'Have you ever been hospitalized for a software related issue?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('health');
      });

      test('should be case insensitive for keyword matching', async () => {
        const question = 'WHAT IS YOUR EXPERIENCE IN SOFTWARE DEVELOPMENT?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
      });

      test('should handle empty string', async () => {
        const question = '';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
      });

      test('should handle null input', async () => {
        const question = null;
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
      });

      test('should handle special characters', async () => {
        const question = 'What are your skills in JavaScript, Python, and React?';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(true);
      });

      test('should block question with partial keyword match', async () => {
        const question = 'Tell me about your family background in tech';
        const result = await guardrailService.checkQuestion(question);

        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('personal');
      });
    });
  });

  describe('containsPII', () => {
    test('should detect SSN pattern', () => {
      const text = 'My SSN is 123-45-6789';
      const result = guardrailService.containsPII(text);

      expect(result).toBe(true);
    });

    test('should detect email pattern', () => {
      const text = 'Contact me at john.doe@example.com';
      const result = guardrailService.containsPII(text);

      expect(result).toBe(true);
    });

    test('should detect credit card pattern', () => {
      const text = 'My card number is 1234-5678-1234-5678';
      const result = guardrailService.containsPII(text);

      expect(result).toBe(true);
    });

    test('should return false for text without PII', () => {
      const text = 'I am a software developer with 5 years of experience';
      const result = guardrailService.containsPII(text);

      expect(result).toBe(false);
    });

    test('should handle empty string', () => {
      const result = guardrailService.containsPII('');

      expect(result).toBe(false);
    });

    test('should handle null input', () => {
      const result = guardrailService.containsPII(null);

      expect(result).toBe(false);
    });
  });

  describe('sanitizeResponse', () => {
    test('should remove SSN from response', () => {
      const response = 'Contact John at 123-45-6789 for more information';
      const result = guardrailService.sanitizeResponse(response);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('123-45-6789');
    });

    test('should remove email from response', () => {
      const response = 'Email john.doe@example.com for questions';
      const result = guardrailService.sanitizeResponse(response);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('john.doe@example.com');
    });

    test('should remove credit card from response', () => {
      const response = 'Payment: 1234-5678-1234-5678';
      const result = guardrailService.sanitizeResponse(response);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('1234-5678-1234-5678');
    });

    test('should preserve non-PII content', () => {
      const response = 'John is a software developer with 5 years of experience';
      const result = guardrailService.sanitizeResponse(response);

      expect(result).toBe(response);
    });

    test('should handle multiple PII instances', () => {
      const response = 'Email john@test.com or call 123-45-6789';
      const result = guardrailService.sanitizeResponse(response);

      expect(result).toMatch(/\[REDACTED\].*\[REDACTED\]/);
    });

    test('should handle empty response', () => {
      const result = guardrailService.sanitizeResponse('');

      expect(result).toBe('');
    });
  });

  describe('Integration scenarios', () => {
    test('should allow salary questions only if explicitly in resume context', async () => {
      const question = 'What are your salary expectations for this role?';
      const result = await guardrailService.checkQuestion(question);

        // Salary is blocked by default guardrail
        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('finance');
    });

    test('should handle professional boundary questions', async () => {
      const question = 'Are you available to work weekends?';
      const result = await guardrailService.checkQuestion(question);

      expect(result.isAllowed).toBe(true);
    });

    test('should block questions about personal relationships', async () => {
      const question = 'Are you in a relationship?';
      const result = await guardrailService.checkQuestion(question);

      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain('personal');
    });
  });
});
