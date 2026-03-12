import { NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';

export interface ExtractedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: string;
}

/**
 * POST /api/task-identifier/extract
 * Extract TODO items from meeting transcript or document text using Claude SDK
 */
export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`📝 Extracting TODO items from content (${content.length} chars)`);

    // Build the extraction prompt
    const extractionPrompt = buildExtractionPrompt(content);
    
    const model = await getPreferredModel();
    console.log(`🤖 Calling Claude SDK for extraction with model: ${model}`);

    // Call Claude SDK to extract tasks
    const queryGenerator = query({
      prompt: extractionPrompt,
      options: {
        model: model,
        cwd: process.cwd(),
        // pathToClaudeCodeExecutable: SKILLS_CONFIG.claudeCliPath, // Removed to support SDK mode in Docker
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: SKILLS_CONFIG.anthropicApiKey,
        },
        executable: 'node',
      },
    });

    // Collect the response
    let extractedText = '';

    for await (const message of queryGenerator) {
      if (message.type === 'assistant') {
        const textContent = message.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');
        
        if (textContent) {
          extractedText += textContent + '\n';
        }
      } else if (message.type === 'result') {
        console.log(`✅ Extraction result: ${message.subtype}`);
        
        if (message.subtype !== 'success') {
          throw new Error(`Extraction failed: ${message.subtype}`);
        }
      }
    }

    extractedText = extractedText.trim();

    if (!extractedText) {
      throw new Error('No tasks extracted from content');
    }

    console.log(`📄 Extracted response: ${extractedText.length} chars`);

    // Parse the JSON response
    let tasks: ExtractedTask[];
    try {
      // Try to find JSON in the response
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try parsing the whole response
        tasks = JSON.parse(extractedText);
      }
    } catch (parseError) {
      console.error('Failed to parse extracted tasks as JSON:', parseError);
      throw new Error('Failed to parse extracted tasks. The AI response was not in the expected format.');
    }

    // Validate the extracted tasks
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({
        tasks: [],
        message: 'No actionable tasks found in the provided content'
      });
    }

    // Ensure each task has required fields
    const validatedTasks = tasks.map((task, index) => ({
      title: task.title || `Extracted Task ${index + 1}`,
      description: task.description || '',
      priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority) 
        ? task.priority 
        : 'medium',
      context: task.context || '',
    }));

    console.log(`✅ Successfully extracted ${validatedTasks.length} task(s)`);

    return NextResponse.json({
      tasks: validatedTasks,
      count: validatedTasks.length,
    });

  } catch (error: any) {
    console.error('❌ Error extracting tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract tasks from content' },
      { status: 500 }
    );
  }
}

/**
 * Build the prompt for extracting TODO items
 */
function buildExtractionPrompt(content: string): string {
  return `You are a task extraction assistant. Your job is to analyze meeting transcripts, notes, or documents and extract actionable TODO items.

**Input Content:**
${content}

**Instructions:**
1. Identify all actionable tasks, action items, and TODO items mentioned in the content
2. For each task, extract:
   - A clear, concise title (max 100 characters)
   - A detailed description that captures the context and requirements
   - An appropriate priority level (low, medium, high, or urgent)
   - Additional context from the discussion

3. Prioritize tasks based on:
   - Urgency mentioned in the content
   - Deadlines or timeframes discussed
   - Impact and importance indicated
   - If unclear, use "medium" as default

4. Ignore:
   - Completed or resolved items
   - General discussion points that aren't actionable
   - Context that doesn't lead to specific tasks

**Output Format:**
Return ONLY a valid JSON array with this exact structure (no additional text):

[
  {
    "title": "Short task title",
    "description": "Detailed description with full context and requirements",
    "priority": "medium",
    "context": "Additional context from the meeting/document"
  }
]

**Important:**
- Return ONLY the JSON array, nothing else
- Ensure the JSON is valid and properly formatted
- If no actionable tasks are found, return an empty array: []
- Do not include any explanatory text before or after the JSON

Analyze the content and extract all actionable tasks now:`;
}

