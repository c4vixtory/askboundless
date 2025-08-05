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

  // --- NEW: Check the user's role ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role') // <-- Select the 'role' column instead of 'is_admin'
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile for role check:', profileError);
    return NextResponse.json({ error: 'Failed to verify user status.' }, { status: 500 });
  }

  const userRole = profile?.role || 'user'; // Default to 'user' if role not found or null

  // --- Conditional: Implement daily question limit ONLY if user is NOT admin or ME ---
  if (userRole !== 'admin' && userRole !== 'me') { // <-- Check for both 'admin' and 'me' roles
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo);

    if (countError) {
      console.error('Error counting user questions:', countError);
      return NextResponse.json({ error: 'Failed to check question limit.' }, { status: 500 });
    }

    if (count && count >= 3) {
      return NextResponse.json({ error: 'You can only ask 3 questions per day. Please try again tomorrow.' }, { status: 429 });
    }
  }
  // --- END Conditional: Implement daily question limit ---

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
