'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Refresh the page to reflect the signed-out state
  };

  return (
    <button
      onClick={handleSignOut}
      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
    >
      Sign Out
    </button>
  );
}
