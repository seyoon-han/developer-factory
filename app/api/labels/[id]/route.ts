import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/labels/[id] - Get a specific label
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const label = await statements.getLabel.get(resolvedParams.id);

    if (!label) {
      return NextResponse.json(
        { success: false, error: 'Label not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('Error fetching label:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/labels/[id] - Update a label
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, color' },
        { status: 400 }
      );
    }

    // Check if label exists
    const existingLabel = await statements.getLabel.get(resolvedParams.id);
    if (!existingLabel) {
      return NextResponse.json(
        { success: false, error: 'Label not found' },
        { status: 404 }
      );
    }

    await statements.updateLabel.run(name, color, description || null, resolvedParams.id);

    const updatedLabel = await statements.getLabel.get(resolvedParams.id);

    return NextResponse.json({
      success: true,
      label: updatedLabel,
    });
  } catch (error: any) {
    console.error('Error updating label:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/labels/[id] - Delete a label
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    // Check if label exists
    const existingLabel = await statements.getLabel.get(resolvedParams.id);
    if (!existingLabel) {
      return NextResponse.json(
        { success: false, error: 'Label not found' },
        { status: 404 }
      );
    }

    await statements.deleteLabel.run(resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Label deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting label:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
