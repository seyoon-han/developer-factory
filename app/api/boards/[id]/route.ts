import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/boards/[id] - Get a specific board
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const board = await statements.getBoard.get(resolvedParams.id) as any;

    if (!board) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      board: {
        ...board,
        columns: JSON.parse(board.columns),
      },
    });
  } catch (error: any) {
    console.error('Error fetching board:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/boards/[id] - Update a board
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { name, description, columns } = body;

    // Check if board exists
    const existingBoard = await statements.getBoard.get(resolvedParams.id);
    if (!existingBoard) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    if (!name || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, columns' },
        { status: 400 }
      );
    }

    const columnsJson = JSON.stringify(columns);

    await statements.updateBoard.run(
      name,
      description || null,
      columnsJson,
      resolvedParams.id
    );

    const updatedBoard = await statements.getBoard.get(resolvedParams.id) as any;

    return NextResponse.json({
      success: true,
      board: {
        ...updatedBoard,
        columns: JSON.parse(updatedBoard.columns),
      },
    });
  } catch (error: any) {
    console.error('Error updating board:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[id] - Delete a board
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    // Check if board exists
    const existingBoard = await statements.getBoard.get(resolvedParams.id);
    if (!existingBoard) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    await statements.deleteBoard.run(resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Board deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting board:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

