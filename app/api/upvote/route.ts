import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  // Renamed hasUpvoted to isCurrentlyUpvoted to match client
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
        console.error('Error deleting upvote record:', deleteError);
        return NextResponse.json({ error: 'Failed to remove upvote record.' }, { status: 500 });
      }

      // 2. Decrement the upvotes count in the questions table
      // Fetch current upvotes to ensure we don't go below zero
      const { data: currentQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();

      if (fetchError || !currentQuestion) {
        console.error('Error fetching current upvotes for decrement:', fetchError);
        return NextResponse.json({ error: 'Failed to retrieve current upvotes.' }, { status: 500 });
      }

      newUpvoteCount = Math.max(0, currentQuestion.upvotes - 1);

      const { error: updateError } = await supabase
        .from('questions')
        .update({ upvotes: newUpvoteCount })
        .eq('id', questionId);

      if (updateError) {
        console.error('Error decrementing question upvotes:', updateError);
        return NextResponse.json({ error: 'Failed to decrement question upvotes.' }, { status: 500 });
      }

    } else {
      // User has NOT upvoted, so they want to UPVOTE
      // 1. Insert a new entry into user_upvotes
      const { error: insertError } = await supabase
        .from('user_upvotes')
        .insert({ user_id: userId, question_id: questionId });

      if (insertError) {
        // If this is a unique constraint violation (user already upvoted), handle gracefully
        if (insertError.code === '23505') { // PostgreSQL unique_violation error code
          return NextResponse.json({ error: 'Already upvoted.' }, { status: 409 });
        }
        console.error('Error inserting upvote record:', insertError);
        return NextResponse.json({ error: 'Failed to record upvote.' }, { status: 500 });
      }

      // 2. Increment the upvotes count in the questions table
      // Fetch current upvotes
      const { data: currentQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();

      if (fetchError || !currentQuestion) {
        console.error('Error fetching current upvotes for increment:', fetchError);
        return NextResponse.json({ error: 'Failed to retrieve current upvotes.' }, { status: 500 });
      }

      newUpvoteCount = currentQuestion.upvotes + 1;

      const { error: updateError } = await supabase
        .from('questions')
        .update({ upvotes: newUpvoteCount })
        .eq('id', questionId);

      if (updateError) {
        console.error('Error incrementing question upvotes:', updateError);
        return NextResponse.json({ error: 'Failed to increment question upvotes.' }, { status: 500 });
      }
    }

    // After successful operation, fetch the final upvote count from the database
    // to ensure consistency, then return it.
    const { data: finalQuestion, error: finalFetchError } = await supabase
        .from('questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();

    if (finalFetchError || !finalQuestion) {
        console.error('Error fetching final upvote count:', finalFetchError);
        return NextResponse.json({ error: 'Failed to retrieve final upvote count.' }, { status: 500 });
    }

    return NextResponse.json({ newUpvoteCount: finalQuestion.upvotes }, { status: 200 });

  } catch (err: any) {
    console.error('Upvote API unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
