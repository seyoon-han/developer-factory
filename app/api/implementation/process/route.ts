import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { implementationExecutor } from '@/lib/queue/implementationExecutor';
import { implementationLogs } from '@/lib/queue/implementationLogs';
import { reportGenerator } from '@/lib/queue/reportGenerator';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Check if there's already an active implementation
    const activeImpl = await statements.getActiveImplementation.get() as any;

    if (activeImpl) {
      console.log(`⏳ Implementation already running for task #${activeImpl.task_id}`);
      return NextResponse.json({
        message: 'Implementation already in progress',
        activeTaskId: activeImpl.task_id,
      });
    }

    // Get the next waiting implementation
    const waitingImpls = await statements.getWaitingImplementations.all() as any[];
    
    if (waitingImpls.length === 0) {
      console.log(`✅ No tasks waiting for implementation`);
      return NextResponse.json({ message: 'No tasks in queue' });
    }

    const nextImpl = waitingImpls[0];
    const taskId = nextImpl.task_id;

    console.log(`🚀 Starting implementation for task #${taskId}`);

    // Get task and prompt
    const task = await statements.getTask.get(taskId) as any;
    const prompt = await statements.getPrompt.get(taskId) as any;

    if (!task || !prompt || !prompt.enhanced_prompt) {
      console.error(`❌ Task #${taskId} missing data`);
      await statements.updateImplementationStatus.run('error', taskId);
      return NextResponse.json(
        { error: 'Task or prompt not found' },
        { status: 400 }
      );
    }

    // Mark as running
    await statements.startImplementation.run(taskId);

    // Execute implementation in background (don't await)
    executeImplementationAsync(taskId, task, prompt);

    return NextResponse.json({
      success: true,
      message: `Implementation started for task #${taskId}`,
      taskId,
    });
  } catch (error: any) {
    console.error('❌ Error processing implementation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process implementation' },
      { status: 500 }
    );
  }
}

/**
 * Execute implementation asynchronously
 */
async function executeImplementationAsync(taskId: number, task: any, prompt: any) {
  const startTime = Date.now();
  
  try {
    console.log(`💻 Executing implementation for task #${taskId}: ${task.title}`);

    // Execute implementation
    const result = await implementationExecutor.executeImplementation(
      taskId,
      task.title,
      prompt.enhanced_prompt,
      { timeout: 300000 } // 5 minutes timeout
    );

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (result.success) {
      console.log(`✅ Implementation completed for task #${taskId} in ${elapsedSeconds}s`);

      // Commit the implementation
      let gitCommitHash = '';
      const restoreBranch = `restore-task-${taskId}`;
      try {
        const { stdout: statusOutput } = await execAsync('git status --porcelain', {
          cwd: process.cwd(),
        });

        if (statusOutput.trim()) {
          await execAsync('git add .', { cwd: process.cwd() });
          const commitMessage = `feat: implement task #${taskId} - ${task.title}\n\nRestore point: ${restoreBranch}`;
          await execAsync(`git commit -m "${commitMessage}"`, { cwd: process.cwd() });
          
          const { stdout: hashOutput } = await execAsync('git rev-parse HEAD', {
            cwd: process.cwd(),
          });
          gitCommitHash = hashOutput.trim();
          
          console.log(`📍 Implementation committed: ${gitCommitHash.substring(0, 7)}`);
          console.log(`   Restore point available at: ${restoreBranch}`);
        }
      } catch (error: any) {
        console.error('⚠️  Git commit failed:', error.message);
        gitCommitHash = 'commit-error';
      }

      // Mark as completed
      await statements.completeImplementation.run(elapsedSeconds, gitCommitHash, taskId);

      // Generate implementation report
      console.log(`📝 Generating implementation report for task #${taskId}...`);
      await statements.updateReportStatus.run('generating', taskId);

      try {
        const logs = implementationLogs.getLogs(taskId);
        const reportData = {
          taskId,
          taskTitle: task.title,
          taskDescription: task.description || '',
          enhancedPrompt: prompt.enhanced_prompt || '',
          restoreBranch,
          implementationCommit: gitCommitHash,
          elapsedSeconds,
          filesChanged: [],
          implementationLogs: logs,
        };

        const report = await reportGenerator.generateReport(reportData);
        
        // Save report to database
        await statements.saveImplementationReport.run(report, taskId);

        // Optionally save to file
        await reportGenerator.saveReportToFile(taskId, report);

        console.log(`✅ Implementation report generated for task #${taskId}`);
      } catch (error: any) {
        console.error(`⚠️  Failed to generate report for task #${taskId}:`, error);
        await statements.updateReportStatus.run('error', taskId);
        // Continue anyway - don't fail the task due to report generation
      }

      // Move task to writing-tests (Presubmit Evaluation) status
      await statements.updateTaskStatus.run('writing-tests', taskId);

      console.log(`🎉 Task #${taskId} implementation complete, moved to Presubmit Evaluation`);
    } else {
      throw new Error(result.error || 'Implementation failed');
    }

    // Process next task in queue
    processNextTask();

  } catch (error: any) {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    console.error(`❌ Implementation failed for task #${taskId}:`, error);

    // Mark as error
    await statements.updateImplementationStatus.run('error', taskId);
    await statements.updateTaskStatus.run('verifying', taskId); // Move back to verifying

    // Process next task in queue
    processNextTask();
  }
}

/**
 * Trigger processing of next task in queue
 */
function processNextTask() {
  setTimeout(() => {
    // Call the function directly instead of making HTTP request
    POST().catch((err) => console.error('Failed to process next task:', err));
  }, 1000); // 1 second delay
}

