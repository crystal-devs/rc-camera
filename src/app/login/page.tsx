"use client";
import React, { useEffect, useState } from 'react'
import { LoginForm } from './components/login-form'
import { LoginCosmetics } from './components/login-cosmetics'
import { GoogleOAuthProvider } from "@react-oauth/google"
import { Toaster } from "@/components/ui/sonner"
import { useStore } from '@/lib/store';

const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!

const LoginPage = () => {
    const isAuthenticated = useStore(state => state.isAuthenticated);
    const hydrated = useStore(state => state.hydrated);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        // Wait for store to be hydrated before doing auth checks
        if (hydrated) {
            setIsCheckingAuth(false);

            // Check if user is already authenticated after hydration
            if (isAuthenticated) {
                const redirectUrl = localStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = '/';
                }
            }
        }
    }, [hydrated, isAuthenticated]);

    // Show loading while checking authentication state
    if (isCheckingAuth) {
        return (
            <div className="flex w-full min-h-screen bg-background items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // Only render login form if user is not authenticated
    if (isAuthenticated) {
        return null; // This shouldn't happen due to useEffect redirect, but just in case
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