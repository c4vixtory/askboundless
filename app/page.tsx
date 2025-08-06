'use client'; // <-- ADDED THIS LINE TO MAKE IT A CLIENT COMPONENT

import { useState, useEffect } from 'react'; // Import useState and useEffect
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import SignOutButton from '@/components/SignOutButton';
import UpvoteButton from '@/components/UpvoteButton';

// Define base types from the database
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];

// Combined type for Question with manually joined author profile
interface QuestionWithProfile extends QuestionRow {
  authorProfile: Partial<ProfileRow> | null; // Profile for the question author
}

export default function HomePage() { // Changed to a client component function
  const supabase = createClientComponentClient<Database>(); // Use client component client
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [twitterUsername, setTwitterUsername] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilesMap, setProfilesMap] = useState<Map<string, Partial<ProfileRow>>>(new Map());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        router.push('/login');
        return;
      }

      setTwitterUsername(currentSession.user.user_metadata?.user_name || currentSession.user.email);

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
      setProfilesMap(newProfilesMap);

      // --- FETCH QUESTIONS (NO JOIN HERE) ---
      const { data: questionsRaw, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        setError('Failed to load questions.');
        setLoading(false);
        return;
      }

      // --- MANUALLY JOIN QUESTIONS WITH PROFILES ---
      const questionsWithProfiles: QuestionWithProfile[] = (questionsRaw || []).map(question => ({
        ...question,
        authorProfile: newProfilesMap.get(question.user_id) || null,
      }));
      setQuestions(questionsWithProfiles);
      setLoading(false);
    }

    fetchData();

    // Setup real-time listener for questions (optional, but good for instant updates)
    const questionsChannel = supabase
      .channel('questions_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'questions',
        },
        (payload) => {
          setQuestions(prevQuestions => {
            let updatedQuestions = [...prevQuestions];
            const newQuestionData = payload.new as QuestionRow;
            const oldQuestionData = payload.old as QuestionRow;

            const getQuestionWithProfile = (question: QuestionRow): QuestionWithProfile => {
              return {
                ...question,
                authorProfile: profilesMap.get(question.user_id) || null,
              };
            };

            if (payload.eventType === 'INSERT') {
              updatedQuestions.unshift(getQuestionWithProfile(newQuestionData)); // Add new question to top
            } else if (payload.eventType === 'UPDATE') {
              const index = updatedQuestions.findIndex(q => q.id === newQuestionData.id);
              if (index !== -1) {
                updatedQuestions[index] = getQuestionWithProfile(newQuestionData);
              }
            } else if (payload.eventType === 'DELETE') {
              updatedQuestions = updatedQuestions.filter(q => q.id !== oldQuestionData.id);
            }

            // Re-sort if necessary (e.g., if upvotes change, though UpvoteButton handles its own state)
            updatedQuestions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return updatedQuestions;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(questionsChannel);
    };

  }, [supabase, router, profilesMap]); // Added profilesMap to dependencies

  if (loading) {
    return <p className="text-center py-10">Loading questions...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 sm:mb-0">
          Hello, {twitterUsername}
        </h1>
        {session && (
          <div className="flex items-center space-x-4">
            <Link href="/ask" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
              Ask a Question
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Latest Questions</h2>
        {questions && questions.length > 0 ? (
          <ul className="space-y-4">
            {questions.map((question: QuestionWithProfile) => {
              const authorProfile = question.authorProfile;
              const twitterProfileUrl = authorProfile?.username ? `https://x.com/${authorProfile.username}` : '#';
              return (
                <li key={question.id} className="p-5 border border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="flex-grow w-full sm:w-auto">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Link href={`/ask/${question.id}`} className="hover:underline text-blue-700 hover:text-blue-800">
                        {question.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">{question.details}</p>
                    <Link href={twitterProfileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-gray-500 mt-2 hover:underline hover:text-blue-500 flex-wrap">
                      {authorProfile?.avatar_url && (
                        <img
                          src={authorProfile.avatar_url}
                          alt="Author Avatar"
                          className="w-5 h-5 rounded-full mr-2 border border-gray-300"
                        />
                      )}
                      <span className="flex items-center whitespace-nowrap font-medium">
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
                      <span className="ml-1 mt-1 sm:mt-0 text-gray-500">on {new Date(question.created_at).toLocaleString()}</span>
                    </Link>
                  </div>
                  <div> {/* UpvoteButton is already a client component */}
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
