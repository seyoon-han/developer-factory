import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/boards - Get all boards
export async function GET() {
  try {
    const boards = await statements.getAllBoards.all();
    
    // Parse columns JSON
    const boardsWithParsedColumns = boards.map((board: any) => ({
      ...board,
      columns: JSON.parse(board.columns),
    }));

    return NextResponse.json({ 
      success: true,
      boards: boardsWithParsedColumns 
    });
  } catch (error: any) {
    console.error('Error fetching boards:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/boards - Create a new board
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, columns } = body;

    if (!id || !name || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, columns' },
        { status: 400 }
      );
    }

    // Validate columns is an array
    if (!Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, error: 'columns must be an array' },
        { status: 400 }
      );
    }

    const columnsJson = JSON.stringify(columns);

    await statements.createBoard.run(id, name, description || null, columnsJson);

    const newBoard = await statements.getBoard.get(id) as any;
    
    return NextResponse.json({
      success: true,
      board: {
        ...newBoard,
        columns: JSON.parse(newBoard.columns),
      },
    });
  } catch (error: any) {
    console.error('Error creating board:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
















