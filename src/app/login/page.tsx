"use client"
import React from 'react'
import { LoginForm } from './components/login-form'
import { LoginCosmetics } from './components/login-cosmetics'
import {GoogleOAuthProvider} from "@react-oauth/google"

const client_id = "301412680308-6tpn8f9k3ll0bam898dogavmh97jlfoh.apps.googleusercontent.com"

const page = () => {
    return (
        <GoogleOAuthProvider clientId={client_id}>
            <div className="flex w-screen h-screen overflow-x-hidden overflow-y-auto">
                <div className="w-full h-full grid md:grid-cols-2">
                    <LoginForm />
                    <LoginCosmetics />
                </div>
            </div>
        </GoogleOAuthProvider>
    )
}

export default page