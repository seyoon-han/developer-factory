import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'Todo', order: 0 },
  { id: 'verifying', title: 'Enhancing Requirement', order: 1 },
  { id: 'in-progress', title: 'Implement', order: 2 },
  { id: 'writing-tests', title: 'Presubmit Evaluation', order: 3 },
  { id: 'finish', title: 'Publish', order: 4 },
];

export async function POST() {
  try {
    // Get all boards
    const boards = await statements.getAllBoards.all() as any[];

    // Update each board with new column titles
    for (const board of boards) {
      await statements.updateBoard.run(
        board.name,
        board.description,
        JSON.stringify(DEFAULT_COLUMNS),
        board.id
      );
      console.log(`✅ Updated board ${board.id} with new column titles`);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${boards.length} board(s)`,
      boards: boards.length,
    });
  } catch (error: any) {
    console.error('Error updating boards:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update boards' },
      { status: 500 }
    );
  }
}

