import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import UpvoteButton from '@/components/UpvoteButton';

// Define the type for the joined profile data
type Profile = Database['public']['Tables']['profiles']['Row'];

// Define the type for a question with its author's profile
interface Question {
  id: number;
  title: string;
  details: string;
  created_at: string;
  user_id: string;
  upvotes: number;
  // Corrected: profiles will be a single Profile object or null
  profiles: Profile | null;
}

export default async function HomePage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const twitterUsername = session.user.user_metadata?.user_name || session.user.email;

  // Fetch questions and join with the profiles table to get author details
  // Supabase's `select` with relationships will return a single object for one-to-one,
  // or null if no related record is found.
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*, profiles(username, avatar_url)') // Select all from questions, and specific fields from profiles
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
    return <p className="text-red-500 text-center">Failed to load questions.</p>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">
          Hello, {twitterUsername}
        </h1>
        {session && (
          <div className="flex items-center space-x-4">
            <Link href="/ask" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
              Ask a Question
            </Link>
            <SignOutButton />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Latest Questions</h2>
        {questions && questions.length > 0 ? (
          <ul className="space-y-4">
            {questions.map((question: Question) => {
              // Access the profile directly, as it's now typed as Profile | null
              const authorProfile = question.profiles;
              return (
                <li key={question.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                  <div className="flex-grow">
                    <h3 className="text-lg font-medium text-gray-900">{question.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{question.details}</p>
                    <div className="flex items-center text-xs text-gray-400 mt-2">
                      {authorProfile?.avatar_url && (
                        <img
                          src={authorProfile.avatar_url}
                          alt="Author Avatar"
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      )}
                      Asked by {authorProfile?.username || 'Anonymous'} on {new Date(question.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <UpvoteButton initialUpvotes={question.upvotes} questionId={question.id} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg shadow-inner">
            <p className="text-lg">No questions yet. Be the first to ask one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
