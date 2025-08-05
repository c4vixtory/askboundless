'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AskPage() {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !details.trim()) {
      setError('Title and details are required.');
      return;
    }

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, details }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(`Failed to submit question: ${result.error}`);
      } else {
        // Redirect to the homepage after successful submission
        router.push('/');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Ask a Question</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            id="title"
            className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="details" className="block text-sm font-medium mb-1">Details</label>
          <textarea
            id="details"
            className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors duration-200"
        >
          Submit Question
        </button>
      </form>
    </main>
  );
}
