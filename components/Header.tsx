'use client';

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Listen for auth state changes to update the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Initial check for the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleLogin = async () => {
    // Redirect to the login page which handles the OAuth flow
    router.push('/login');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <header className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Ask Boundless</h1>
      <div>
        {session ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700 hidden sm:block">
              Welcome, {session.user.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}