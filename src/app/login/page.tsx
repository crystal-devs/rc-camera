"use client";
import React from 'react'
import { LoginForm } from './components/login-form'
import { LoginCosmetics } from './components/login-cosmetics'
import { GoogleOAuthProvider } from "@react-oauth/google"
import { Toaster } from "@/components/ui/sonner"
import { useStore } from '@/lib/store';

const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!

const LoginPage = () => {
      const isAuthenticated = useStore(state => state.isAuthenticated);
    
      if( isAuthenticated) {
        // If user is already authenticated, redirect to home page
        if (typeof window !== 'undefined') {
            const redirectUrl = localStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            } else {
                window.location.href = '/';
            }
        }
        return null;
      }
    return (
        <GoogleOAuthProvider clientId={client_id}>
            <div className="flex w-full min-h-screen bg-background">
                <div className="w-full grid md:grid-cols-2">
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full max-w-xs">
                            <LoginForm />
                        </div>
                    </div>
                    <LoginCosmetics />
                </div>
            </div>
            <Toaster />
        </GoogleOAuthProvider>
    )
}

export default LoginPage