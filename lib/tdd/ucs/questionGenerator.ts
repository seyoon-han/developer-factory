/**
 * Question Generator
 * AI-powered generation of clarifying questions for specification elicitation
 */

import Anthropic from '@anthropic-ai/sdk';
import { statements } from '@/lib/db/postgres';
import {
  ClarificationQuestion,
  QuestionGenerationContext,
  GeneratedQuestion,
  QuestionGenerationResult
} from '@/types/clarification';

// Question categories
const QUESTION_CATEGORIES = [
  'edge_case',
  'input_output',
  'performance',
  'integration',
  'acceptance'
] as const;

/**
 * Generate clarifying questions using Claude
 */
export class QuestionGenerator {
  private client: Anthropic | null = null;

  /**
   * Get Anthropic client (lazy initialization)
   */
  private async getClient(): Promise<Anthropic> {
    if (!this.client) {
      const settings = await statements.getAppSettings.get() as { anthropic_api_key?: string } | undefined;
      const apiKey = settings?.anthropic_api_key || process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error('Anthropic API key not configured');
      }

      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate clarifying questions for a task
   */
  async generateQuestions(context: QuestionGenerationContext): Promise<QuestionGenerationResult> {
    try {
      const client = await this.getClient();

      const prompt = this.buildPrompt(context);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Extract text content
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from model');
      }

      // Parse JSON response
      const questions = this.parseResponse(textContent.text);

      return {
        success: true,
        questions
      };
    } catch (error: any) {
      console.error('Error generating questions:', error);
      return {
        success: false,
        questions: [],
        error: error.message
      };
    }
  }

  /**
   * Build the prompt for question generation
   */
  private buildPrompt(context: QuestionGenerationContext): string {
    let prompt = `You are analyzing a software development task to identify unclear or ambiguous requirements.
Your goal is to generate clarifying questions that will help create a precise, unambiguous specification.

## Task Information

**Title:** ${context.title}

**Description:**
${context.description || '(No description provided)'}
`;

    if (context.existingSpecification) {
      prompt += `
**Existing Specification:**
${context.existingSpecification}
`;
    }

    if (context.previousAnswers && Object.keys(context.previousAnswers).length > 0) {
      prompt += `
**Previous Clarifications:**
`;
      for (const [question, answer] of Object.entries(context.previousAnswers)) {
        prompt += `Q: ${question}\nA: ${answer}\n\n`;
      }
    }

    prompt += `
## Instructions

Generate 3-5 clarifying questions that will help create a precise specification for implementing this task.

Focus on questions in these categories:
1. **Edge Cases** - What should happen in unusual or boundary conditions?
2. **Input/Output** - What are the expected inputs, outputs, and data formats?
3. **Performance** - Are there any performance requirements or constraints?
4. **Integration** - How does this interact with other parts of the system?
5. **Acceptance Criteria** - How do we know when this is complete?

For each question:
- Make it specific and answerable
- Provide 2-4 suggested answer options when appropriate
- Explain briefly why this matters (context)
- Mark whether it's required or optional

## Response Format

Return a JSON object with this structure:
\`\`\`json
{
  "questions": [
    {
      "text": "The question text",
      "type": "choice|text|boolean",
      "suggestedOptions": ["Option 1", "Option 2", "Option 3"],
      "context": "Brief explanation of why this matters",
      "required": true,
      "category": "edge_case|input_output|performance|integration|acceptance"
    }
  ]
}
\`\`\`

Important:
- Only return the JSON object, no additional text
- Use "choice" type when there are clear options, "text" for open-ended, "boolean" for yes/no
- For "text" type, suggestedOptions can be omitted or empty
- Make questions actionable and specific to this task`;

    return prompt;
  }

  /**
   * Parse the model's response into structured questions
   */
  private parseResponse(responseText: string): GeneratedQuestion[] {
    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      let jsonText = responseText;

      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonText);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      // Validate and normalize questions
      return parsed.questions.map((q: any) => this.normalizeQuestion(q));
    } catch (error: any) {
      console.error('Error parsing question response:', error);
      throw new Error(`Failed to parse questions: ${error.message}`);
    }
  }

  /**
   * Normalize and validate a question
   */
  private normalizeQuestion(q: any): GeneratedQuestion {
    // Validate required fields
    if (!q.text || typeof q.text !== 'string') {
      throw new Error('Question missing text field');
    }

    // Normalize type
    const validTypes = ['text', 'choice', 'multi_choice', 'boolean'];
    const type = validTypes.includes(q.type) ? q.type : 'text';

    // Normalize category
    const category = QUESTION_CATEGORIES.includes(q.category) ? q.category : 'acceptance';

    return {
      text: q.text.trim(),
      type,
      suggestedOptions: Array.isArray(q.suggestedOptions) ? q.suggestedOptions : undefined,
      context: typeof q.context === 'string' ? q.context : '',
      required: q.required !== false, // Default to required
      category
    };
  }

  /**
   * Generate follow-up questions based on initial answers
   */
  async generateFollowUpQuestions(
    context: QuestionGenerationContext,
    maxQuestions: number = 3
  ): Promise<QuestionGenerationResult> {
    // Use the same generation with previous answers included
    const result = await this.generateQuestions(context);

    if (result.success && result.questions.length > maxQuestions) {
      result.questions = result.questions.slice(0, maxQuestions);
    }

    return result;
  }

  /**
   * Generate default questions when AI generation fails
   */
  getDefaultQuestions(context: QuestionGenerationContext): GeneratedQuestion[] {
    return [
      {
        text: 'What are the expected inputs for this feature?',
        type: 'text',
        context: 'Understanding inputs helps define test cases',
        required: true,
        category: 'input_output'
      },
      {
        text: 'What should happen if invalid input is provided?',
        type: 'choice',
        suggestedOptions: [
          'Return an error message',
          'Throw an exception',
          'Use default values',
          'Ignore and continue'
        ],
        context: 'Error handling behavior affects implementation',
        required: true,
        category: 'edge_case'
      },
      {
        text: 'Are there any performance requirements?',
        type: 'text',
        suggestedOptions: [
          'No specific requirements',
          'Must complete in under 1 second',
          'Must handle 1000+ items efficiently'
        ],
        context: 'Performance requirements may affect implementation approach',
        required: false,
        category: 'performance'
      },
      {
        text: 'How will you know this task is complete?',
        type: 'text',
        context: 'Clear acceptance criteria help define when to stop',
        required: true,
        category: 'acceptance'
      }
    ];
  }
}

// Singleton instance
export const questionGenerator = new QuestionGenerator();

export default questionGenerator;
