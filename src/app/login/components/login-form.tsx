"use client"

import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { loginUser } from '@/services/apis/auth.api';
import { jwtDecode } from "jwt-decode";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useStore } from '@/lib/store';

export const LoginForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const login = useStore(state => state.login);

  const handleGoogleLogin = async (credential_response: CredentialResponse) => {
    setIsLoading(true);
    try {
      const creds: any = await jwtDecode(credential_response.credential as string);
      
      const result = await loginUser({
        name: creds.name,
        email: creds.email,
        provider: "google",
        profile_pic: creds.picture
      });
      
      if(result){
        // Update Zustand store with user data
        login({
          name: creds.name,
          email: creds.email,
          avatar: creds.picture,
          provider: "google"
        });
        
        toast.success("Welcome back, " + creds.name);
        
        // Check if there's a redirect URL stored
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          localStorage.removeItem('redirectAfterLogin'); // Clear it after use
          router.push(redirectUrl);
        } else {
          router.push("/");
        }
      }
    } catch(err: any) {
      console.error(err);
      toast.error(err?.message ?? "Something went wrong with login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Rose Click</CardTitle>
          <CardDescription>
            Sign in to capture and share memories together
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {/* Logo/Brand element */}
          <div className="relative w-28 h-28 mb-2">
            <div className="absolute inset-0 bg-primary/20 rounded-full"></div>
            <div className="absolute inset-3 bg-primary/30 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">📸</span>
            </div>
          </div>

          <div className="w-full flex flex-col space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Continue with
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className={`${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <GoogleLogin 
                  onSuccess={(credentialResponse) => handleGoogleLogin(credentialResponse)}
                  onError={() => toast.error("Login failed")}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/terms")}>
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/privacy")}>
              Privacy Policy
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
 