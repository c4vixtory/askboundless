import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  const { question_id, user_id, content } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // For now, is_admin_comment is always false.
  // We'll implement admin detection later.
  const is_admin_comment = false; 

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        question_id,
        user_id,
        content,
        is_admin_comment,
      })
      .select() // Select the inserted row to return it
      .single(); // Expect a single inserted row

    if (error) {
      console.error('Error inserting comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Comment submitted successfully!', comment: data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in comments API:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

