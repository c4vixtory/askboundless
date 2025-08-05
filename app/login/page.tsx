'use client';

import { useEffect } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

export default function LoginPage() {
  const supabase = createPagesBrowserClient<Database>();

  useEffect(() => {
    supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        // Hardcode the redirect URL to ensure it's correct
        redirectTo: 'http://localhost:3000/auth/callback',
      },
    });
  }, [supabase.auth]);

  return (
    <div className="text-center py-10">
      <p>Redirecting to Twitter login...</p>
    </div>
  );
}
