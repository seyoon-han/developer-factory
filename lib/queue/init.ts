import { queueProcessor } from './processor';

let initialized = false;

export function initializeQueueProcessor() {
  if (initialized) {
    console.log('⚠️  Queue processor already initialized');
    return;
  }

  // Start processing queue every 10 seconds
  queueProcessor.start(10000);
  initialized = true;

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping queue processor...');
    queueProcessor.stop();
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping queue processor...');
    queueProcessor.stop();
  });
}
