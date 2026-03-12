import { logger } from '@/lib/utils/logger';

/**
 * GET /api/logs/stream
 * Server-Sent Events (SSE) endpoint for real-time log streaming
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  logger.info('Client connected to log stream');

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', message: 'Connected to log stream' })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Watch log file for changes
      const watcher = logger.watchLog((chunk: string) => {
        // Send each new log chunk to the client
        const message = `data: ${JSON.stringify({ type: 'log', content: chunk })}\n\n`;
        controller.enqueue(encoder.encode(message));
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        logger.info('Client disconnected from log stream');
        if (watcher) {
          watcher.close();
        }
        controller.close();
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping' })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        if (watcher) {
          watcher.close();
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

