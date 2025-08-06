// Remove: export const dynamic = 'force-dynamic'; // No longer needed, revalidateTag handles freshness

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
  const { data: fetchedProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, role');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }
  const profilesData = fetchedProfiles || [];

  // Create a map for quick profile lookup by ID
  const profilesMap = new Map<string, Partial<ProfileRow>>();
  profilesData.forEach(profile => {
    if (profile.id) {
      profilesMap.set(profile.id, profile);
    }
  });

  // --- FETCH QUESTIONS (NO JOIN HERE) ---
  const { data: questionsRaw, error: questionsError } = await supabase
    .from('questions')
    .select('*', {
      // @ts-ignore
      next: { tags: ['questions'] },
    })
    .order('created_at', { ascending: false });

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
    return <p className="text-red-500 text-center">Failed to load questions.</p>;
  }

  // --- MANUALLY JOIN QUESTIONS WITH PROFILES ---
  const questions: QuestionWithProfile[] = (questionsRaw || []).map(question => ({
    ...question,
    authorProfile: profilesMap.get(question.user_id) || null,
  }));

  return (
    <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto"> {/* Increased overall spacing, max-width */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left"> {/* Rounded-xl, softer shadow, border */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 sm:mb-0"> {/* Larger, bolder text */}
          Hello, {twitterUsername}
        </h1>
        {session && (
          <div className="flex items-center space-x-4">
            <Link href="/ask" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"> {/* More prominent button style */}
              Ask a Question
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Latest Questions</h2> {/* Bolder heading */}
        {questions && questions.length > 0 ? (
          <ul className="space-y-4">
            {questions.map((question: QuestionWithProfile) => {
              const authorProfile = question.authorProfile;
              const twitterProfileUrl = authorProfile?.username ? `https://x.com/${authorProfile.username}` : '#';
              return (
                <li key={question.id} className="p-5 border border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center"> {/* Rounded-xl, increased padding */}
                  <div className="flex-grow w-full sm:w-auto">
                    <h3 className="text-lg font-semibold text-gray-900"> {/* Bolder title */}
                      <Link href={`/ask/${question.id}`} className="hover:underline text-blue-700 hover:text-blue-800"> {/* Blue link color */}
                        {question.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">{question.details}</p> {/* Darker text */}
                    <Link href={twitterProfileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-gray-500 mt-2 hover:underline hover:text-blue-500 flex-wrap">
                      {authorProfile?.avatar_url && (
                        <img
                          src={authorProfile.avatar_url}
                          alt="Author Avatar"
                          className="w-5 h-5 rounded-full mr-2 border border-gray-300" {/* Subtle border for avatar */}
                        />
                      )}
                      <span className="flex items-center whitespace-nowrap font-medium"> {/* Medium font weight */}
                        Asked by {authorProfile?.username || 'Anonymous'}
                        {authorProfile?.role === 'admin' && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                            Admin
                          </span>
                        )}
                        {authorProfile?.role === 'me' && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                            ME
                          </span>
                        )}
                        {authorProfile?.role === 'og' && (
                          <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                            OG
                          </span>
                        )}
                      </span>
                      <span className="ml-1 mt-1 sm:mt-0 text-gray-500">on {new Date(question.created_at).toLocaleString()}</span> {/* Consistent gray */}
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <UpvoteButton initialUpvotes={question.upvotes} questionId={question.id} />
                  </div>
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
