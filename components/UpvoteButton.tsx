'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Keep this import
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

interface UpvoteButtonProps {
  initialUpvotes: number;
  questionId: number;
}

export default function UpvoteButton({ initialUpvotes, questionId }: UpvoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // <--- ADD THIS LINE
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    async function checkUpvoteStatus() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { count, error } = await supabase
          .from('user_upvotes')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('question_id', questionId);

        if (error) {
          console.error('Error checking upvote status:', error);
        } else {
          setHasUpvoted(count > 0);
        }
      }
      setLoading(false);
    }

    checkUpvoteStatus();
  }, [questionId, supabase]);

  const handleUpvote = async () => {
    if (loading) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to upvote.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/upvote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionId, userId: user.id, isCurrentlyUpvoted: hasUpvoted }),
      });

      if (response.ok) {
        const data = await response.json();
        setUpvotes(data.newUpvoteCount);
        setHasUpvoted(!hasUpvoted);
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error('Failed to update upvote:', errorData.error);
        alert(`Failed to update upvote: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Network error during upvote:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
