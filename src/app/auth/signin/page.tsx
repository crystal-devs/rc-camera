'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Instagram, Signpost } from 'lucide-react';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    await signIn(provider, { callbackUrl: '/capture' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Sign in to continue</h1>
        <p className="text-gray-600 text-center mb-6">
          You need to sign in to capture photos
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleSignIn('google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Signpost size={20} />
            <span>Continue with Google</span>
          </button>
          
          <button
            onClick={() => handleSignIn('instagram')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
          >
            <Instagram size={20} />
            <span>Continue with Instagram</span>
          </button>
        </div>
        
        <button
          onClick={() => router.push('/')}
          className="w-full text-center text-blue-600 mt-6 hover:underline"
        >
          Back to Gallery
        </button>
      </div>
    </div>
  );
}