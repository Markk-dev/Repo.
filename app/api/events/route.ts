import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

const isUUID = (str?: string | null) =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    let query = supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch events';
    return NextResponse.json({ success: false, error: message, data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, date, startTime, endTime, allDay, guests, description, remarks, userId } = body;

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required event fields' },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      all_day: Boolean(allDay),
      guests: guests || '',
      description: description || '',
      remarks: remarks || '',
      user_id: isUUID(userId) ? userId : null,
    };

    if (isUUID(id)) {
      payload.id = id;
    }

    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const { data, error } = await supabase
      .from('calendar_events')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Event ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const { error } = await supabase.from('calendar_events').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
