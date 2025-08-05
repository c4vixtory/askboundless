// app/layout.tsx
import '../styles/globals.css';
import { ReactNode } from 'react';
import SupabaseProvider from '@/components/SupabaseProvider';
import Header from '../components/Header';

export const metadata = {
  title: 'Ask Boundless',
  description: 'Community-powered ZK questions and answers',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <main className="max-w-3xl mx-auto p-4">
            <Header />
            {children}
          </main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
