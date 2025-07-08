'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Loader2, Calendar, ShieldCheck } from 'lucide-react';
import { getEventById } from '@/services/apis/events.api';
import { useAuthToken } from '@/hooks/use-auth';
import { toast } from 'sonner';
// import {
//   validateShareToken,
//   getShareTokenInfo
// } from '@/services/apis/sharing.api';
import { ShareToken } from '@/types/sharing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Import the Event type from our types
import { Event } from '@/types/events';

// Type for our internal state that can handle both our Event type and legacy access code events
interface EventType {
  id: string;
  name: string;
  description?: string;
  date: string | Date;
  accessType?: 'public' | 'restricted';
  accessCode?: string;
  access?: {
    level: string;
  };
  invitedGuests?: string[];
}

// export default function JoinEventPage() {
//   const searchParams = useSearchParams();
//   const eventId = searchParams.get('event');
//   const accessCode = searchParams.get('code');
//   const shareToken = searchParams.get('token');

//   const router = useRouter();
//   const [event, setEvent] = useState<EventType | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [joining, setJoining] = useState(false);
//   const [error, setError] = useState('');
//   const [shareTokenData, setShareTokenData] = useState<ShareToken | null>(null);
//   const [passwordProtected, setPasswordProtected] = useState(false);
//   const [password, setPassword] = useState('');
//   const token = useAuthToken();

//   useEffect(() => {
//     let isMounted = true;

//     const findEventOrValidateToken = async () => {
//       try {
//         const authToken = token || localStorage.getItem('authToken');

//         if (shareToken) {
//           try {
//             console.log('Join page - validating token:', shareToken);
//             const tokenValidation = await validateShareToken(shareToken, password);
//             console.log('Token validation result:', tokenValidation);

//             if (tokenValidation.valid && tokenValidation.shareToken) {
//               const tokenEventId = tokenValidation.shareToken.eventId;
//               console.log('Valid token for event ID:', tokenEventId);
//               setShareTokenData(tokenValidation.shareToken);

//               try {
//                 const { getEventByShareToken } = await import('@/services/apis/sharing.api');

//                 // Try authenticated access first
//                 if (authToken) {
//                   console.log('Auth token found, trying authenticated access');
//                   try {
//                     const eventData = await getEventById(tokenEventId, authToken);
//                     if (!isMounted) return;
//                     console.log('Event data retrieved with auth:', eventData);
//                     setEvent(eventData);
//                     router.push(`/events/${tokenEventId}`);
//                     return;
//                   } catch (authError) {
//                     console.warn('Authenticated fetch failed:', authError);
//                     console.warn('Trying guest access instead.');
//                   }
//                 }

//                 // Guest access with share token
//                 try {
//                   const eventData = await getEventByShareToken(shareToken, password);
//                   if (!isMounted) return;
//                   setEvent(eventData);
//                   router.push(`/events/guest/${tokenEventId}?token=${shareToken}`);
//                   return;
//                 } catch (guestError: any) {
//                   console.error('Guest access failed:', guestError);

//                   if (guestError.message?.includes('expired')) {
//                     setError('This share link has expired');
//                   } else if (guestError.message?.includes('invalid')) {
//                     setError('This share link is no longer valid');
//                   } else if (guestError.message?.includes('invited') || guestError.message?.includes('guest list')) {
//                     // This is an invited-only event and the current user is not on the guest list
//                     console.log('Not on guest list error');
//                     router.push('/join/not-invited');
//                     return;
//                   } else if (tokenValidation.shareToken?.accessMode === 'invited_only') {
//                     // For invited-only events, the user needs to be logged in
//                     toast.error('Please log in to access this invited-only event');
//                     localStorage.setItem('redirectAfterLogin', window.location.href);
//                     router.push('/login');
//                   } else {
//                     toast.error('Please log in to access this content');
//                     localStorage.setItem('redirectAfterLogin', window.location.href);
//                     router.push('/login');
//                   }
//                 }
//               } catch (eventError) {
//                 console.error('Error fetching event with token:', eventError);
//                 setError('Event not found or no longer available');
//               }
//             } else if (tokenValidation.error?.includes('password')) {
//               setPasswordProtected(true);
//               setError('This shared link requires a password');
//             } else {
//               setError(tokenValidation.error || 'Invalid or expired share link');
//             }
//           } catch (tokenError) {
//             console.error('Token validation failed:', tokenError);
//             setError('Invalid share link');
//           }
//         } else if (eventId) {
//           if (!authToken) {
//             localStorage.setItem('redirectAfterLogin', window.location.href);
//             router.push('/login');
//             return;
//           }

//           try {
//             const eventData = await getEventById(eventId, authToken);
//             if (!isMounted) return;

//             if (!eventData) {
//               setError('Event not found');
//             } else {
//               setEvent(eventData);

//               if (
//                 eventData.accessType === 'public' ||
//                 (eventData.accessType === 'restricted' &&
//                   accessCode === eventData.accessCode)
//               ) {
//                 router.push(`/events/${eventId}`);
//               } else {
//                 setError('Invalid access code for this event');
//               }
//             }
//           } catch (err) {
//             console.error('Event fetch error:', err);
//             setError('Unable to load event');
//           }
//         } else {
//           setError('No event ID or share token provided');
//         }
//       } catch (err) {
//         console.error('Unexpected error:', err);
//         setError('Something went wrong');
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     };

//     findEventOrValidateToken();

//     return () => {
//       isMounted = false;
//     };
//   }, [eventId, accessCode, shareToken, router, token]);

//   const validateTokenWithPassword = async () => {
//     if (!shareToken || !password) return;
//     setJoining(true);

//     try {
//       const tokenValidation = await validateShareToken(shareToken, password);

//       if (tokenValidation.valid && tokenValidation.shareToken) {
//         const tokenEventId = tokenValidation.shareToken.eventId;
//         setShareTokenData(tokenValidation.shareToken);
//         router.push(`/events/${tokenEventId}`);
//       } else {
//         setError('Invalid password');
//       }
//     } catch (error) {
//       console.error('Password validation failed:', error);
//       setError('Failed to validate password');
//     } finally {
//       setJoining(false);
//     }
//   };

//   const joinEvent = async () => {
//     if (!event || !eventId) return;
//     setJoining(true);

//     try {
//       if (event.accessType === 'restricted' && accessCode !== event.accessCode) {
//         setError('Invalid access code');
//         return;
//       }
//       router.push(`/events/${eventId}`);
//     } catch (error) {
//       console.error('Error joining event:', error);
//       setError('Failed to join event');
//     } finally {
//       setJoining(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <Loader2 className="h-8 w-8 animate-spin" />
//       </div>
//     );
//   }

//   if (error && !passwordProtected) {
//     return (
//       <div className="container mx-auto px-4 py-8 max-w-md">
//         <Card>
//           <CardHeader>
//             <CardTitle>Access Error</CardTitle>
//             <CardDescription>There was a problem accessing this event</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <p className="text-red-500">{error}</p>
//           </CardContent>
//           <CardFooter>
//             <Button variant="outline" onClick={() => router.push('/events')} className="w-full">
//               Back to Events
//             </Button>
//           </CardFooter>
//         </Card>
//       </div>
//     );
//   }

//   if (passwordProtected) {
//     return (
//       <div className="container mx-auto px-4 py-8 max-w-md">
//         <Card>
//           <CardHeader>
//             <CardTitle>Password Protected</CardTitle>
//             <CardDescription>This shared content requires a password</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center mb-4">
//               <div className="bg-primary/10 p-3 rounded-full mr-4">
//                 <ShieldCheck className="h-6 w-6 text-primary" />
//               </div>
//               <div>
//                 <h3 className="font-medium">Protected Content</h3>
//                 <p className="text-gray-500 text-sm">Enter the password to access</p>
//               </div>
//             </div>
//             <div className="space-y-3 mt-4">
//               <Label htmlFor="password">Password</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="Enter password"
//               />
//               {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
//             </div>
//           </CardContent>
//           <CardFooter>
//             <Button onClick={validateTokenWithPassword} disabled={joining || !password} className="w-full">
//               {joining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
//               {joining ? 'Validating...' : 'Access Content'}
//             </Button>
//           </CardFooter>
//         </Card>
//       </div>
//     );
//   }

//   if (event) {
//     return (
//       <div className="container mx-auto px-4 py-8 max-w-md">
//         <Card>
//           <CardHeader>
//             <CardTitle>Join Event</CardTitle>
//             <CardDescription>You've been invited to join this event</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center mb-4">
//               <div className="bg-primary/10 p-3 rounded-full mr-4">
//                 <Calendar className="h-6 w-6 text-primary" />
//               </div>
//               <div>
//                 <h3 className="font-medium">{event.name}</h3>
//                 <p className="text-gray-500 text-sm">
//                   {event.date ? new Date(event.date).toLocaleDateString() : 'Date not available'}
//                 </p>
//               </div>
//             </div>
//             {event.description && <p className="text-gray-700 text-sm mb-4">{event.description}</p>}
//             {event.access?.level === 'invited_only' && (
//               <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
//                 You have access to this invited-only event.
//               </div>
//             )}
//             {event.accessType === 'restricted' && (
//               <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
//                 This is a restricted event. The access code has been verified.
//               </div>
//             )}
//           </CardContent>
//           <CardFooter>
//             <Button onClick={joinEvent} disabled={joining} className="w-full">
//               {joining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
//               {joining ? 'Joining...' : 'Join Event'}
//             </Button>
//           </CardFooter>
//         </Card>
//       </div>
//     );
//   }

//   return null;
// }
