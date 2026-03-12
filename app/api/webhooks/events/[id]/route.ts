import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/webhooks/events/[id] - Get a specific webhook event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const event = await statements.getWebhookEvent.get(resolvedParams.id) as any;

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Webhook event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        payload: JSON.parse(event.payload),
      },
    });
  } catch (error: any) {
    console.error('Error fetching webhook event:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/events/[id] - Delete a webhook event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const existingEvent = await statements.getWebhookEvent.get(resolvedParams.id);
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Webhook event not found' },
        { status: 404 }
      );
    }

    await statements.deleteWebhookEvent.run(resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Webhook event deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting webhook event:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
