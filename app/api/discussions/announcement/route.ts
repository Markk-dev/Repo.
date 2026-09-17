import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

// GET /api/discussions/announcement - Retrieve or initialize the primary Announcement discussion
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createAdminClient(cookieStore);

    // 1. Ensure a dedicated SYSTEM_ANNOUNCEMENTS section exists
    let { data: systemSection } = await supabase
      .from('sections')
      .select('id')
      .eq('name', 'SYSTEM_ANNOUNCEMENTS')
      .maybeSingle();

    if (!systemSection) {
      const { data: newSec, error: secErr } = await supabase
        .from('sections')
        .insert({
          name: 'SYSTEM_ANNOUNCEMENTS',
          description: 'Dedicated system section for announcement channel',
          order_index: -100,
        })
        .select('id')
        .single();

      if (secErr) throw secErr;
      systemSection = newSec;
    }

    // 2. Check if an announcement discussion already exists
    let { data: existingDisc } = await supabase
      .from('discussions')
      .select('id, section_id, name, topic, icon, is_announcement')
      .eq('is_announcement', true)
      .limit(1)
      .maybeSingle();

    if (!existingDisc) {
      // Also check if a discussion named 'announcements' exists
      const { data: namedDisc } = await supabase
        .from('discussions')
        .select('id, section_id, name, topic, icon, is_announcement')
        .ilike('name', 'announcements')
        .limit(1)
        .maybeSingle();

      if (namedDisc) {
        existingDisc = namedDisc;
      }
    }

    if (existingDisc) {
      // Re-home to SYSTEM_ANNOUNCEMENTS if it was placed in a regular section
      if (existingDisc.section_id !== systemSection!.id) {
        await supabase
          .from('discussions')
          .update({ section_id: systemSection!.id, is_announcement: true })
          .eq('id', existingDisc.id);
        existingDisc.section_id = systemSection!.id;
        existingDisc.is_announcement = true;
      }
      return NextResponse.json({ discussion: existingDisc });
    }

    // 3. Create dedicated announcement discussion under SYSTEM_ANNOUNCEMENTS
    const { data: newAnnouncement, error: discErr } = await supabase
      .from('discussions')
      .insert({
        section_id: systemSection!.id,
        name: 'announcements',
        topic: 'Official Department Announcements & Bulletins',
        icon: 'megaphone-simple',
        is_announcement: true,
        order_index: 0,
      })
      .select()
      .single();

    if (discErr) throw discErr;

    // Seed memberships for employees
    try {
      const { data: emps } = await supabase.from('employees').select('id');
      if (emps && emps.length > 0) {
        const members = emps.map((e) => ({
          discussion_id: newAnnouncement.id,
          employee_id: e.id,
          role: 'member',
        }));
        await supabase.from('discussion_members').upsert(members, { onConflict: 'discussion_id,employee_id' });
      }
    } catch (memberErr) {
      console.warn('Could not auto-seed announcement members:', memberErr);
    }

    return NextResponse.json({ discussion: newAnnouncement });
  } catch (error: any) {
    console.error('Failed to get/create announcement discussion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize announcement channel' },
      { status: 500 }
    );
  }
}
