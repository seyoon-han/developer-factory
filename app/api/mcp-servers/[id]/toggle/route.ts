import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * POST /api/mcp-servers/[id]/toggle
 * Toggle active status of an MCP server
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const server = await statements.getMcpServer.get(id) as any;
    if (!server) {
      return NextResponse.json(
        { success: false, error: 'Server not found' },
        { status: 404 }
      );
    }

    await statements.toggleMcpServerActive.run(id);

    const updated = await statements.getMcpServer.get(id) as any;
    const newStatus = updated.is_active === 1;

    console.log(`✅ Toggled MCP server status: ${server.server_name} -> ${newStatus ? 'active' : 'inactive'}`);

    return NextResponse.json({
      success: true,
      isActive: newStatus,
      message: `Server ${newStatus ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Error toggling MCP server status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle server status' },
      { status: 500 }
    );
  }
}

