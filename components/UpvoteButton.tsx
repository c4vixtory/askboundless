'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

interface UpvoteButtonProps {
  initialUpvotes: number;
  questionId: number;
}

export default function UpvoteButton({ initialUpvotes, questionId }: UpvoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true); // Manages initial load and API call state
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    let unsubscribeUpvotes: () => void;
    let unsubscribeUserUpvotes: () => void;

    async function setupRealtimeListeners() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // --- 1. Initial Fetch for Upvote Count ---
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();

      if (questionError) {
        console.error('Error fetching initial question upvotes:', questionError);
      } else if (questionData) {
        setUpvotes(questionData.upvotes);
      }

      // --- 2. Initial Fetch for User's Upvote Status ---
      if (currentUserId) {
        const { count, error } = await supabase
          .from('user_upvotes')
          .select('*', { count: 'exact' })
          .eq('user_id', currentUserId)
          .eq('question_id', questionId);

        if (error) {
          console.error('Error checking initial user upvote status:', error);
        } else {
          setHasUpvoted(count > 0);
        }
      }
      setLoading(false); // Initial loading complete

      // --- 3. Real-time Listener for Question Upvotes ---
      const upvotesChannel = supabase
        .channel(`question_upvotes:${questionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'questions',
            filter: `id=eq.${questionId}`,
          },
          (payload) => {
            const newUpvotes = (payload.new as Database['public']['Tables']['questions']['Row']).upvotes;
            if (typeof newUpvotes === 'number') {
              setUpvotes(newUpvotes);
            }
          }
        )
        .subscribe();

      unsubscribeUpvotes = () => {
        supabase.removeChannel(upvotesChannel);
      };

      // --- 4. Real-time Listener for User's Specific Upvote ---
      if (currentUserId) {
        const userUpvotesChannel = supabase
          .channel(`user_upvote:${currentUserId}:${questionId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen for INSERT or DELETE events
              schema: 'public',
              table: 'user_upvotes',
              filter: `user_id=eq.${currentUserId}&question_id=eq.${questionId}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setHasUpvoted(true);
              } else if (payload.eventType === 'DELETE') {
                setHasUpvoted(false);
              }
            }
          )
          .subscribe();

        unsubscribeUserUpvotes = () => {
          supabase.removeChannel(userUpvotesChannel);
        };
      }

      // Cleanup function for useEffect
      return () => {
        if (unsubscribeUpvotes) unsubscribeUpvotes();
        if (unsubscribeUserUpvotes) unsubscribeUserUpvotes();
      };
    }

    setupRealtimeListeners();
  }, [questionId, supabase]); // Dependencies: questionId and supabase client

  const handleUpvote = async () => {
    if (loading) return; // Prevent multiple clicks during API call
    setLoading(true); // Set loading state for the click action

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to upvote.');
      setLoading(false);
      return;
    }

    try {
      // API call to toggle upvote status in the database
      const response = await fetch('/api/upvote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionId, userId: user.id, isCurrentlyUpvoted: hasUpvoted }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to update upvote via API:', errorData.error);
        alert(`Failed to update upvote: ${errorData.error}`);
      }
      // No need to update local state here, real-time listener will handle it
      // No need for router.refresh() here either, real-time listener will update UI
    } catch (error) {
      console.error('Network error during upvote API call:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <button
      onClick={handleUpvote}
      className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors duration-200
        ${hasUpvoted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      disabled={loading}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 8.293a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
      <span>{upvotes}</span>
    </button>
  );
}
