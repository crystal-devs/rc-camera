"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { loginUser, registerUser, initializeCsrf, initiateGoogleOAuth, handleGoogleOAuthCallback } from '@/services/apis/auth.api';
import { joinAsCoHost } from '@/services/apis/cohost.api';
import { fetchEvents } from '@/services/apis/events.api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Crown, Calendar } from 'lucide-react';

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
    if (!url.startsWith('/')) return false;
    const guestPagePattern = /^\/guest\/[a-zA-Z0-9_-]+(\?.*)?$/;
    const eventPagePattern = /^\/events\/[a-zA-Z0-9_-]+(\?.*)?$/;
    return guestPagePattern.test(url) || eventPagePattern.test(url);
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
  const { login: authLogin, register: authRegister, initiateGoogleOAuth: authInitiateGoogleOAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
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

  const handleSuccessfulLogin = async (profile: any, apiResult: any) => {
    const accessToken = apiResult?.tokens?.accessToken || apiResult?.token;
    if (!accessToken) {
      console.error('No access token!', apiResult);
      toast.error('Authentication failed');
      return;
    }

    // Update store with login
    login({
      name: profile.name,
      email: profile.email,
      avatar: profile.picture,
      provider: "google"
    });

    let finalRedirectUrl = '/events'; // Default fallback
    let shouldDelayRedirect = false;

    // Handle invite context if present (HIGHEST PRIORITY)
    if (inviteContext) {
      if (inviteContext.type === 'cohost') {
        try {
          console.log('🔄 Attempting to join as co-host with token:', inviteContext.token);

          // Auto-join as co-host
          const cohostResponse = await joinAsCoHost(inviteContext.token, accessToken);

          console.log('📊 Co-host API response:', cohostResponse);

          if (cohostResponse.status) {
            const eventId = cohostResponse.data?.event_id;
            console.log('🎯 Got event ID from response:', eventId);

            if (eventId) {
              finalRedirectUrl = `/events/${eventId}`;
              console.log('✅ Setting redirect URL to:', finalRedirectUrl);

              if (cohostResponse.message.includes('already a co-host')) {
                toast.info('You are already a co-host for this event');
              } else {
                toast.success(`Successfully joined as co-host!`);
              }
            } else {
              console.log('⚠️ No event ID found, using fallback');
              finalRedirectUrl = '/events';
              toast.success('Successfully joined as co-host!');
            }
            shouldDelayRedirect = true;
          } else {
            console.log('❌ Co-host join failed:', cohostResponse.message);
            toast.error(cohostResponse.message || 'Failed to join as co-host');
            finalRedirectUrl = '/events';
          }
        } catch (cohostError: any) {
          console.error('💥 Auto co-host join error:', cohostError);
          toast.error('Login successful, but there was an issue with the co-host invitation.');
          finalRedirectUrl = '/events';
        }
      } else if (inviteContext.type === 'guest') {
        // Guest invite - redirect to guest page (auto-claim will happen there)
        finalRedirectUrl = `/guest/${inviteContext.token}`;
        console.log('👤 Guest invite - redirecting to:', finalRedirectUrl);
        toast.success('Welcome! Your previous uploads will be claimed automatically.');
        shouldDelayRedirect = true;
      }
    } else {
      // No invite context - check for stored redirect (LOWER PRIORITY)
      const currentRedirectUrl = localStorage.getItem('redirectAfterLogin');
      if (currentRedirectUrl && isValidRedirectUrl(currentRedirectUrl)) {
        finalRedirectUrl = currentRedirectUrl;
      } else {
        // NEW LOGIC: Fetch user events and redirect to the first one
        try {
          console.log('Fetching user events for redirect...');
          const events = await fetchEvents(accessToken);
          if (events && events.length > 0) {
            // Sort events by creation date (newest first) or just take the first one
            // Assuming the API returns them in a reasonable order or we just take the first
            const firstEvent = events[0];
            console.log(`Found ${events.length} events. Redirecting to first event: ${firstEvent._id || firstEvent.id}`);
            finalRedirectUrl = `/events/${firstEvent._id || firstEvent.id}`;
          } else {
            console.log('No events found, redirecting to /events');
            finalRedirectUrl = '/events';
          }
        } catch (error) {
          console.warn('Error fetching events for redirect, fallback to /events', error);
          finalRedirectUrl = '/events';
        }
      }
    }

    toast.success("Welcome back, " + profile.name);

    // Clean up all stored redirects and contexts
    localStorage.removeItem('inviteContext');
    localStorage.removeItem('redirectAfterLogin');

    // Redirect with appropriate delay
    const redirectDelay = shouldDelayRedirect ? 1500 : 100;
    setTimeout(() => {
      console.log('🚀 Final redirect to:', finalRedirectUrl);

      // Force navigation to ensure it works
      if (finalRedirectUrl.startsWith('/events/') && finalRedirectUrl !== '/events') {
        console.log('🎯 Using window.location.href for specific event page');
        window.location.href = finalRedirectUrl;
      } else if (finalRedirectUrl.startsWith('/guest/')) {
        console.log('👤 Using window.location.href for guest page (for auto-claim)');
        window.location.href = finalRedirectUrl;
      } else {
        console.log('📍 Using router.push for general navigation');
        router.push(finalRedirectUrl);
      }
    }, redirectDelay);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await authLogin({
          email: formData.email,
          password: formData.password
        });
        toast.success("Login successful!");
      } else {
        await authRegister({
          name: formData.name,
          email: formData.email,
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
      console.error(err);
      toast.error(err?.message ?? `Something went wrong with ${isLoginMode ? 'login' : 'registration'}`);
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

        // For Google OAuth, we need to register the user first if they don't exist
        try {
          const result = await loginUser({
            email: profile.email,
            password: profile.sub, // Use Google sub as temporary password for backend
            provider: "google" // Add provider field for Google OAuth
          });
          await handleSuccessfulLogin(profile, result);
        } catch (loginError: any) {
          // If login fails (user doesn't exist), register them
          console.log('User not found, registering new Google user:', loginError.message);

          try {
            const registerResult = await registerUser({
              name: profile.name,
              email: profile.email,
              password: profile.sub, // Use Google sub as password for registration
              provider: "google"
            });

            // Registration successful, handle login
            await handleSuccessfulLogin(profile, registerResult);
          } catch (registerError: any) {
            console.error('Registration also failed:', registerError);
            throw new Error('Failed to authenticate with Google. Please try again.');
          }
        }

        // Success is handled inside the try-catch blocks above
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
      className={cn("flex flex-col gap-10 p-6", className)}
      {...props}
      onSubmit={handleEmailAuth}
    >
      <div className="flex flex-col items-start gap-2 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
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
          className="w-full h-12 py-4 px-3 md:text-md bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:text-neutral-900"
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
          <span className="bg-neutral-50 text-neutral-500 relative z-10 px-2">
            Or continue with
          </span>
        </div>

        {!isLoginMode && (
          <div className="grid gap-3">
            <Input
              id="name"
              type="text"
              placeholder="Full Name"
              required={!isLoginMode}
              className='h-12 py-4 px-3 md:text-md bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400'
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
            className='h-12 py-4 px-3 md:text-md bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400'
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
            className='h-12 py-4 px-3 md:text-md bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400'
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>
        <Button type="submit" className="w-full h-12 py-4 px-3 md:text-md bg-neutral-900 text-white hover:bg-neutral-800" disabled={isLoading}>
          {isLoading ? 'Please wait...' : (isLoginMode ? 'Log in' : 'Sign up')}
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
    </form>
  );
}
