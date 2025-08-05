// Force dynamic rendering for this page to ensure fresh data on every request
export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CommentForm from '@/components/CommentForm';

// Define base types from the database
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type CommentRow = Database['public']['Tables']['comments']['Row'];

// Combined types for data with manually joined profiles and is_pinned status
type QuestionWithProfile = QuestionRow & {
  authorProfile: Partial<ProfileRow> | null; // Profile for the question author
};

type CommentWithProfile = CommentRow & {
  authorProfile: Partial<ProfileRow> | null; // Profile for the comment author
};

interface QuestionPageProps {
  params: {
    id: string; // The question ID from the URL
  };
}

export default function QuestionPage({ params }: QuestionPageProps) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const questionId = parseInt(params.id, 10);

  const [question, setQuestion] = useState<QuestionWithProfile | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        router.push('/login');
        return;
      }

      const currentUserId = currentSession.user.id;

      // --- FETCH ALL PROFILES SEPARATELY FIRST ---
      const { data: fetchedProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setError('Failed to load user profiles.');
        setLoading(false);
        return;
      }
      const profilesData = fetchedProfiles || [];
      const profilesMap = new Map<string, Partial<ProfileRow>>();
      profilesData.forEach(profile => {
        if (profile.id) {
          profilesMap.set(profile.id, profile);
        }
      });

      // Determine current user's role
      const currentUserProfile = profilesMap.get(currentUserId);
      setUserRole(currentUserProfile?.role || 'user');

      // --- FETCH THE SPECIFIC QUESTION ---
      // Data will be fresh due to 'force-dynamic' on the page
      const { data: questionRaw, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (questionError || !questionRaw) {
        console.error('Error fetching question:', questionError);
        setError('Failed to load question.');
        setLoading(false);
        return;
      }
      setQuestion({
        ...questionRaw,
        authorProfile: profilesMap.get(questionRaw.user_id) || null,
      });

      // --- FETCH COMMENTS FOR THIS QUESTION ---
      // Data will be fresh due to 'force-dynamic' on the page
      const { data: commentsRaw, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('question_id', questionId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        setError('Failed to load comments.');
        setLoading(false);
        return;
      }

      const commentsWithProfiles: CommentWithProfile[] = (commentsRaw || []).map(comment => ({
        ...comment,
        authorProfile: profilesMap.get(comment.user_id) || null,
      }));
      setComments(commentsWithProfiles);
      setLoading(false);
    }

    if (!isNaN(questionId)) {
      fetchData();
    }
  }, [questionId, supabase, router]);

  const handlePinToggle = async (commentId: string, isCurrentlyPinned: boolean) => {
    if (userRole !== 'admin' && userRole !== 'me' && userRole !== 'og') {
      alert('You do not have permission to pin comments.');
      return;
    }

    try {
      const response = await fetch('/api/pin-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId, questionId, isCurrentlyPinned }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(`Failed to update pin status: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Network error during pin toggle:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  if (isNaN(questionId)) {
    return <p className="text-red-500 text-center py-10">Invalid question ID.</p>;
  }

  if (loading) {
    return <p className="text-center py-10">Loading question and comments...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }

  if (!question) {
    return <p className="text-center py-10">Question not found.</p>;
  }

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
        <Link href={question.authorProfile?.username ? `https://x.com/${question.authorProfile.username}` : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-500 hover:underline hover:text-blue-500">
          {question.authorProfile?.avatar_url && (
            <img
              src={question.authorProfile.avatar_url}
              alt="Author Avatar"
              className="w-6 h-6 rounded-full mr-2"
            />
          )}
          <span className="flex items-center">
            Asked by {question.authorProfile?.username || 'Anonymous'}
            {question.authorProfile?.role === 'admin' && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                Admin
              </span>
            )}
            {question.authorProfile?.role === 'me' && (
              <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                ME
              </span>
            )}
            {question.authorProfile?.role === 'og' && (
              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                OG
              </span>
            )}
          </span>
          <span className="ml-1">on {new Date(question.created_at).toLocaleString()}</span>
        </Link>
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
                  comment.is_pinned
                    ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-400'
                    : comment.is_admin_comment
                      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center mb-2">
                  <Link href={comment.authorProfile?.username ? `https://x.com/${comment.authorProfile.username}` : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline hover:text-blue-500">
                    {comment.authorProfile?.avatar_url && (
                      <img
                        src={comment.authorProfile.avatar_url}
                        alt="Commenter Avatar"
                        className="w-5 h-5 rounded-full mr-2"
                      />
                    )}
                    <span className="font-medium text-gray-800 flex items-center">
                      {comment.authorProfile?.username || 'Anonymous'}
                      {comment.authorProfile?.role === 'admin' && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                          Admin
                        </span>
                      )}
                      {comment.authorProfile?.role === 'me' && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                          ME
                        </span>
                      )}
                      {comment.authorProfile?.role === 'og' && (
                        <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                          OG
                        </span>
                      )}
                    </span>
                  </Link>
                  <span className="text-xs text-gray-500 ml-auto flex items-center">
                    {comment.is_pinned && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                    )}
                    {new Date(comment.created_at).toLocaleString()}
                    {(userRole === 'admin' || userRole === 'me' || userRole === 'og') && (
                      <button
                        onClick={() => handlePinToggle(comment.id, comment.is_pinned)}
                        className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full transition-colors duration-200
                          ${comment.is_pinned ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                        `}
                      >
                        {comment.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
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

        {/* Comment Form */}
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add a Comment</h3>
          {session && <CommentForm questionId={question.id} userId={session.user.id} />}
          {!session && <p className="text-gray-500">Please log in to add a comment.</p>}
        </div>
      </div>
    </div>
  );
}
