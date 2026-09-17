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
  if (!sessionKey) return null;

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

// GET /api/sections - List all sections with nested discussions
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const currentEmployee = await getCurrentEmployee(supabase, cookieStore);
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sections, error } = await supabase
      .from('sections')
      .select(`
        id,
        name,
        description,
        order_index,
        created_at,
        discussions (
          id,
          name,
          topic,
          icon,
          is_announcement,
          order_index,
          created_at
        )
      `)
      .neq('name', 'SYSTEM_ANNOUNCEMENTS')
      .order('order_index', { ascending: true });

    if (error) throw error;

    // Ensure child discussions exclude announcements and are sorted by order_index
    const sortedSections = (sections || []).map((sec: any) => ({
      ...sec,
      discussions: (sec.discussions || [])
        .filter((d: any) => !d.is_announcement && d.name?.toLowerCase() !== 'announcements')
        .sort((a: any, b: any) => a.order_index - b.order_index),
    }));

    return NextResponse.json({ sections: sortedSections });
  } catch (error: any) {
    console.error('Failed to fetch sections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

// POST /api/sections - Create a new section (Admin only)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const currentEmployee = await getCurrentEmployee(supabase, cookieStore);
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentEmployee.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can create sections' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().toUpperCase() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Section name is required' }, { status: 400 });
    }

    // Get max order index
    const { data: existing } = await supabase
      .from('sections')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

    const { data: newSection, error } = await supabase
      .from('sections')
      .insert({
        name,
        description,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ section: newSection });
  } catch (error: any) {
    console.error('Failed to create section:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create section' },
      { status: 500 }
    );
  }
}

// DELETE /api/sections - Delete a section and all its child discussions/messages (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    const currentEmployee = await getCurrentEmployee(supabase, cookieStore);
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentEmployee.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete sections' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id || body.sectionId;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
    }

    // Protect system section
    const { data: targetSec } = await supabase
      .from('sections')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (targetSec?.name === 'SYSTEM_ANNOUNCEMENTS') {
      return NextResponse.json(
        { error: 'The system announcement section cannot be deleted.' },
        { status: 400 }
      );
    }

    // 1. Find all non-announcement discussions belonging to this section
    const { data: discussions } = await supabase
      .from('discussions')
      .select('id, is_announcement, name')
      .eq('section_id', id);

    const nonAnnouncementDiscs = (discussions || []).filter(
      (d) => !d.is_announcement && d.name?.toLowerCase() !== 'announcements'
    );
    const discussionIds = nonAnnouncementDiscs.map((d) => d.id);

    if (discussionIds.length > 0) {
      // 2. Delete messages for these discussions
      try {
        await supabase.from('messages').delete().in('discussion_id', discussionIds);
      } catch (e) {
        console.warn('Failed to delete section messages:', e);
      }

      // 3. Delete discussion members
      try {
        await supabase.from('discussion_members').delete().in('discussion_id', discussionIds);
      } catch (e) {
        console.warn('Failed to delete section discussion_members:', e);
      }

      // 4. Delete child discussions
      try {
        await supabase.from('discussions').delete().eq('section_id', id);
      } catch (e) {
        console.warn('Failed to delete section discussions:', e);
      }
    }

    // 5. Delete section
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete section:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete section' },
      { status: 500 }
    );
  }
}

