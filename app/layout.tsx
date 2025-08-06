import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';

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
        <header className="bg-white shadow-md py-4 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center sm:items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
            Ask Boundless
          </Link>
          <nav className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto mt-2 sm:mt-0">
            {session ? (
              <>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <Link href="/my-questions" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 text-sm sm:text-base">
                    My Questions
                  </Link>
                  <Link href="/ask" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 text-sm sm:text-base">
                    Ask a Question
                  </Link>
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  {session.user.user_metadata?.avatar_url && (
                    <img
                      src={session.user.user_metadata.avatar_url}
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-gray-700 text-sm sm:text-base whitespace-nowrap">Welcome, {session.user.user_metadata?.user_name || session.user.email}</span>
                  <SignOutButton />
                </div>
              </>
            ) : (
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 text-sm sm:text-base">
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
