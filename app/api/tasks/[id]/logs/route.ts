import { NextResponse } from 'next/server';
import { implementationLogs } from '@/lib/queue/implementationLogs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const logs = implementationLogs.getLogs(taskId);

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error fetching implementation logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

