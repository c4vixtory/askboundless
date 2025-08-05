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

      // 2. Decrement the upvotes count in the questions table
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('questions')
        .update({ upvotes: (await supabase.rpc('decrement_upvotes', { question_id_param: questionId })).data }) // Using RPC for atomic decrement
        .eq('id', questionId)
        .select('upvotes')
        .single();

      if (updateError || !updatedQuestion) {
        console.error('API Error: Failed to decrement question upvotes:', updateError);
        return NextResponse.json({ error: 'Failed to decrement question upvotes.' }, { status: 500 });
      }
      newUpvoteCount = updatedQuestion.upvotes;

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

      // 2. Increment the upvotes count in the questions table
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('questions')
        .update({ upvotes: (await supabase.rpc('increment_upvotes', { question_id_param: questionId })).data }) // Using RPC for atomic increment
        .eq('id', questionId)
        .select('upvotes')
        .single();

      if (updateError || !updatedQuestion) {
        console.error('API Error: Failed to increment question upvotes:', updateError);
        return NextResponse.json({ error: 'Failed to increment question upvotes.' }, { status: 500 });
      }
      newUpvoteCount = updatedQuestion.upvotes;
    }

    return NextResponse.json({ newUpvoteCount }, { status: 200 });

  } catch (err: any) {
    console.error('Upvote API unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
