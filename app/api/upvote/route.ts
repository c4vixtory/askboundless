import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  const { questionId, userId, isCurrentlyUpvoted } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  try {
    let newUpvoteCount = 0;

    if (isCurrentlyUpvoted) {
      // User has upvoted, so they want to UN-UPVOTE
      // 1. Delete the entry from user_upvotes
      const { error: deleteError } = await supabase
        .from('user_upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);

      if (deleteError) {
        console.error('API Error: Failed to delete upvote record:', deleteError);
        return NextResponse.json({ error: 'Failed to remove upvote record.' }, { status: 500 });
      }

      // 2. Call the RPC to decrement upvotes and get the new count
      const { data: decrementedCount, error: rpcError } = await supabase.rpc('decrement_upvotes', { question_id_param: questionId });

      if (rpcError || decrementedCount === null) {
        console.error('API Error: Failed to call decrement_upvotes RPC:', rpcError);
        return NextResponse.json({ error: 'Failed to decrement question upvotes via RPC.' }, { status: 500 });
      }
      newUpvoteCount = decrementedCount;

    } else {
      // User has NOT upvoted, so they want to UPVOTE
      // 1. Insert a new entry into user_upvotes
      const { error: insertError } = await supabase
        .from('user_upvotes')
        .insert({ user_id: userId, question_id: questionId });

      if (insertError) {
        if (insertError.code === '23505') { // PostgreSQL unique_violation error code
          return NextResponse.json({ error: 'Already upvoted.' }, { status: 409 });
        }
        console.error('API Error: Failed to insert upvote record:', insertError);
        return NextResponse.json({ error: 'Failed to record upvote.' }, { status: 500 });
      }

      // 2. Call the RPC to increment upvotes and get the new count
      const { data: incrementedCount, error: rpcError } = await supabase.rpc('increment_upvotes', { question_id_param: questionId });

      if (rpcError || incrementedCount === null) {
        console.error('API Error: Failed to call increment_upvotes RPC:', rpcError);
        return NextResponse.json({ error: 'Failed to increment question upvotes via RPC.' }, { status: 500 });
      }
      newUpvoteCount = incrementedCount;
    }

    return NextResponse.json({ newUpvoteCount }, { status: 200 });

  } catch (err: any) {
    console.error('Upvote API unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
