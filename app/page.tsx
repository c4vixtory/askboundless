import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import UpvoteButton from '@/components/UpvoteButton';

// Define base types from the database
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];

// Combined type for Question with manually joined author profile
interface QuestionWithProfile extends QuestionRow {
  authorProfile: Partial<ProfileRow> | null; // Profile for the question author
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

  // --- FETCH ALL PROFILES SEPARATELY FIRST ---
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  // Create a map for quick profile lookup by ID
  const profilesMap = new Map<string, Partial<ProfileRow>>();
  profilesData?.forEach(profile => {
    if (profile.id) {
      profilesMap.set(profile.id, profile);
    }
  });

  // --- FETCH QUESTIONS (NO JOIN HERE) ---
  const { data: questionsRaw, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
    return <p className="text-red-500 text-center">Failed to load questions.</p>;
  }

  // --- MANUALLY JOIN QUESTIONS WITH PROFILES ---
  const questions: QuestionWithProfile[] = (questionsRaw || []).map(question => ({
    ...question,
    authorProfile: profilesMap.get(question.user_id) || null, // Attach profile or null
  }));

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
            {questions.map((question: QuestionWithProfile) => {
              const authorProfile = question.authorProfile;
              const twitterProfileUrl = authorProfile?.username ? `https://x.com/${authorProfile.username}` : '#'; // Construct Twitter URL
              return (
                <li key={question.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                  <div className="flex-grow">
                    <h3 className="text-lg font-medium text-gray-900">
                      <Link href={`/ask/${question.id}`} className="hover:underline">
                        {question.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{question.details}</p>
                    <Link href={twitterProfileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-gray-400 mt-2 hover:underline hover:text-blue-500">
                      {authorProfile?.avatar_url && (
                        <img
                          src={authorProfile.avatar_url}
                          alt="Author Avatar"
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      )}
                      Asked by {authorProfile?.username || 'Anonymous'} on {new Date(question.created_at).toLocaleDateString()}
                    </Link>
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
