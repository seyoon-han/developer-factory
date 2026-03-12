import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/labels - Get all labels (or by taskId if provided)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    let labels;
    
    if (taskId) {
      // Get labels for a specific task
      labels = await statements.getTaskLabels.all(parseInt(taskId));
    } else {
      // Get all labels
      labels = await statements.getAllLabels.all();
    }

    return NextResponse.json({
      success: true,
      labels,
    });
  } catch (error: any) {
    console.error('Error fetching labels:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/labels - Create a new label
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, color, description } = body;

    if (!id || !name || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, color' },
        { status: 400 }
      );
    }

    // Check if label with same name already exists
    const existing = await statements.getLabelByName.get(name);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Label with this name already exists' },
        { status: 400 }
      );
    }

    await statements.createLabel.run(id, name, color, description || null);

    const newLabel = await statements.getLabel.get(id);

    return NextResponse.json({
      success: true,
      label: newLabel,
    });
  } catch (error: any) {
    console.error('Error creating label:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
















