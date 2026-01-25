import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const supabase = createServiceClient();

    // Simple connectivity check - count members table
    const { error } = await supabase.from('members').select('id', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp,
          database: 'error',
          error: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp,
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
