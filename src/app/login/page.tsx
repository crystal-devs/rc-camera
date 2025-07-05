"use client";
import React from 'react'
import { LoginForm } from './components/login-form'
import { LoginCosmetics } from './components/login-cosmetics'
import { GoogleOAuthProvider } from "@react-oauth/google"
import { Toaster } from "@/components/ui/sonner"

const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !

const LoginPage = () => {
    return (
        <GoogleOAuthProvider clientId={client_id}>
            <div className="flex w-full min-h-screen bg-background">
                <div className="w-full grid md:grid-cols-2">
                    <LoginForm />
                    <LoginCosmetics />
                </div>
            </div>
            <Toaster />
        </GoogleOAuthProvider>
    )
}

export default LoginPage