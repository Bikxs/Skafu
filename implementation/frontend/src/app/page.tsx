'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard for authenticated users
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Redirecting to Dashboard...
        </h1>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto"></div>
      </div>
    </div>
  );
}
