import { NextResponse } from 'next/server';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'lib/config/skills.ts');

/**
 * GET /api/settings/execution-method
 * Returns the current execution method
 */
export async function GET() {
  try {
    return NextResponse.json({
      executionMethod: SKILLS_CONFIG.executionMethod,
    });
  } catch (error) {
    console.error('Error getting execution method:', error);
    return NextResponse.json(
      { error: 'Failed to get execution method' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/execution-method
 * Updates the execution method in the config file
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { executionMethod } = body;

    // Validate the execution method
    if (!['sdk', 'api', 'cli'].includes(executionMethod)) {
      return NextResponse.json(
        { error: 'Invalid execution method. Must be sdk, api, or cli.' },
        { status: 400 }
      );
    }

    // Read the current config file
    const configContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');

    // Replace the execution method value
    const updatedContent = configContent.replace(
      /executionMethod:\s*['"](?:sdk|api|cli)['"]\s+as\s+['"]sdk['"]\s+\|\s+['"]api['"]\s+\|\s+['"]cli['"]/,
      `executionMethod: '${executionMethod}' as 'sdk' | 'api' | 'cli'`
    );

    // Write the updated config back to the file
    fs.writeFileSync(CONFIG_FILE_PATH, updatedContent, 'utf-8');

    console.log(`✅ Execution method updated to: ${executionMethod}`);

    return NextResponse.json({
      success: true,
      executionMethod,
      message: 'Execution method updated successfully. Server restart may be required for changes to take effect.',
    });
  } catch (error) {
    console.error('Error updating execution method:', error);
    return NextResponse.json(
      { error: 'Failed to update execution method' },
      { status: 500 }
    );
  }
}
