'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CommentFormProps {
  questionId: number;
  userId: string; // The ID of the currently logged-in user
}

export default function CommentForm({ questionId, userId }: CommentFormProps) {
  const [commentContent, setCommentContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!commentContent.trim()) {
      setError('Comment cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          user_id: userId, // Pass the current user's ID
          content: commentContent,
          // is_admin_comment will be handled by the API route/database logic later
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(`Failed to submit comment: ${result.error}`);
      } else {
        setCommentContent(''); // Clear the form
        router.refresh(); // Refresh the page to show the new comment
      }
    } catch (err) {
      setError('An unexpected error occurred while submitting your comment.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div>
        <label htmlFor="comment" className="sr-only">Your Comment</label>
        <textarea
          id="comment"
          className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Write your comment here..."
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Post Comment'}
      </button>
    </form>
  );
}

