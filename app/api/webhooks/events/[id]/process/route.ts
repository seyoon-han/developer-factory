import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// POST /api/webhooks/events/[id]/process - Mark webhook event as processed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { error } = body;

    const existingEvent = await statements.getWebhookEvent.get(resolvedParams.id);
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Webhook event not found' },
        { status: 404 }
      );
    }

    if (error) {
      await statements.markWebhookEventError.run(error, resolvedParams.id);
    } else {
      await statements.markWebhookEventProcessed.run(resolvedParams.id);
    }

    const updatedEvent = await statements.getWebhookEvent.get(resolvedParams.id) as any;

    return NextResponse.json({
      success: true,
      event: {
        ...updatedEvent,
        payload: JSON.parse(updatedEvent.payload),
      },
    });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
