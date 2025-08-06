import '../styles/globals.css'; // <-- CORRECTED PATH
import { Inter } from 'next/font/google';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton'; // Assuming you have this component

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Ask Boundless',
  description: 'A Q&A platform for your community.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gray-100 min-h-screen flex flex-col">
        <header className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Ask Boundless
          </Link>
          <nav className="flex items-center space-x-4">
            {session ? (
              <>
                <Link href="/my-questions" className="text-gray-700 hover:text-blue-600 transition-colors duration-200">
                  My Questions
                </Link>
                <Link href="/ask" className="text-gray-700 hover:text-blue-600 transition-colors duration-200">
                  Ask a Question
                </Link>
                <div className="flex items-center space-x-2">
                  {session.user.user_metadata?.avatar_url && (
                    <img
                      src={session.user.user_metadata.avatar_url}
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-gray-700">Welcome, {session.user.user_metadata?.user_name || session.user.email}</span>
                  <SignOutButton />
                </div>
              </>
            ) : (
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                Sign In
              </Link>
            )}
          </nav>
        </header>
        <main className="flex-grow container mx-auto py-8 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
