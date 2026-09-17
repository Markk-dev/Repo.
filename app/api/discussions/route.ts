import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { SESSION_COOKIE_NAME } from '@/utils/session-config';
import { EMPLOYEES } from '@/constants/employees';

async function getCurrentEmployee(
  supabase: ReturnType<typeof createAdminClient>,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const sessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionKey) {
    // Development fallback to primary administrator employee
    const defaultEmp = EMPLOYEES[0];
    const { data: dbEmp } = await supabase
      .from('employees')
      .select('id, employee_id, name, position, program')
      .eq('employee_id', defaultEmp.employeeId)
      .maybeSingle();

    return {
      id: dbEmp?.id || defaultEmp.employeeId,
      employeeId: defaultEmp.employeeId,
      name: defaultEmp.name,
      position: defaultEmp.position,
      isAdmin: true,
    };
  }

  if (sessionKey.startsWith('local_')) {
    const parts = sessionKey.split('_');
    if (parts.length < 2 || !parts[1]) return null;
    let employeeId: string;
    try {
      employeeId = Buffer.from(parts[1], 'base64').toString('utf-8');
    } catch {
      return null;
    }
    const localEmployee = EMPLOYEES.find(
      (e) => e.employeeId.toLowerCase() === employeeId.toLowerCase()
    );
    if (!localEmployee) return null;

    const { data: dbEmp } = await supabase
      .from('employees')
      .select('id, employee_id, name, position, program')
      .eq('employee_id', localEmployee.employeeId)
      .maybeSingle();

    return {
      id: dbEmp?.id || localEmployee.employeeId,
      employeeId: localEmployee.employeeId,
      name: localEmployee.name,
      position: localEmployee.position,
      isAdmin: localEmployee.position.includes('Admin') || localEmployee.employeeId === '26-008-0005',
    };
  }

  const { data: sessionData } = await supabase
    .from('user_sessions')
    .select(`
      employee:employees ( id, employee_id, name, position, program )
    `)
    .eq('session_key', sessionKey)
    .eq('is_valid', true)
    .maybeSingle();

  if (!sessionData?.employee) return null;
  const emp = sessionData.employee as any;
  return {
    id: emp.id,
    employeeId: emp.employee_id,
    name: emp.name,
    position: emp.position,
    isAdmin: emp.position?.includes('Admin') || emp.employee_id === '26-008-0005',
  };
}

// POST /api/discussions - Create a new discussion under a section
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const currentEmployee = await getCurrentEmployee(supabase, cookieStore);
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const sectionId = body.sectionId || body.section_id;
    const name = typeof body.name === 'string' ? body.name.trim().toLowerCase().replace(/\s+/g, '-') : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const icon = typeof body.icon === 'string' ? body.icon.trim() : 'hash';
    const isAnnouncement = !!body.is_announcement || !!body.isAnnouncement;

    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Discussion name is required' }, { status: 400 });
    }

    // Get max order index in this section
    const { data: existing } = await supabase
      .from('discussions')
      .select('order_index')
      .eq('section_id', sectionId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

    const { data: newDiscussion, error } = await supabase
      .from('discussions')
      .insert({
        section_id: sectionId,
        name,
        topic,
        icon,
        is_announcement: isAnnouncement,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically add creator as discussion member
    try {
      await supabase
        .from('discussion_members')
        .insert({
          discussion_id: newDiscussion.id,
          employee_id: currentEmployee.id,
          role: 'admin',
        })
        .select('id')
        .maybeSingle();
    } catch (memberErr) {
      console.warn('Could not add creator to discussion_members:', memberErr);
    }

    return NextResponse.json({ discussion: newDiscussion });
  } catch (error: any) {
    console.error('Failed to create discussion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create discussion' },
      { status: 500 }
    );
  }
}

// DELETE /api/discussions - Delete a discussion by ID
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const currentEmployee = await getCurrentEmployee(supabase, cookieStore);
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id || body.discussionId;
      } catch {
        // body might be empty if query param was passed
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Discussion ID is required' }, { status: 400 });
    }

    // Protect system announcement discussion from deletion
    const { data: targetDisc } = await supabase
      .from('discussions')
      .select('id, is_announcement, name')
      .eq('id', id)
      .maybeSingle();

    if (targetDisc?.is_announcement || targetDisc?.name?.toLowerCase() === 'announcements') {
      return NextResponse.json(
        { error: 'The primary announcement channel cannot be deleted.' },
        { status: 400 }
      );
    }

    // Delete memberships first
    try {
      await supabase.from('discussion_members').delete().eq('discussion_id', id);
    } catch (e) {
      console.warn('Could not delete discussion_members:', e);
    }

    // Delete messages
    try {
      await supabase.from('messages').delete().eq('discussion_id', id);
    } catch (e) {
      console.warn('Could not delete messages:', e);
    }

    // Delete discussion
    const { error } = await supabase.from('discussions').delete().eq('id', id);

    if (error) {
      console.error('Database error deleting discussion:', error);
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Discussion deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete discussion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete discussion' },
      { status: 500 }
    );
  }
}
