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
      <body className="bg-gray-50 min-h-screen flex flex-col text-gray-800 antialiased">
        <header className="bg-white shadow-sm py-4 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center sm:items-center border-b border-gray-100">
          <Link href="/" className="text-2xl font-extrabold text-blue-700 mb-2 sm:mb-0 tracking-tight">
            Ask Boundless
          </Link>
          <nav className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto mt-2 sm:mt-0">
            {session ? (
              <>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  {/* NEW: My Questions as a subtle button */}
                  <Link href="/my-questions" className="px-4 py-2 rounded-lg text-sm sm:text-base font-medium text-blue-600 border border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors duration-200">
                    My Questions
                  </Link>
                  {/* REMOVED: Ask a Question link from header */}
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  {session.user.user_metadata?.avatar_url && (
                    <img
                      src={session.user.user_metadata.avatar_url}
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full border-2 border-blue-400"
                    />
                  )}
                  <span className="text-gray-700 text-sm sm:text-base whitespace-nowrap font-medium">Welcome, {session.user.user_metadata?.user_name || session.user.email}</span>
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
