import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';
import { Database } from '@/types/supabase';

export default async function Header() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  const displayName = user?.user_metadata?.user_name || user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="flex justify-between items-center px-4 py-3 bg-white shadow-md dark:bg-gray-800">
      <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
        Ask Boundless
      </Link>
      {user ? (
        <div className="flex items-center space-x-4">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="User profile"
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-gray-700 dark:text-gray-300">
            Welcome, {displayName}
          </span>
          <SignOutButton />
        </div>
      ) : (
        <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
          Login
        </Link>
      )}
    </header>
  );
}
