import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  const { questionId, userId, hasUpvoted } = await request.json();
  const supabase = createRouteHandlerClient<Database>({ cookies });

  try {
    if (hasUpvoted) {
      // User has upvoted, so they want to UN-UPVOTE
      // 1. Delete the entry from user_upvotes
      const { error: deleteError } = await supabase
        .from('user_upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);

      if (deleteError) {
        console.error('Error deleting upvote record:', deleteError);
        throw new Error('Failed to remove upvote record.');
      }

      // 2. Decrement the upvotes count in the questions table
      const { data: questionData, error: updateError } = await supabase
        .from('questions')
        .update({ upvotes: Math.max(0, (await supabase.from('questions').select('upvotes').eq('id', questionId).single()).data?.upvotes! - 1) }) // Ensure upvotes don't go below 0
        .eq('id', questionId)
        .select('upvotes') // Select the updated upvotes count
        .single();

      if (updateError) {
        console.error('Error decrementing question upvotes:', updateError);
        throw new Error('Failed to decrement question upvotes.');
      }

      return NextResponse.json({ newUpvoteCount: questionData.upvotes }, { status: 200 });

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
        throw new Error('Failed to record upvote.');
      }

      // 2. Increment the upvotes count in the questions table
      const { data: questionData, error: updateError } = await supabase
        .from('questions')
        .update({ upvotes: (await supabase.from('questions').select('upvotes').eq('id', questionId).single()).data?.upvotes! + 1 })
        .eq('id', questionId)
        .select('upvotes') // Select the updated upvotes count
        .single();

      if (updateError) {
        console.error('Error incrementing question upvotes:', updateError);
        throw new Error('Failed to increment question upvotes.');
      }

      return NextResponse.json({ newUpvoteCount: questionData.upvotes }, { status: 200 });
    }
  } catch (err: any) {
    console.error('Upvote API unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

