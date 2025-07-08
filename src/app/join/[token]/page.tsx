// app/join/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, 
  Camera, 
  Calendar, 
  MapPin, 
  Users, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { getTokenInfo } from '@/services/apis/sharing.api';

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

interface TokenInfo {
  event: {
    _id: string;
    title: string;
    description: string;
    cover_image?: { url: string };
    location?: { name: string };
    start_date: string;
    created_by: {
      _id: string;
      name: string;
      email?: string;
    };
    stats?: {
      participants?: { total: number };
    };
  };
  tokenType: string;
  name?: string;
  permissions: {
    view: boolean;
    upload: boolean;
    download: boolean;
    share: boolean;
    comment: boolean;
  };
  restrictions: {
    requiresApproval: boolean;
    expiresAt?: string;
    maxUses?: number;
    currentUses: number;
  };
  inviter: {
    name: string;
    avatar_url?: string;
  };
}

interface ApiTokenResponse {
  _id: string;
  event_id: {
    _id: string;
    title: string;
    description: string;
    cover_image?: { url: string };
    location?: { name: string };
    start_date?: string;
    privacy: any;
  };
  token: string;
  token_type: string;
  permissions: {
    view: boolean;
    upload: boolean;
    download: boolean;
    share: boolean;
    comment: boolean;
  };
  restrictions: {
    max_uses: number | null;
    expires_at: string | null;
    allowed_emails: string[];
    requires_approval: boolean;
  };
  usage: {
    count: number;
    used_by: any[];
  };
  created_by: {
    _id: string;
    name: string;
    email: string;
  };
  revoked: boolean;
  created_at: string;
}

export default function JoinPage({ params }: JoinPageProps) {
  const { token } = use(params);
  const router = useRouter();
  
  // State management
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  
  // Check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication status
    const authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    
    if (authToken && userEmail) {
      setIsLoggedIn(true);
      setCurrentUser({
        id: userId,
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        avatar_url: localStorage.getItem('userAvatar') || ''
      });
    }
  }, []);

  const buildRedirectUrl = (eventId: string, status: string = 'active') => {
    const baseUrl = `/events/${eventId}`;
    const params = new URLSearchParams();
    
    // Always add sharing context
    params.set('via', 'share');
    params.set('token', token);
    params.set('welcome', 'true');
    params.set('status', status);
    
    return `${baseUrl}?${params.toString()}`;
  };

  const redirectToEventDirectly = (eventInfo: TokenInfo, status: string = 'active', delay: number = 1500) => {
    console.log('redirectToEventDirectly called with status:', status, 'delay:', delay);
    console.log('Event info for redirect:', eventInfo);
    
    if (!eventInfo || !eventInfo.event?._id) {
      console.error('Cannot redirect: invalid event info');
      setError('Unable to redirect to event. Please try again.');
      setLoading(false);
      return;
    }
    
    setRedirecting(true);
    
    setTimeout(() => {
      try {
        const redirectUrl = buildRedirectUrl(eventInfo.event._id, status);
        console.log('Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      } catch (error) {
        console.error('Error during redirect:', error);
        setError('Failed to redirect to event. Please try again.');
        setLoading(false);
        setRedirecting(false);
      }
    }, delay);
  };

  const redirectToEvent = (status: string = 'active', delay: number = 1500) => {
    console.log('redirectToEvent called with status:', status, 'delay:', delay);
    
    if (!tokenInfo) {
      console.error('Cannot redirect: tokenInfo is null');
      setError('Unable to redirect to event. Please try again.');
      setLoading(false);
      return;
    }
    
    console.log('TokenInfo for redirect:', tokenInfo);
    
    setRedirecting(true);
    
    setTimeout(() => {
      try {
        const redirectUrl = buildRedirectUrl(tokenInfo.event._id, status);
        console.log('Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      } catch (error) {
        console.error('Error during redirect:', error);
        setError('Failed to redirect to event. Please try again.');
        setLoading(false);
        setRedirecting(false);
      }
    }, delay);
  };

  const transformApiResponse = (apiResponse: any): TokenInfo => {
    console.log('Transforming API response:', apiResponse);
    
    try {
      const transformed = {
        event: {
          _id: apiResponse.event_id?._id || '',
          title: apiResponse.event_id?.title || 'Untitled Event',
          description: apiResponse.event_id?.description || '',
          cover_image: apiResponse.event_id?.cover_image,
          location: apiResponse.event_id?.location,
          start_date: apiResponse.event_id?.start_date || apiResponse.created_at || new Date().toISOString(),
          created_by: {
            _id: apiResponse.created_by?._id || '',
            name: apiResponse.created_by?.name || 'Unknown',
            email: apiResponse.created_by?.email
          },
          stats: {
            participants: { total: 0 } // Default value since not in API response
          }
        },
        tokenType: apiResponse.token_type || 'invite',
        name: apiResponse.name || undefined,
        permissions: {
          view: apiResponse.permissions?.view ?? true,
          upload: apiResponse.permissions?.upload ?? false,
          download: apiResponse.permissions?.download ?? false,
          share: apiResponse.permissions?.share ?? false,
          comment: apiResponse.permissions?.comment ?? true
        },
        restrictions: {
          requiresApproval: apiResponse.restrictions?.requires_approval ?? false,
          expiresAt: apiResponse.restrictions?.expires_at || undefined,
          maxUses: apiResponse.restrictions?.max_uses || undefined,
          currentUses: apiResponse.usage?.count || 0
        },
        inviter: {
          name: apiResponse.created_by?.name || 'Unknown',
          avatar_url: apiResponse.created_by?.avatar_url || undefined
        }
      };
      
      console.log('Successfully transformed response:', transformed);
      return transformed;
    } catch (error) {
      console.error('Error transforming API response:', error);
      throw new Error('Failed to transform API response');
    }
  };

  useEffect(() => {
    const validateTokenAndRedirect = async () => {
      if (!token) {
        console.error('No token provided');
        setError('Invalid token');
        setLoading(false);
        return;
      }

      try {
        console.log('Starting token validation for:', token);
        const response = await getTokenInfo(token);
        console.log('Raw API response:', JSON.stringify(response, null, 2));
        
        // Handle different response structures with detailed logging
        let apiData: any;
        
        if (response && response.data) {
          console.log('Using response.data');
          apiData = response.data;
        } else if (response && response.token) {
          console.log('Using response.token');
          apiData = response.token;
        } else if (response && response._id && response.event_id) {
          console.log('Using direct response');
          apiData = response;
        } else {
          console.error('Invalid response structure:', response);
          throw new Error('Invalid response structure from API');
        }
        
        console.log('Selected API data:', JSON.stringify(apiData, null, 2));
        
        // Check if apiData has required fields
        if (!apiData.event_id || !apiData.event_id._id) {
          console.error('Missing event_id in API response');
          throw new Error('Invalid token data - missing event information');
        }
        
        // Transform API response to expected format
        const transformedInfo = transformApiResponse(apiData);
        console.log('Transformed token info:', JSON.stringify(transformedInfo, null, 2));
        
        setTokenInfo(transformedInfo);
        console.log('TokenInfo state set successfully');
        
        // Add a small delay to ensure state is set before redirecting
        setTimeout(() => {
          // Token is valid - show success message and redirect
          if (transformedInfo.restrictions?.requiresApproval) {
            console.log('Token requires approval, redirecting...');
            toast.success('Access Validated', {
              description: 'Note: This event requires host approval for participation.',
              duration: 3000
            });
            redirectToEventDirectly(transformedInfo, 'requires_approval', 2000);
          } else {
            console.log('Token validated successfully, redirecting...');
            toast.success('Access Granted!', {
              description: 'Redirecting you to the event...',
              duration: 2000
            });
            redirectToEventDirectly(transformedInfo, 'active', 1500);
          }
        }, 100);
        
      } catch (error) {
        console.error('Token validation failed with error:', error);
        console.error('Error stack:', error.stack);
        
        let errorMessage = 'Unable to validate invitation. Please try again.';
        
        if (error instanceof Error) {
          console.log('Error message:', error.message);
          if (error.message.includes('404') || error.message.includes('Invalid token')) {
            errorMessage = 'Invalid invitation link. The link may be expired or incorrect.';
          } else if (error.message.includes('expired')) {
            errorMessage = 'This invitation link has expired.';
          } else if (error.message.includes('usage limit')) {
            errorMessage = 'This invitation link has reached its usage limit.';
          } else if (error.message.includes('not authorized')) {
            errorMessage = 'You are not authorized to access this event.';
          } else if (error.message.includes('Invalid response structure')) {
            errorMessage = 'Invalid response from server. Please try again.';
          }
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    validateTokenAndRedirect();
  }, [token]);

  if (loading || redirecting) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 mb-2">
              {loading ? 'Validating access...' : 'Redirecting to event...'}
            </p>
            {redirecting && (
              <p className="text-sm text-gray-500">
                Please wait while we take you to the event
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Access Denied</CardTitle>
            <CardDescription className="text-red-700">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => router.push('/events')} className="w-full">
              Browse Public Events
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  const event = tokenInfo.event;
  const permissions = tokenInfo.permissions;
  const restrictions = tokenInfo.restrictions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Access Granted Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Access Granted!
            </CardTitle>
            <CardDescription className="text-gray-600">
              You have been granted access to this event
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Event details */}
            <div className="space-y-4">
              {/* Event cover and title */}
              <div className="text-center">
                {event.cover_image?.url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden mb-4">
                    <img 
                      src={event.cover_image.url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
                {event.description && (
                  <p className="text-gray-600 mt-2">{event.description}</p>
                )}
              </div>

              {/* Event metadata */}
              <div className="flex flex-wrap gap-3 justify-center text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.start_date).toLocaleDateString()}
                </div>
                {event.location?.name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location.name}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.stats?.participants?.total || 0} participants
                </div>
              </div>

              {/* Inviter info */}
              <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={tokenInfo.inviter.avatar_url} />
                  <AvatarFallback>
                    {tokenInfo.inviter.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">Shared by {tokenInfo.inviter.name}</p>
                  <p className="text-sm text-gray-600">Event host</p>
                </div>
              </div>
            </div>

            {/* Access Level */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">Your Access Level</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {permissions.view && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>View photos</span>
                  </div>
                )}
                {permissions.upload && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Upload photos</span>
                  </div>
                )}
                {permissions.download && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Download photos</span>
                  </div>
                )}
                {permissions.comment && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Add comments</span>
                  </div>
                )}
                {permissions.share && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Share with others</span>
                  </div>
                )}
              </div>
            </div>

            {/* Special Notices */}
            {restrictions.requiresApproval && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-medium text-amber-800">Approval Required</h3>
                </div>
                <p className="text-sm text-amber-700">
                  This event requires host approval for certain actions. You can view the event, but some features may need approval.
                </p>
              </div>
            )}

            {/* Link Details */}
            {(restrictions.expiresAt || restrictions.maxUses) && (
              <div className="text-center text-sm text-gray-600 space-y-1">
                {restrictions.expiresAt && (
                  <p>• Link expires on {new Date(restrictions.expiresAt).toLocaleDateString()}</p>
                )}
                {restrictions.maxUses && (
                  <p>• {restrictions.currentUses}/{restrictions.maxUses} uses of this link</p>
                )}
              </div>
            )}

            {/* Redirecting message */}
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                <ArrowRight className="h-5 w-5" />
                <span className="font-medium">Taking you to the event...</span>
              </div>
              <p className="text-sm text-gray-500">
                You will be automatically redirected in a moment
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={() => redirectToEventDirectly(tokenInfo, 'active', 0)}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700" 
              size="lg"
            >
              <Camera className="mr-2 h-4 w-4" />
              Continue to Event
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By accessing this event, you agree to the event's terms and photo sharing policies
            </p>
          </CardFooter>
        </Card>

        {/* Additional info card */}
        <Card className="mt-4 bg-white/80 backdrop-blur border-0">
          <CardContent className="p-4">
            <div className="text-center text-sm text-gray-600">
              <p className="font-medium mb-2">Secure Access Verified</p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✓ Valid Link
                </Badge>
                <Badge variant="outline">{tokenInfo.tokenType}</Badge>
                {tokenInfo.name && <span>• {tokenInfo.name}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}