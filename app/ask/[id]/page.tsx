'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CommentForm from '@/components/CommentForm';
import UpvoteButton from '@/components/UpvoteButton';

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
  const [profilesMap, setProfilesMap] = useState<Map<string, Partial<ProfileRow>>>(new Map()); // Store profiles map in state

  // useCallback to memoize the fetch function, preventing unnecessary re-creations
  const fetchQuestionAndComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);

    if (!currentSession) {
      router.push('/login');
      setLoading(false); // Ensure loading is false on redirect
      return;
    }

    const currentUserId = currentSession.user.id;

    try {
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
      const newProfilesMap = new Map<string, Partial<ProfileRow>>();
      (fetchedProfiles || []).forEach(profile => {
        if (profile.id) {
          newProfilesMap.set(profile.id, profile);
        }
      });
      setProfilesMap(newProfilesMap); // Update profiles map in state

      // Determine current user's role
      const currentUserProfile = newProfilesMap.get(currentUserId);
      setUserRole(currentUserProfile?.role || 'user');

      // --- FETCH THE SPECIFIC QUESTION ---
      const { data: questionRaw, error: questionError } = await supabase
        .from('questions')
        .select('*', {
          // @ts-ignore
          next: { tags: ['questions'] },
        })
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
        authorProfile: newProfilesMap.get(questionRaw.user_id) || null,
      });

      // --- FETCH COMMENTS FOR THIS QUESTION ---
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
        authorProfile: newProfilesMap.get(comment.user_id) || null,
      }));
      setComments(commentsWithProfiles);
    } catch (err) {
      console.error('Unexpected error during data fetch:', err);
      setError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false); // Always set loading to false
    }
  }, [questionId, supabase, router]); // Dependencies for useCallback

  useEffect(() => {
    if (isNaN(questionId)) {
      setError('Invalid question ID.');
      setLoading(false);
      return;
    }

    fetchQuestionAndComments(); // Initial fetch

    // --- Real-time Listener for Comments ---
    const commentsChannel = supabase
      .channel(`comments_for_question:${questionId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'comments',
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          setComments((prevComments) => {
            let newComments = [...prevComments];
            const newCommentData = payload.new as CommentRow;
            const oldCommentData = payload.old as CommentRow;

            // Helper to get a comment with its profile attached using the existing profilesMap
            const getCommentWithProfile = (comment: CommentRow): CommentWithProfile => {
              return {
                ...comment,
                authorProfile: profilesMap.get(comment.user_id) || null,
              };
            };

            if (payload.eventType === 'INSERT') {
              newComments.push(getCommentWithProfile(newCommentData));
            } else if (payload.eventType === 'UPDATE') {
              const index = newComments.findIndex(c => c.id === newCommentData.id);
              if (index !== -1) {
                newComments[index] = getCommentWithProfile(newCommentData);
              }
            } else if (payload.eventType === 'DELETE') {
              newComments = newComments.filter(c => c.id !== oldCommentData.id);
            }

            // Re-sort comments after any change
            newComments.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            return newComments; // IMPORTANT: Return the updated array synchronously
          });
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [questionId, supabase, fetchQuestionAndComments, profilesMap]); // Added profilesMap to dependencies

  const handlePinToggle = async (commentId: string, isCurrentlyPinned: boolean) => {
    if (userRole !== 'admin' && userRole !== 'me' && userRole !== 'og') {
      // Using a custom modal for alerts would be better here
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

      if (!response.ok) {
        const errorData = await response.json();
        // Using a custom modal for alerts would be better here
        alert(`Failed to update pin status: ${errorData.error}`);
      }
      // No need for router.refresh() here, real-time listener will update UI
    } catch (err) {
      console.error('Network error during pin toggle:', err);
      // Using a custom modal for alerts would be better here
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
