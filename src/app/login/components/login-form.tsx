"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { loginUser, registerUser, initializeCsrf, initiateGoogleOAuth, handleGoogleOAuthCallback, LoginCredentials, RegisterCredentials } from '@/services/apis/auth.api';
import { joinAsCoHost } from '@/services/apis/cohost.api';
import { fetchEvents } from '@/services/apis/events.api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Crown, Calendar, X } from 'lucide-react';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { authManager } from '@/lib/auth-manager';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface InviteContext {
  token: string;
  eventId: string;
  eventTitle?: string;
  adminName?: string;
  type: 'cohost' | 'guest';
}

interface LoginFormProps {
  inviteContext?: InviteContext | null;
  className?: string;
}

// Utility functions
const isValidRedirectUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    // Only allow relative URLs starting with /
    if (!url.startsWith('/')) return false;
    // Prevent protocol-relative URLs that could lead to external domains
    if (url.startsWith('//')) return false;
    // Only allow specific safe patterns without query parameters for security
    const safePatterns = [
      /^\/events\/[a-zA-Z0-9_-]+$/,
      /^\/guest\/[a-zA-Z0-9_-]+$/,
      /^\/events$/
    ];
    return safePatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
};

export function LoginForm({
  className,
  inviteContext,
  ...props
}: LoginFormProps & React.ComponentProps<"form">) {
  const router = useRouter();
  const { login: authLogin, register: authRegister, setAuthFromResult, isAuthenticated, isLoading: authLoading } = useSecureAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const [showAuthError, setShowAuthError] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const login = useStore(state => state.login);

  useEffect(() => {
    // Get redirect URL from localStorage with validation
    const storedRedirectUrl = localStorage.getItem('redirectAfterLogin');
    if (storedRedirectUrl && isValidRedirectUrl(storedRedirectUrl)) {
      setRedirectUrl(storedRedirectUrl);
    }

    // Initialize CSRF token on component mount
    initializeCsrf();
  }, []);

  // Redirect authenticated users away from login form
  // Redirect authenticated users with smart logic
  useEffect(() => {
    const checkRedirect = async () => {
      if (!authLoading && isAuthenticated && !inviteContext) {
        // Smart redirect logic for authenticated users
        const storedRedirect = localStorage.getItem('redirectAfterLogin');
        if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
          localStorage.removeItem('redirectAfterLogin');
          router.push(storedRedirect);
          return;
        }

        // Default to events page
        router.push('/events');
      }
    };

    checkRedirect();
  }, [isAuthenticated, authLoading, inviteContext, router]);

  const handleSuccessfulLogin = async (profile: any, apiResult: any) => {
    const accessToken = apiResult?.tokens?.accessToken || apiResult?.token;
    const refreshToken = apiResult?.tokens?.refreshToken || apiResult?.refreshToken || '';
    const expiresAt = apiResult?.tokens?.expiresAt || apiResult?.expiresAt || Date.now() + 3600000;
    const userId = apiResult?.user?.id || apiResult?.userId || 'unknown';

    if (!accessToken) {
      console.error('No access token!', apiResult);
      setShowAuthError(true);
      return;
    }

    // Prepare user data for SecureAuthContext
    const userData = {
      id: userId,
      name: profile.name,
      email: profile.email,
      avatar: profile.picture,
      provider: "google" as "google" | "email"
    };

    // Prepare tokens for SecureAuthContext
    const tokens = {
      accessToken,
      refreshToken,
      expiresAt: typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt
    };

    // Update SecureAuthContext (primary auth system)
    setAuthFromResult(userData, tokens);

    // Update authManager (for API client compatibility)
    try {
      await authManager.loginUser({
        accessToken,
        refreshToken,
        expiresAt: tokens.expiresAt,
        userId
      });
    } catch (error) {
      console.error('Failed to update authManager:', error);
    }

    // Update old store with login (backward compatibility)
    login({
      name: profile.name,
      email: profile.email,
      avatar: profile.picture,
      provider: "google"
    });

    // Determine redirect URL with simplified logic
    let finalRedirectUrl = '/events';
    let redirectDelay = 100;

    // Handle invite context (highest priority)
    if (inviteContext) {
      if (inviteContext.type === 'cohost') {
        // Handle co-host invitation
        try {
          const cohostResponse = await joinAsCoHost(inviteContext.token, accessToken);
          if (cohostResponse.status && cohostResponse.data?.event_id) {
            finalRedirectUrl = `/events/${cohostResponse.data.event_id}`;
            toast.success('Successfully joined as co-host!');
            redirectDelay = 1500;
          } else {
            toast.error(cohostResponse.message || 'Failed to join as co-host');
          }
        } catch (error) {
          console.error('Co-host join error:', error);
          toast.error('Login successful, but co-host invitation failed');
        }
      } else if (inviteContext.type === 'guest') {
        finalRedirectUrl = `/guest/${inviteContext.token}`;
        toast.success('Welcome! Your uploads will be claimed automatically.');
        redirectDelay = 1500;
      }
    } else {
      // Check for stored redirect URL
      const storedRedirect = localStorage.getItem('redirectAfterLogin');
      if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
        finalRedirectUrl = storedRedirect;
        localStorage.removeItem('redirectAfterLogin');
      }
      // Default to /events if no valid redirect
    }

    // Sanitize user input to prevent XSS
    const sanitizedName = profile.name.replace(/[<>]/g, '').substring(0, 50);
    toast.success(`Welcome back, ${sanitizedName}!`);

    // Clean up stored data
    localStorage.removeItem('inviteContext');
    localStorage.removeItem('redirectAfterLogin');

    // Use consistent navigation method
    setTimeout(() => {
      router.push(finalRedirectUrl);
    }, redirectDelay);
  };

  // Client-side validation functions
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 8;
  const validateName = (name: string) => name.trim().length >= 2;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: max 5 attempts per minute
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;

    if (loginAttempts >= 5 && timeSinceLastAttempt < 60000) { // 1 minute
      const remainingTime = Math.ceil((60000 - timeSinceLastAttempt) / 1000);
      toast.error(`Too many login attempts. Please wait ${remainingTime} seconds.`);
      return;
    }

    // Reset attempts if more than 1 minute has passed
    if (timeSinceLastAttempt > 60000) {
      setLoginAttempts(0);
    }

    setIsLoading(true);
    setLastAttemptTime(now);

    try {
      // Client-side validation
      if (!validateEmail(formData.email)) {
        toast.error("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      if (!isLoginMode && !validateName(formData.name)) {
        toast.error("Name must be at least 2 characters long");
        setIsLoading(false);
        return;
      }

      if (!validatePassword(formData.password)) {
        toast.error("Password must be at least 8 characters long");
        setIsLoading(false);
        return;
      }

      if (isLoginMode) {
        await authLogin({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        });
        toast.success("Login successful!");
      } else {
        await authRegister({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        });
        toast.success("Registration successful! Please log in.");
        setIsLoginMode(true); // Switch to login mode after successful registration
      }

      // Handle redirect logic here (similar to handleSuccessfulLogin)
      let finalRedirectUrl = '/events';
      if (inviteContext) {
        if (inviteContext.type === 'cohost') {
          // Handle cohost logic
          finalRedirectUrl = `/events/${inviteContext.eventId}`;
        } else if (inviteContext.type === 'guest') {
          finalRedirectUrl = `/guest/${inviteContext.token}`;
        }
      }

      setTimeout(() => {
        router.push(finalRedirectUrl);
      }, 1000);

    } catch (err: any) {
      // Increment failed attempts for rate limiting
      setLoginAttempts(prev => prev + 1);
      if (isLoginMode) {
        setShowAuthError(true);
      } else {
        toast.error(err?.message ?? `Something went wrong with registration`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // Get user profile from Google
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        const profile = await res.json();

        // Backend handles both login and registration for Google OAuth
        const result = await loginUser({
          email: profile.email,
          name: profile.name,
          provider: "google",
          googleAccessToken: tokenResponse.access_token // Send token for backend verification
        } as LoginCredentials);

        await handleSuccessfulLogin(profile, result);
      } catch (err: any) {
        console.error('Google login error:', err);
        setShowAuthError(true);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setShowAuthError(true);
      setIsLoading(false);
    },
    flow: 'implicit',
  });

  return (
    <form
      className={cn("flex flex-col gap-10 p-6", className)}
      {...props}
      onSubmit={handleEmailAuth}
    >
      <div className="flex flex-col items-start gap-2 text-center">
        <h1 className="text-3xl font-bold text-neutral-900">
          {inviteContext ? 'Join Event' : 'Welcome Back'}
        </h1>
        {redirectUrl && !inviteContext && (
          <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            You'll be redirected to your event after signing in
          </p>
        )}
      </div>

      {/* Invite Context Banner */}
      {inviteContext && (
        <Alert className="border-blue-200 bg-blue-50">
          <UserPlus className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <div className="font-medium">
                {inviteContext.type === 'cohost'
                  ? `You've been invited to co-host${inviteContext.eventTitle ? ` "${inviteContext.eventTitle}"` : ' an event'}`
                  : `You've been invited to${inviteContext.eventTitle ? ` "${inviteContext.eventTitle}"` : ' an event'}`
                }
              </div>
              {inviteContext.adminName && (
                <div className="text-sm flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  <span>by {inviteContext.adminName}</span>
                </div>
              )}
              <div className="text-sm">
                Sign in to {inviteContext.type === 'cohost' ? 'accept your co-host role' : 'join the event'}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 py-4 px-3 md:text-md bg-white border border-neutral-200 text-neutral-900 !hover:bg-neutral-50"
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
          {inviteContext
            ? `Continue with Google to ${inviteContext.type === 'cohost' ? 'become co-host' : 'join event'}`
            : 'Continue with Google'
          }
        </Button>

        <div className="after:border-neutral-200 relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-neutral-50 text-neutral-500 relative z-10 px-2 font-semibold">
            or
          </span>
        </div>

        {!isLoginMode && (
          <div className="grid gap-3">
            <Input
              id="name"
              type="text"
              placeholder="Full Name"
              required={!isLoginMode}
              className='h-12 py-4 px-3 md:text-md !bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400 focus-visible:border-neutral-400'
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
        )}
        <div className="grid gap-3">
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            className='h-12 py-4 px-3 md:text-md !bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400 focus-visible:border-neutral-400'
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div className="grid gap-3">
          <Input
            id="password"
            type="password"
            placeholder='Enter Password'
            required
            className='h-12 py-4 px-3 md:text-md !bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400 focus-visible:border-neutral-400'
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>
        <Button type="submit" className="w-full h-12 py-4 px-3 md:text-md bg-neutral-900 text-white hover:bg-neutral-800" disabled={isLoading}>
          {isLoading ? 'Please wait...' : (isLoginMode ? 'Continue' : 'Sign up')}
        </Button>
      </div>

      {inviteContext && (
        <div className="text-xs text-center text-muted-foreground space-y-1">
          <p>By signing in, you agree to join this event</p>
          {inviteContext.type === 'cohost' && (
            <p className="text-blue-600">Co-host access may require admin approval</p>
          )}
          {inviteContext.type === 'guest' && (
            <p className="text-green-600">Your previous uploads will be claimed automatically</p>
          )}
        </div>
      )}

      <div className="text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        {isLoginMode ? (
          <button
            type="button"
            className="underline underline-offset-4 text-neutral-900 hover:text-neutral-700"
            onClick={() => setIsLoginMode(false)}
          >
            Sign up
          </button>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="underline underline-offset-4 text-neutral-900 hover:text-neutral-700"
              onClick={() => setIsLoginMode(true)}
            >
              Log in
            </button>
          </>
        )}
      </div>

      <Dialog open={showAuthError} onOpenChange={setShowAuthError}>
        <DialogContent 
          showCloseButton={false} 
          className="bg-[#1C1C1E] border-none text-white sm:max-w-[400px] p-6 rounded-[28px] gap-2 shadow-2xl"
        >
          <button 
            type="button"
            onClick={() => setShowAuthError(false)}
            className="absolute right-4 top-4 rounded-full bg-[#2C2C2E] p-[6px] text-[#8E8E92] hover:text-white border border-[#48484A] focus:outline-none focus:ring-2 focus:ring-[#0A84FF] transition-all"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          
          <div className="flex flex-col items-center text-center space-y-3 pt-2 pb-2">
            <DialogTitle className="text-[20px] font-semibold tracking-tight text-white mb-1">
              Authentication error
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#98989E] leading-[1.4] px-2 font-medium">
              Something went wrong during the authentication process. Please try signing in again.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
