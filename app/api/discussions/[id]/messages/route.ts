import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { SESSION_COOKIE_NAME } from '@/utils/session-config';
import { EMPLOYEES } from '@/constants/employees';

// --- Resolve authenticated employee from session cookie ---
async function getCurrentEmployeeId(
  supabase: ReturnType<typeof createAdminClient>,
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<string | null> {
  const sessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionKey) {
    const defaultEmp = EMPLOYEES[0];
    const { data: dbEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', defaultEmp.employeeId)
      .maybeSingle();

    return dbEmp?.id || null;
  }

  // Local/demo session (format: local_<base64>_<timestamp>)
  if (sessionKey.startsWith('local_')) {
    const parts = sessionKey.split('_');
    if (parts.length < 2 || !parts[1]) {
      return null;
    }

    let employeeId: string;
    try {
      employeeId = Buffer.from(parts[1], 'base64').toString('utf-8');
    } catch {
      return null;
    }

    if (!employeeId) {
      return null;
    }

    const localEmployee = EMPLOYEES.find(
      (employee) => employee.employeeId.toLowerCase() === employeeId.toLowerCase()
    );

    if (!localEmployee) {
      return null;
    }

    const { data: employeeRecord, error } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', localEmployee.employeeId)
      .maybeSingle();

    if (error || !employeeRecord) {
      return null;
    }

    return employeeRecord.id;
  }

  // Database-backed session
  const { data: sessionData, error } = await supabase
    .from('user_sessions')
    .select('employee_id')
    .eq('session_key', sessionKey)
    .eq('is_valid', true)
    .maybeSingle();

  if (error || !sessionData?.employee_id) {
    return null;
  }

  return sessionData.employee_id;
}

// Ensure the Announcement discussion exists under SYSTEM_ANNOUNCEMENTS
async function getOrCreateAnnouncementDiscussion(
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ id: string; is_announcement: boolean }> {
  // 1. Check existing discussion with is_announcement = true
  const { data: existing } = await supabase
    .from('discussions')
    .select('id, is_announcement')
    .eq('is_announcement', true)
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  // 2. Check by name
  const { data: named } = await supabase
    .from('discussions')
    .select('id, is_announcement')
    .ilike('name', 'announcements')
    .limit(1)
    .maybeSingle();

  if (named) {
    await supabase.from('discussions').update({ is_announcement: true }).eq('id', named.id);
    return { id: named.id, is_announcement: true };
  }

  // 3. Ensure SYSTEM_ANNOUNCEMENTS section exists
  let { data: sysSec } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'SYSTEM_ANNOUNCEMENTS')
    .maybeSingle();

  if (!sysSec) {
    const { data: newSec } = await supabase
      .from('sections')
      .insert({
        name: 'SYSTEM_ANNOUNCEMENTS',
        description: 'Dedicated system section for announcement channel',
        order_index: -100,
      })
      .select('id')
      .single();
    sysSec = newSec;
  }

  // 4. Create new announcements discussion
  const { data: newDisc, error } = await supabase
    .from('discussions')
    .insert({
      section_id: sysSec!.id,
      name: 'announcements',
      topic: 'General announcements and updates',
      icon: 'megaphone-simple',
      is_announcement: true,
      order_index: 0,
    })
    .select('id, is_announcement')
    .single();

  if (error || !newDisc) {
    throw new Error('Failed to auto-create announcement discussion');
  }

  // Auto-populate discussion_members
  try {
    const { data: emps } = await supabase.from('employees').select('id');
    if (emps && emps.length > 0) {
      const members = emps.map((e) => ({
        discussion_id: newDisc.id,
        employee_id: e.id,
        role: 'member',
      }));
      await supabase.from('discussion_members').upsert(members, { onConflict: 'discussion_id,employee_id' });
    }
  } catch (e) {
    console.warn('Failed to seed announcement members:', e);
  }

  return newDisc;
}

// Resolve discussion by raw ID (handles 'announcement', 'announcements', or UUIDs)
async function resolveDiscussion(
  supabase: ReturnType<typeof createAdminClient>,
  rawId: string
): Promise<{ id: string; is_announcement: boolean } | null> {
  if (rawId === 'announcement' || rawId === 'announcements') {
    return await getOrCreateAnnouncementDiscussion(supabase);
  }

  const { data: disc } = await supabase
    .from('discussions')
    .select('id, is_announcement')
    .eq('id', rawId)
    .maybeSingle();

  if (disc) {
    return disc;
  }

  return null;
}

// Check membership for regular private/group discussions
async function isDiscussionMember(
  supabase: ReturnType<typeof createAdminClient>,
  discussionId: string,
  employeeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('discussion_members')
    .select('id')
    .eq('discussion_id', discussionId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (!error && data) return true;
  return false;
}

// --- GET: fetch discussion messages ---
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;

    if (!rawId) {
      return NextResponse.json(
        { error: 'Invalid discussion ID' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const discussion = await resolveDiscussion(supabase, rawId);
    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found', notFound: true },
        { status: 404 }
      );
    }

    const currentEmployeeId = await getCurrentEmployeeId(
      supabase,
      cookieStore
    );

    if (!currentEmployeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check membership or allow if announcement
    if (discussion.is_announcement) {
      try {
        await supabase
          .from('discussion_members')
          .upsert(
            { discussion_id: discussion.id, employee_id: currentEmployeeId, role: 'member' },
            { onConflict: 'discussion_id,employee_id' }
          );
      } catch {}
    } else {
      const isMember = await isDiscussionMember(
        supabase,
        discussion.id,
        currentEmployeeId
      );

      if (!isMember) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const before = url.searchParams.get('before');

    // Reconnect / delta catch-up (fetch newer messages after a timestamp)
    if (since) {
      const sinceDate = new Date(since);

      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid since timestamp' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          discussion_id,
          content,
          attachments,
          created_at,
          employee:employees (
            id,
            name,
            position
          )
        `)
        .eq('discussion_id', discussion.id)
        .gt('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return NextResponse.json({
        discussionId: discussion.id,
        messages: data ?? [],
      });
    }

    // Backward pagination: fetch older messages before a cursor
    if (before) {
      const beforeDate = new Date(before);

      if (Number.isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid before timestamp' },
          { status: 400 }
        );
      }

      const fetchLimit = 51;
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          discussion_id,
          content,
          attachments,
          created_at,
          employee:employees (
            id,
            name,
            position
          )
        `)
        .eq('discussion_id', discussion.id)
        .lt('created_at', beforeDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (error) throw error;

      const rows = data ?? [];
      const hasMore = rows.length === fetchLimit;
      const trimmed = hasMore ? rows.slice(0, 50) : rows;

      return NextResponse.json({
        discussionId: discussion.id,
        messages: trimmed.reverse(),
        hasMore,
      });
    }

    // Default: fetch the latest 50 messages
    const fetchLimit = 51;
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        discussion_id,
        content,
        attachments,
        created_at,
        employee:employees (
          id,
          name,
          position
        )
      `)
      .eq('discussion_id', discussion.id)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length === fetchLimit;
    const trimmed = hasMore ? rows.slice(0, 50) : rows;

    return NextResponse.json({
      discussionId: discussion.id,
      messages: trimmed.reverse(),
      hasMore,
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);

    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// --- POST: send discussion message ---
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;

    if (!rawId) {
      return NextResponse.json(
        { error: 'Invalid discussion ID' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const discussion = await resolveDiscussion(supabase, rawId);
    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found', notFound: true },
        { status: 404 }
      );
    }

    const currentEmployeeId = await getCurrentEmployeeId(
      supabase,
      cookieStore
    );

    if (!currentEmployeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check membership or allow if announcement
    if (discussion.is_announcement) {
      try {
        await supabase
          .from('discussion_members')
          .upsert(
            { discussion_id: discussion.id, employee_id: currentEmployeeId, role: 'member' },
            { onConflict: 'discussion_id,employee_id' }
          );
      } catch {}
    } else {
      const isMember = await isDiscussionMember(
        supabase,
        discussion.id,
        currentEmployeeId
      );

      if (!isMember) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const { data, error } = await supabase
      .from('messages')
      .insert({
        discussion_id: discussion.id,
        employee_id: currentEmployeeId,
        content,
        attachments,
      })
      .select(`
        id,
        discussion_id,
        content,
        attachments,
        created_at,
        employee:employees (
          id,
          name,
          position
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      discussionId: discussion.id,
      message: data,
    });
  } catch (error) {
    console.error('Failed to send message:', error);

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const discussion = await resolveDiscussion(supabase, rawId);
    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    const currentEmployeeId = await getCurrentEmployeeId(
      supabase,
      cookieStore
    );

    if (!currentEmployeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('discussion_id', discussion.id)
      .eq('employee_id', currentEmployeeId);

    if (error) throw error;

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
