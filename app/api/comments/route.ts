import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/comments?taskId=X - Get comments for a task
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    const comments = await statements.getCommentsByTask.all(parseInt(taskId));

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/comments - Create a new comment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, taskId, author, content } = body;

    if (!id || !taskId || !author || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, taskId, author, content' },
        { status: 400 }
      );
    }

    await statements.createComment.run(id, parseInt(taskId), author, content);

    const newComment = await statements.getComment.get(id);

    return NextResponse.json({
      success: true,
      comment: newComment,
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
















