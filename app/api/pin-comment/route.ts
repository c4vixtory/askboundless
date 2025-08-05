import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';
import { revalidatePath } from 'next/cache'; // Import revalidatePath

export async function POST(request: Request) {
  const { commentId, questionId, isCurrentlyPinned } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: No active session.' }, { status: 401 });
  }

  const userId = session.user.id;

  // --- Check if the user has permission to pin comments (admin, me, or og) ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching user profile for pin permission check:', profileError);
    return NextResponse.json({ error: 'Failed to verify user permissions.' }, { status: 500 });
  }

  const userRole = profile.role || 'user';
  if (userRole !== 'admin' && userRole !== 'me' && userRole !== 'og') {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to pin comments.' }, { status: 403 });
  }
  // --- End permission check ---

  try {
    const { data, error } = await supabase
      .from('comments')
      .update({ is_pinned: !isCurrentlyPinned }) // Toggle the pinned status
      .eq('id', commentId)
      .select('is_pinned') // Select the updated status
      .single();

    if (error) {
      console.error('Error updating comment pinned status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate the specific question page to show the updated comments order
    revalidatePath(`/ask/${questionId}`);

    return NextResponse.json({ message: 'Comment pinned status updated successfully!', isPinned: data.is_pinned }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in pin-comment API:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
