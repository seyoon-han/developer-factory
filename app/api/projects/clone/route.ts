import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { gitManager } from '@/lib/projects/git';
import { frameworkDetector } from '@/lib/projects/detector';
import { workspaceManager } from '@/lib/config/workspace';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { name, gitUrl, branch = 'main', description, setActive = true } = await request.json();
    
    // Validation
    if (!name || !gitUrl) {
      return NextResponse.json(
        { error: 'Name and Git URL are required' },
        { status: 400 }
      );
    }

    // Validate name (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'Project name must contain only letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }
    
    // Check for duplicate name
    const existing = await statements.getProjectByName.get(name) as any;
    if (existing) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }
    
    // Generate local path
    const localPath = path.join(workspaceManager.getWorkspaceRoot(), name);
    
    console.log(`📦 Starting clone for project: ${name}`);
    console.log(`   Git URL: ${gitUrl}`);
    console.log(`   Branch: ${branch}`);
    console.log(`   Local path: ${localPath}`);
    
    // Create project record with 'cloning' status
    const result = await statements.createProject.run(
      name,
      description || null,
      gitUrl,
      branch,
      localPath,
      'cloning'
    );
    
    const projectId = result.lastInsertRowid as number;
    
    // Clone in background (async, don't await)
    cloneProjectAsync(projectId, gitUrl, name, branch, localPath, setActive);
    
    return NextResponse.json({
      success: true,
      projectId,
      message: 'Project cloning started in background',
      status: 'cloning',
    }, { status: 202 }); // 202 Accepted - processing in background
    
  } catch (error: any) {
    console.error('❌ Error initiating project clone:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate project clone' },
      { status: 500 }
    );
  }
}

/**
 * Background clone operation
 */
async function cloneProjectAsync(
  projectId: number,
  gitUrl: string,
  name: string,
  branch: string,
  localPath: string,
  setActive: boolean
) {
  try {
    console.log(`🚀 Background clone started for project ${name}`);
    
    // Step 1: Clone repository
    const clonedPath = await gitManager.cloneRepository(gitUrl, name, branch);
    console.log(`✅ Clone complete: ${clonedPath}`);
    
    // Step 2: Detect framework
    console.log(`🔍 Detecting project framework...`);
    const { framework, language, packageManager } = await frameworkDetector.detectProject(localPath);
    console.log(`   Framework: ${framework}`);
    console.log(`   Language: ${language}`);
    console.log(`   Package Manager: ${packageManager}`);
    
    // Step 3: Get current commit
    const commit = await gitManager.getCurrentCommit(localPath);
    console.log(`   Current commit: ${commit.substring(0, 7)}`);
    
    // Step 4: Update project record
    await statements.updateProjectInfo.run(
      framework,
      language,
      packageManager,
      commit,
      'ready',  // Status: ready
      null,     // No error
      projectId
    );

    console.log(`✅ Project ${name} cloned successfully and ready`);

    // Step 5: Set as active if requested
    if (setActive) {
      await statements.deactivateAllProjects.run();
      await statements.activateProject.run(projectId);
      await workspaceManager.refresh();
      console.log(`✅ Project ${name} set as active`);
    }

  } catch (error: any) {
    console.error(`❌ Failed to clone project ${name}:`, error);

    // Update project with error status
    await statements.updateProjectStatus.run('error', error.message, projectId);
    
    console.log(`❌ Project ${name} marked as error in database`);
  }
}


