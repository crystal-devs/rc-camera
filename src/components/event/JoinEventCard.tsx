'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2, CheckCircle, AlertTriangle, Lock, ArrowRight, LogIn,
    Calendar, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { useToken } from '@/hooks/useToken';

interface EventAccess {
    canJoin: boolean;
    requiresAuth: boolean;
    role: 'guest' | 'owner' | 'co_host';
}

interface EventData {
    _id: string;
    title: string;
    description: string;
    start_date: string;
    visibility: 'anyone_with_link' | 'invited_only' | 'private';
    cover_image?: { url: string };
    location?: { name: string };
    permissions?: {
        can_upload: boolean;
        can_download: boolean;
    };
}

interface TokenResponse {
    event: EventData;
    access: EventAccess;
}

interface JoinEventCardProps {
    token: string;
    onJoin?: () => void; // Optional callback for custom join handling
}

export default function JoinEventCard({ token, onJoin }: JoinEventCardProps) {
    const router = useRouter();
    const authToken = useToken();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tokenData, setTokenData] = useState<TokenResponse | null>(null);

    const [auth] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('authToken');
            return token;
        }
        return null;
    });

    const validateToken = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await getTokenInfo(token, auth);

            if (!response.data?.event) {
                throw new Error('Invalid response format');
            }

            const { event, access } = response.data;
            setTokenData({ event, access });

            setLoading(false);

            if (access.requiresAuth) {
                setError('This event requires you to sign in first.');
                return;
            }

            if (!access.canJoin) {
                setError(getAccessDeniedMessage(event.visibility, access.role));
                return;
            }

        } catch (e: any) {
            setLoading(false);

            if (e.status === 401) {
                setError('This event requires you to sign in first.');
            } else if (e.status === 403) {
                setError(e.message || 'You don\'t have permission to access this event.');
            } else if (e.status === 404) {
                setError('Event not found. The link may be invalid or expired.');
            } else {
                setError(e.message || 'Unable to access this event. Please try again.');
            }
        }
    };

    const handleLoginRedirect = () => {
        const redirectUrl = `/guest/${token}`;
        if (typeof window !== 'undefined') {
            localStorage.setItem('redirectAfterLogin', redirectUrl);
        }
        router.push('/login');
    };

    const handleJoinEvent = () => {
        if (onJoin) {
            onJoin();
        } else {
            router.push(`/guest/${token}`);
        }
    };

    const getAccessDeniedMessage = (visibility: string, role: string): string => {
        switch (visibility) {
            case 'private':
                return 'This event is private and only accessible to the event creator and co-hosts.';
            case 'invited_only':
                return 'This event requires you to sign in first.';
            default:
                return 'You don\'t have permission to access this event.';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getVisibilityLabel = (visibility: string) => {
        switch (visibility) {
            case 'anyone_with_link': return 'Public Event';
            case 'invited_only': return 'Invited Event';
            case 'private': return 'Private Event';
            default: return 'Event';
        }
    };

    useEffect(() => {
        if (token) {
            validateToken();
        }
    }, [token, authToken]);

    if (loading) {
        return (
            <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="flex flex-col items-center py-12">
                    <div className="mb-6 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 p-4">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Checking your invitation
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                        Validating access to this event...
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0">
                <CardHeader className="text-center pt-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-red-800 mb-2">
                        Unable to Join Event
                    </CardTitle>
                    <CardDescription className="text-red-700 text-base">
                        {error}
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col gap-3 pt-6 pb-8">
                    {error.includes('sign in') ? (
                        <Button
                            onClick={handleLoginRedirect}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                            size="lg"
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In to Continue
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                            className="w-full border-gray-300"
                            size="lg"
                        >
                            Return Home
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    if (tokenData) {
        const { event, access } = tokenData;

        return (
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
                {/* Cover Image */}
                <div className="relative h-48 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                    {event.cover_image?.url ? (
                        <img
                            src={event.cover_image.url}
                            alt={event.title}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-90" />
                    )}
                    <div className="absolute inset-0 bg-black/20" />

                    {/* Event Type Badge */}
                    <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 backdrop-blur-sm">
                            <Users className="w-3 h-3 mr-1" />
                            {getVisibilityLabel(event.visibility)}
                        </span>
                    </div>
                </div>

                <CardContent className="p-8">
                    {/* Event Details */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-3">
                            {event.title}
                        </h2>
                        {event.description && (
                            <p className="text-gray-600 text-lg leading-relaxed mb-4">
                                {event.description}
                            </p>
                        )}
                    </div>

                    {/* Event Info */}
                    <div className="grid gap-4 mb-8">
                        <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            <div className="text-center">
                                <p className="font-semibold text-gray-800">
                                    {formatDate(event.start_date)}
                                </p>
                            </div>
                        </div>

                        {event.location?.name && (
                            <div className="text-center text-gray-600">
                                📍 {event.location.name}
                            </div>
                        )}
                    </div>

                    {/* Join Button */}
                    <div className="text-center">
                        <Button
                            onClick={handleJoinEvent}
                            size="lg"
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        >
                            <ArrowRight className="mr-2 h-5 w-5" />
                            {access.role === 'owner' ? 'Manage Event' : 'Join the Event'}
                        </Button>

                        <p className="text-sm text-gray-500 mt-4">
                            You'll be taken to the event gallery where you can view and share memories
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
}