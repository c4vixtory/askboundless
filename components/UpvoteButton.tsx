'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Database } from '@/types/supabase';

interface UpvoteButtonProps {
  initialUpvotes: number;
  questionId: number;
}

export default function UpvoteButton({ initialUpvotes, questionId }: UpvoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const handleUpvote = async () => {
    // Increment the upvote count locally for a faster UI update
    setUpvotes(upvotes + 1);

    // Call Supabase to update the upvotes count in the database
    const { error } = await supabase
      .from('questions')
      .update({ upvotes: upvotes + 1 })
      .eq('id', questionId);

    if (error) {
      console.error('Error updating upvotes:', error);
      // If there's an error, revert the local state
      setUpvotes(initialUpvotes);
    }

    // Refresh the page to show the updated list and potentially new order
    router.refresh();
  };

  return (
    <button
      onClick={handleUpvote}
      className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors duration-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M5 12h10l-5-5-5 5z" />
      </svg>
      <span>{upvotes}</span>
    </button>
  );
}

