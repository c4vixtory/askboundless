import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';
import { revalidateTag } from 'next/cache'; // Import revalidateTag

export async function POST(request: Request) {
  const { questionId, userId, isCurrentlyUpvoted } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  try {
    let newUpvoteCount = 0;

    if (isCurrentlyUpvoted) {
      // User has upvoted, so they want to UN-UPVOTE
      const { error: deleteError } = await supabase
        .from('user_upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);

      if (deleteError) {
        console.error('API Error: Failed to delete upvote record:', deleteError);
        return NextResponse.json({ error: 'Failed to remove upvote record.' }, { status: 500 });
      }

      const { data: decrementedCount, error: rpcError } = await supabase.rpc('decrement_upvotes', { question_id_param: questionId });

      if (rpcError || decrementedCount === null) {
        console.error('API Error: Failed to call decrement_upvotes RPC:', rpcError);
        return NextResponse.json({ error: 'Failed to decrement question upvotes via RPC.' }, { status: 500 });
      }
      newUpvoteCount = decrementedCount;

    } else {
      // User has NOT upvoted, so they want to UPVOTE
      const { error: insertError } = await supabase
        .from('user_upvotes')
        .insert({ user_id: userId, question_id: questionId });

      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({ error: 'Already upvoted.' }, { status: 409 });
        }
        console.error('API Error: Failed to insert upvote record:', insertError);
        return NextResponse.json({ error: 'Failed to record upvote.' }, { status: 500 });
      }

      const { data: incrementedCount, error: rpcError } = await supabase.rpc('increment_upvotes', { question_id_param: questionId });

      if (rpcError || incrementedCount === null) {
        console.error('API Error: Failed to call increment_upvotes RPC:', rpcError);
        return NextResponse.json({ error: 'Failed to increment question upvotes via RPC.' }, { status: 500 });
      }
      newUpvoteCount = incrementedCount;
    }

    // --- NEW: Revalidate the 'questions' tag ---
    revalidateTag('questions'); // Invalidate cache for all fetches tagged 'questions'

    return NextResponse.json({ newUpvoteCount }, { status: 200 });

  } catch (err: any) {
    console.error('Upvote API unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
