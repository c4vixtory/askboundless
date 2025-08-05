
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Define types for Question and Comment, including joined profiles
// Use Partial<Profile> to allow for cases where not all fields are returned,
// and ensure it can be null.
type Profile = Database['public']['Tables']['profiles']['Row'];

type Question = Database['public']['Tables']['questions']['Row'] & {
  profiles: Partial<Profile> | null; // Changed to Partial<Profile> | null
};

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: Partial<Profile> | null; // Changed to Partial<Profile> | null
};

interface QuestionPageProps {
  params: {
    id: string; // The question ID from the URL
  };
}

export default async function QuestionPage({ params }: QuestionPageProps) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const questionId = parseInt(params.id, 10); // Parse the ID from the URL

  if (isNaN(questionId)) {
    // Handle invalid ID gracefully
    return <p className="text-red-500 text-center py-10">Invalid question ID.</p>;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login'); // Redirect if not logged in
  }

  // Fetch the specific question and its author's profile
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .select('*, profiles(id, username, avatar_url)')
    .eq('id', questionId)
    .single(); // Use single() because we expect only one question

  if (questionError || !questionData) {
    console.error('Error fetching question:', questionError);
    return <p className="text-red-500 text-center py-10">Failed to load question.</p>;
  }

  // Fetch comments for this question, joining with profiles for author details
  // Order by is_admin_comment (true first) and then by created_at
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('*, profiles(id, username, avatar_url)')
    .eq('question_id', questionId)
    .order('is_admin_comment', { ascending: false }) // Admins first
    .order('created_at', { ascending: true }); // Then by time

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
    return <p className="text-red-500 text-center py-10">Failed to load comments.</p>;
  }

  const question: Question = questionData; // Type assertion
  const comments: Comment[] = commentsData || []; // Type assertion and default to empty array

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      {/* Back to Home Button */}
      <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Back to all questions
      </Link>

      {/* Question Card */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{question.title}</h1>
        <p className="text-gray-700 mb-4">{question.details}</p>
        <div className="flex items-center text-sm text-gray-500">
          {question.profiles?.avatar_url && (
            <img
              src={question.profiles.avatar_url}
              alt="Author Avatar"
              className="w-6 h-6 rounded-full mr-2"
            />
          )}
          Asked by {question.profiles?.username || 'Anonymous'} on {new Date(question.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Comments ({comments.length})</h2>

        {/* Comment List */}
        {comments.length > 0 ? (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className={`p-4 rounded-lg shadow-sm border ${
                  comment.is_admin_comment
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300' // Highlight for admin comments
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center mb-2">
                  {comment.profiles?.avatar_url && (
                    <img
                      src={comment.profiles.avatar_url}
                      alt="Commenter Avatar"
                      className="w-5 h-5 rounded-full mr-2"
                    />
                  )}
                  <span className="font-medium text-gray-800">
                    {comment.profiles?.username || 'Anonymous'}
                  </span>
                  {comment.is_admin_comment && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                      Admin
                    </span>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg shadow-inner">
            <p className="text-md">No comments yet. Be the first to add one!</p>
          </div>
        )}

        {/* Comment Form (will be added in the next step) */}
        {/* For now, a placeholder */}
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add a Comment</h3>
          <p className="text-gray-600">Comment form will go here.</p>
        </div>
      </div>
    </div>
  );
}
