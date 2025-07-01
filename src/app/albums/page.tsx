'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

function Albums() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to events page since we need specific album ID
    router.push('/events');
  }, [router]);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Albums</h1>
      <p className="text-gray-500 mb-6">Redirecting to events page...</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default Albums;