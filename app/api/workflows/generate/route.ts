/**
 * Workflow Generation API Route
 * POST /api/workflows/generate
 * 
 * Generates BMAD v6 workflow from natural language description
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowGenerator } from '@/lib/workflows/generator';
import { bmadFormatter } from '@/lib/workflows/bmadFormatter';
import { amplifierGenerator } from '@/lib/workflows/amplifier/amplifierGenerator';
import { amplifierFormatter } from '@/lib/workflows/amplifier/amplifierFormatter';
import type { GenerateWorkflowRequest, GenerateWorkflowResponse } from '@/types/workflow';

export async function POST(request: NextRequest) {
  try {
    const data: GenerateWorkflowRequest & { framework?: 'bmad' | 'amplifier' } = await request.json();
    
    // Validate input
    if (!data.description || data.description.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Description is required',
        } as GenerateWorkflowResponse,
        { status: 400 }
      );
    }
    
    if (data.description.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Description too long (max 2000 characters)',
        } as GenerateWorkflowResponse,
        { status: 400 }
      );
    }
    
    const framework = data.framework || 'bmad';
    
    console.log(`🎯 Generating ${framework.toUpperCase()} workflow from description:`, data.description.substring(0, 100) + '...');
    
    if (framework === 'bmad') {
      // Generate BMAD v6 workflow
      const workflowDef = await workflowGenerator.generateWithRetry(data.description);
      
      console.log('✅ BMAD Workflow generated:', workflowDef.name);
      console.log(`   Steps: ${workflowDef.steps.length}`);
      console.log(`   Agents: ${workflowDef.agents.join(', ')}`);
      
      // Format to BMAD v6 YAML
      const yamlDefinition = bmadFormatter.toYaml(workflowDef);
      const commandFile = bmadFormatter.toCommandMarkdown(workflowDef);
      
      console.log('✅ Formatted to BMAD v6 YAML and Claude Command');
      
      return NextResponse.json({
        success: true,
        workflow: {
          ...workflowDef,
          yamlDefinition,
          commandFile,
          framework: 'bmad',
        },
      });
    } else {
      // Generate Amplifier workflow
      const workflowDef = await amplifierGenerator.generateWithRetry(data.description);
      
      console.log('✅ Amplifier Workflow generated:', workflowDef.name);
      console.log(`   Steps: ${workflowDef.steps.length}`);
      console.log(`   Type: ${workflowDef.workflowType}`);
      console.log(`   Agents: ${workflowDef.agents.join(', ')}`);
      
      // Format to Amplifier command
      const commandFile = amplifierFormatter.toCommandMarkdown(workflowDef);
      const configFile = amplifierFormatter.toConfigFile(workflowDef);
      
      console.log('✅ Formatted to Amplifier command and config');
      
      return NextResponse.json({
        success: true,
        workflow: {
          ...workflowDef,
          yamlDefinition: configFile, // Use config instead of YAML
          commandFile,
          framework: 'amplifier',
        },
      });
    }
  } catch (error) {
    console.error('❌ Workflow generation failed:', error);
    
    const response: GenerateWorkflowResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate workflow',
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/workflows/generate
 * Returns API information
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/workflows/generate',
    description: 'Generate BMAD v6 workflow from natural language',
    version: '6.0.0-alpha',
    format: {
      request: {
        description: 'string (required, max 2000 chars)',
        category: 'string (optional)',
        tags: 'string[] (optional)',
      },
      response: {
        success: 'boolean',
        workflow: {
          name: 'string (kebab-case)',
          description: 'string',
          steps: 'WorkflowStep[]',
          agents: 'string[]',
          tools: 'string[]',
          yamlDefinition: 'string (BMAD v6 YAML)',
          commandFile: 'string (Claude Command markdown)',
        },
        error: 'string (if success = false)',
      },
    },
    example: {
      description: 'Run tests then deploy to staging if passing',
      category: 'deployment',
      tags: ['testing', 'ci-cd'],
    },
  });
}

