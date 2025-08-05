import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  const { title, details } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // --- NEW: Implement daily question limit ---
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', twentyFourHoursAgo); // Check questions created in the last 24 hours

  if (countError) {
    console.error('Error counting user questions:', countError);
    return NextResponse.json({ error: 'Failed to check question limit.' }, { status: 500 });
  }

  if (count && count >= 3) { // Allow 3 questions, so if count is 3 or more, reject
    return NextResponse.json({ error: 'You can only ask 3 questions per day. Please try again tomorrow.' }, { status: 429 }); // 429 Too Many Requests
  }
  // --- END NEW: Implement daily question limit ---

  try {
    const { data, error } = await supabase
      .from('questions')
      .insert({ title, details, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Error inserting question:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Question submitted successfully!', question: data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in ask API:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
