"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { loginUser } from '@/services/apis/auth.api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Utility functions
const isValidRedirectUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    if (!url.startsWith('/')) return false;
    const guestPagePattern = /^\/guest\/[a-zA-Z0-9_-]+(\?.*)?$/;
    return guestPagePattern.test(url);
  } catch {
    return false;
  }
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const login = useStore(state => state.login);

  useEffect(() => {
    // Get redirect URL from localStorage with validation
    const storedRedirectUrl = localStorage.getItem('redirectAfterLogin');
    if (storedRedirectUrl && isValidRedirectUrl(storedRedirectUrl)) {
      setRedirectUrl(storedRedirectUrl);
    }
  }, []);

  const handleSuccessfulLogin = async (profile: any, apiResult: any) => {
    // Store auth token from API result
    if (apiResult?.token) {
      localStorage.setItem('authToken', apiResult.token);
    }

    // Update store with login
    login({
      name: profile.name,
      email: profile.email,
      avatar: profile.picture,
      provider: "google"
    });

    toast.success("Welcome back, " + profile.name);

    // Small delay to ensure store is updated
    setTimeout(() => {
      // Handle redirect securely
      const currentRedirectUrl = localStorage.getItem('redirectAfterLogin');
      if (currentRedirectUrl && isValidRedirectUrl(currentRedirectUrl)) {
        localStorage.removeItem('redirectAfterLogin');
        console.log('Redirecting to:', currentRedirectUrl);
        router.push(currentRedirectUrl);
      } else {
        // Clear any invalid redirect URL
        localStorage.removeItem('redirectAfterLogin');
        router.push("/");
      }
    }, 100);
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // Fetch user profile from Google using access token
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        const profile = await res.json();

        const result = await loginUser({
          name: profile.name,
          email: profile.email,
          provider: "google",
          profile_pic: profile.picture
        });

        if (result) {
          await handleSuccessfulLogin(profile, result);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message ?? "Something went wrong with login");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      toast.error("Google Login failed");
      setIsLoading(false);
    },
    flow: 'implicit',
  });

  return (
    <form
      className={cn("flex flex-col gap-10", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        toast("Email/password login not implemented");
      }}
    >
      <div className="flex flex-col items-start gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        {redirectUrl && (
          <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            You'll be redirected to your event after signing in
          </p>
        )}
      </div>

      <div className="grid gap-6">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => googleLogin()}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48" className="w-5 h-5 mr-2">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
          )}
          Continue with Google
        </Button>
        
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a
              href="#"
              className="ml-auto text-[12px] underline-offset-4 hover:underline text-muted-foreground"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </div>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <a href="#" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </form>
  );
}