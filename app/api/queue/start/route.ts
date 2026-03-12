import { NextResponse } from 'next/server';
import { initializeQueueProcessor } from '@/lib/queue/init';

export async function POST() {
  try {
    initializeQueueProcessor();
    return NextResponse.json({ success: true, message: 'Queue processor started' });
  } catch (error: any) {
    console.error('Error starting queue:', error);
    return NextResponse.json({ 
      error: 'Failed to start queue',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Queue processor is running' });
}
