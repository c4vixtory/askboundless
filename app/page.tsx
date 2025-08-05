import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

// Define the type for a question from your database
interface Question {
  id: number;
  title: string;
  details: string;
  created_at: string;
  user_id: string;
}

export default async function HomePage() {
  // Create a Supabase client on the server side
  const supabase = createClient();

  // Fetch the user to determine if they are logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all questions from the 'questions' table, ordering them by creation date
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
    return <p className="text-red-500 text-center">Failed to load questions.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Latest Questions</h2>
        {user && (
          <Link href="/ask" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
            Ask a Question
          </Link>
        )}
      </div>

      {questions && questions.length > 0 ? (
        <ul className="space-y-4">
          {questions.map((question: Question) => (
            <li key={question.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
              <h3 className="text-lg font-medium text-gray-900">{question.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{question.details}</p>
              <div className="text-xs text-gray-400 mt-2">
                Asked on {new Date(question.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg shadow-inner">
          <p className="text-lg">No questions yet. Be the first to ask one!</p>
        </div>
      )}
    </div>
  );
}
