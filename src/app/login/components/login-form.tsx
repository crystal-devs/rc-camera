import React from 'react'
import { Button } from '@/components/ui/button'
import { GoogleLogin } from '@react-oauth/google'

import {jwtDecode} from "jwt-decode"

export const LoginForm = () => {
  const handleGoogleLogin = () => {
    // Google authentication logic will go here
    console.log('Google login initiated')
  }

  return (
    <div className='w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white'>
      <div className='flex flex-col items-center gap-10 p-10 rounded-2xl shadow-lg bg-white/90 backdrop-blur-sm w-[90%] max-w-md'>
        <div className='space-y-2 text-center'>
          <h1 className='text-4xl font-bold text-gray-800'>Rose Click</h1>
          <p className='text-gray-500 text-lg'>Capture memories together</p>
        </div>
        
        {/* App illustration or logo */}
        <div className='relative w-32 h-32 mb-4'>
          <div className='absolute inset-0 bg-pink-200 rounded-full opacity-50'></div>
          <div className='absolute inset-2 bg-pink-500 rounded-full'></div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='text-5xl'>📸</span>
          </div>
        </div>
        
        <GoogleLogin onSuccess={(credentialResponse) => console.log(jwtDecode(credentialResponse.credential as string))} />
      </div>
    </div>
  )
}
 