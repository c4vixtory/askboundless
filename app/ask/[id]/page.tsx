import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Define types for Question, Comment, and Profile rows from the database
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type CommentRow = Database['public']['Tables']['comments']['Row'];

// Combined types for data with manually joined profiles
type QuestionWithProfile = QuestionRow & {
  profiles: Partial<ProfileRow> | null; // Profile for the question author
};

type CommentWithProfile = CommentRow & {
  authorProfile: Partial<ProfileRow> | null; // Profile for the comment author
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

  // --- FETCH QUESTION AND ITS AUTHOR ---
  // We'll keep the join here as this specific error seems to be for comments-profiles.
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .select('*, profiles(id, username, avatar_url)')
    .eq('id', questionId)
    .single();

  if (questionError || !questionData) {
    console.error('Error fetching question:', questionError);
    return <p className="text-red-500 text-center py-10">Failed to load question.</p>;
  }

  // --- FETCH COMMENTS (WITHOUT JOIN) ---
  const { data: commentsRaw, error: commentsError } = await supabase
    .from('comments')
    .select('*') // Select all columns from the comments table, NO JOIN HERE
    .eq('question_id', questionId)
    .order('is_admin_comment', { ascending: false }) // Admins first
    .order('created_at', { ascending: true }); // Then by time

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
    return <p className="text-red-500 text-center py-10">Failed to load comments.</p>;
  }

  // --- FETCH ALL PROFILES SEPARATELY ---
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url'); // Only fetch necessary profile fields

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    // Log the error but proceed, comments will show 'Anonymous' if profiles fail
  }

  // --- MANUALLY JOIN COMMENTS WITH PROFILES ---
  // Create a map for quick profile lookup by ID
  const profilesMap = new Map<string, Partial<ProfileRow>>();
  profilesData?.forEach(profile => {
    if (profile.id) {
      profilesMap.set(profile.id, profile);
    }
  });

  // Map raw comments to comments with author profiles
  const comments: CommentWithProfile[] = (commentsRaw || []).map(comment => ({
    ...comment,
    authorProfile: profilesMap.get(comment.user_id) || null, // Attach profile or null
  }));

  const question: QuestionWithProfile = questionData; // Type assertion

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
                  {comment.authorProfile?.avatar_url && (
                    <img
                      src={comment.authorProfile.avatar_url}
                      alt="Commenter Avatar"
                      className="w-5 h-5 rounded-full mr-2"
                    />
                  )}
                  <span className="font-medium text-gray-800">
                    {comment.authorProfile?.username || 'Anonymous'}
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
