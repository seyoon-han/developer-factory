/**
 * Next.js Instrumentation
 * Runs once when the server starts (both dev and prod)
 * Used to initialize logging and monitoring
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import logger to initialize console overrides and event handlers
    const { logger } = await import('./lib/utils/logger');
    
    console.log('🚀 Server starting...');
    console.log('📝 Logger initialized and ready');
    console.log(`📂 Log folder: ${process.cwd()}/logs`);
    
    // Log server start
    logger.info('Server application starting', {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
    });
    
    // Initialize Claude Code MCP configuration
    try {
      const { initializeMcpConfiguration } = await import('./lib/utils/claudeCodeMcpConfig');
      initializeMcpConfiguration();
    } catch (error) {
      console.error('Failed to initialize MCP configuration:', error);
      // Non-critical error - continue startup
    }

    // Initialize API keys from database
    try {
      const { initializeApiKeys } = await import('./lib/config/skills');
      await initializeApiKeys();
      console.log('🔑 API keys initialized from database');
    } catch (error) {
      console.error('Failed to initialize API keys:', error);
    }
  }
}

