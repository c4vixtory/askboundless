import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';
// import { revalidateTag } from 'next/cache'; // No longer needed for real-time updates

export async function POST(request: Request) {
  const { question_id, user_id, content } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== user_id) {
    return NextResponse.json({ error: 'Unauthorized: User ID mismatch or not logged in.' }, { status: 401 });
  }

  let shouldBeAdminComment = false;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user_id)
    .single();

  if (profileError) {
    console.error('Error fetching profile for comment admin check:', profileError);
  } else {
    const userRole = profile?.role || 'user';
    if (userRole === 'admin' || userRole === 'me' || userRole === 'og') {
      shouldBeAdminComment = true;
    }
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        question_id,
        user_id,
        content,
        is_admin_comment: shouldBeAdminComment,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No longer needed as client-side real-time subscription handles UI updates

    return NextResponse.json({ message: 'Comment submitted successfully!', comment: data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in comments API:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
