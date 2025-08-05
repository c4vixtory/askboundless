import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import CreateQuestion from '@/components/CreateQuestion';
import ListQuestions from '@/components/ListQuestions';

export default async function HomePage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get the Twitter username from the user_metadata object
  const twitterUsername = session.user.user_metadata?.user_name || session.user.email;
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .single();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Display the Twitter username */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Hello, {profile?.username || twitterUsername}
          </h1>
          <SignOutButton />
        </header>

        <CreateQuestion />
        <ListQuestions />
      </div>
    </div>
  );
}
