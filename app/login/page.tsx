'use client';

import { useEffect } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

export default function LoginPage() {
  const supabase = createPagesBrowserClient<Database>();

  useEffect(() => {
    // We only want this code to run in the browser
    if (typeof window !== 'undefined') {
      supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          // Use window.location.origin to get the correct URL dynamically
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    }
  }, [supabase.auth]);

  return (
    <div className="text-center py-10">
      <p>Redirecting to Twitter login...</p>
    </div>
  );
}
