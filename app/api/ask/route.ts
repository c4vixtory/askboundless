import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Create a Supabase server client
  const supabase = createClient();
  
  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Check if a user is logged in
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse the request body for the title and details
  const body = await req.json();
  const { title, details } = body;

  // Insert the new question into the 'questions' table
  const { error } = await supabase.from('questions').insert({
    title,
    details,
    user_id: user.id,
  });

  if (error) {
    console.error('Error inserting question:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new NextResponse(
    JSON.stringify({ message: 'Question submitted successfully' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
