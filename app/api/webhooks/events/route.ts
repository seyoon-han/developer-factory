import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/webhooks/events - Get webhook events
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unprocessedOnly = searchParams.get('unprocessedOnly') === 'true';

    let events;
    
    if (unprocessedOnly) {
      events = await statements.getUnprocessedWebhookEvents.all();
    } else {
      events = await statements.getAllWebhookEvents.all();
    }

    // Parse payload JSON for each event
    const eventsWithParsedPayload = events.map((event: any) => ({
      ...event,
      payload: JSON.parse(event.payload),
    }));

    return NextResponse.json({
      success: true,
      events: eventsWithParsedPayload,
    });
  } catch (error: any) {
    console.error('Error fetching webhook events:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/webhooks/events - Create a webhook event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, type, source, payload, taskId } = body;

    if (!id || !type || !source || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, type, source, payload' },
        { status: 400 }
      );
    }

    const payloadJson = JSON.stringify(payload);

    await statements.createWebhookEvent.run(
      id,
      type,
      source,
      payloadJson,
      taskId ? parseInt(taskId) : null
    );

    const newEvent = await statements.getWebhookEvent.get(id) as any;

    return NextResponse.json({
      success: true,
      event: {
        ...newEvent,
        payload: JSON.parse(newEvent.payload),
      },
    });
  } catch (error: any) {
    console.error('Error creating webhook event:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
















