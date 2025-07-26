'use client';
'use client';

import TeamTab from '@/components/event/TeamTab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { deleteEvent, getEventById, updateEvent } from '@/services/apis/events.api';
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  Globe,
  Info,
  Lock,
  Save,
  Settings,
  Share2,
  Trash2,
  Upload,
  Users,
  Video,
  X
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

type EventFormData = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: {
    name: string;
    address: string;
  };
  template: string;
  cover_image: {
    url: string;
    public_id: string;
  };
  visibility: string;
  permissions: {
    can_view: boolean;
    can_upload: boolean;
    can_download: boolean;
    allowed_media_types: {
      images: boolean;
      videos: boolean;
    };
    require_approval: boolean;
  };
  share_settings: {
    is_active: boolean;
    password: string | null;
    expires_at: string | null;
  };
  share_token: string;
  co_host_invite_token: {
    token: string;
    expires_at: string;
    is_active: boolean;
  };
};

const EventSettingsPage = () => {
  const params = useParams();
  const { eventId } = params;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('basics');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: { name: '', address: '' },
    template: 'custom',
    cover_image: { url: '', public_id: '' },
    visibility: 'private',
    permissions: {
      can_view: true,
      can_upload: true,
      can_download: true,
      allowed_media_types: {
        images: true,
        videos: true
      },
      require_approval: false
    },
    share_settings: {
      is_active: true,
      password: null,
      expires_at: null
    },
    share_token: '',
    co_host_invite_token: {
      token: '',
      expires_at: '',
      is_active: true
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<EventFormData | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState('');
   const [currentUserId, setCurrentUserId] = useState<string>('');
  const [eventCreatorId, setEventCreatorId] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      toast.error("You need to be logged in");
      router.push('/events');
    }
  }, [router]);

  useEffect(() => {
    const getUserId = () => {
      // If you store user ID in localStorage
      const userId = localStorage.getItem('userId');
      if (userId) {
        setCurrentUserId(userId);
        return;
      }

      // If you need to decode it from the auth token
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Decode JWT token to get user ID
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.userId || payload.user_id || payload.id);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    };

    getUserId();
  }, []);


  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!authToken) return;

      try {
        const eventData = await getEventById(eventId as string, authToken);
        if (!eventData) {
          toast.error("Event not found");
          router.push('/events');
          return;
        }
        setEventCreatorId(eventData.created_by);

        const convertedData: EventFormData = {
          title: eventData.title || '',
          description: eventData.description || '',
          start_date: eventData.start_date ? new Date(eventData.start_date).toISOString().slice(0, 16) : '',
          end_date: eventData.end_date ? new Date(eventData.end_date).toISOString().slice(0, 16) : '',
          location: {
            name: eventData.location?.name || '',
            address: eventData.location?.address || ''
          },
          template: eventData.template || 'custom',
          cover_image: {
            url: eventData.cover_image?.url || '',
            public_id: eventData.cover_image?.public_id || ''
          },
          visibility: eventData.visibility || 'private',
          permissions: {
            can_view: eventData.permissions?.can_view ?? true,
            can_upload: eventData.permissions?.can_upload ?? true,
            can_download: eventData.permissions?.can_download ?? true,
            allowed_media_types: {
              images: eventData.permissions?.allowed_media_types?.images ?? true,
              videos: eventData.permissions?.allowed_media_types?.videos ?? true
            },
            require_approval: eventData.permissions?.require_approval ?? false
          },
          share_settings: {
            is_active: eventData.share_settings?.is_active ?? true,
            password: eventData.share_settings?.password || null,
            expires_at: eventData.share_settings?.expires_at || null
          },
          share_token: eventData.share_token || '',
          co_host_invite_token: {
            token: eventData.co_host_invite_token?.token || '',
            expires_at: eventData.co_host_invite_token?.expires_at || '',
            is_active: eventData.co_host_invite_token?.is_active ?? true
          }
        };

        setFormData(convertedData);
        setOriginalData(convertedData);
        setPreviewUrl(eventData.cover_image?.url || null);
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error("Failed to load event");
      } finally {
        setIsLoading(false);
      }
    };

    if (authToken) {
      loadEvent();
    }
  }, [eventId, authToken, router]);

  // Check for changes
  useEffect(() => {
    if (!originalData) return;
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData) || coverImageFile !== null;
    setHasChanges(hasChanges);
  }, [formData, originalData, coverImageFile]);

  const eventTemplates = [
    { value: 'wedding', label: '💒 Wedding', desc: 'Perfect for wedding ceremonies and receptions' },
    { value: 'birthday', label: '🎂 Birthday', desc: 'Celebrate special birthdays and milestones' },
    { value: 'vacation', label: '🏖️ Vacation', desc: 'Share memories from your travels' },
    { value: 'corporate', label: '🏢 Corporate', desc: 'Team events and company gatherings' },
    { value: 'concert', label: '🎵 Concert', desc: 'Music events and performances' },
    { value: 'custom', label: '✨ Other', desc: 'Any other special occasion' }
  ];

  const handleInputChange = (field: string, value: any) => {
    const fieldParts = field.split('.');
    setFormData(prev => {
      let newData = { ...prev };
      let current: any = newData;

      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = { ...current[fieldParts[i]] };
        current = current[fieldParts[i]];
      }

      current[fieldParts[fieldParts.length - 1]] = value;
      return newData;
    });
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setCoverImageFile(null);
      return;
    }

    const selectedFile = e.target.files[0];
    setCoverImageFile(selectedFile);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      toast.success("Link copied!");
      setTimeout(() => setCopiedLink(''), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const getShareUrl = () => {
    if (!formData.share_token) return '';
    return `${window.location.origin}/join/${formData.share_token}`;
  };

  const getCoHostInviteUrl = () => {
    if (!formData.co_host_invite_token.token) return '';
    return `${window.location.origin}/join-cohost/${formData.co_host_invite_token.token}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Event name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };

      await updateEvent(eventId as string, submitData, authToken!);
      toast.success("Event updated successfully!");
      setOriginalData(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error("Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!authToken) return;

    try {
      await deleteEvent(eventId as string, authToken);
      toast.success("Event deleted successfully!");
      router.push('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const isEventCreator = currentUserId && eventCreatorId && currentUserId === eventCreatorId;


  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/events/${eventId}`)}
              className="rounded-full hover:bg-white/80"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Event Settings
              </h1>
              <p className="text-gray-500 text-sm">{formData.title || 'Configure your event'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this event and all photos. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-600 hover:bg-red-700">
                    Delete Event
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>


        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-11 bg-gray-100/80 border-0">
            <TabsTrigger
              value="basics"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger
              value="sharing"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Sharing</span>
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          {/* Event Details Tab */}
          <TabsContent value="basics" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-gray-900">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">Event name *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Sarah's Birthday Party"
                      className="h-10"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template" className="text-sm font-medium text-gray-700">Event type</Label>
                    <Select value={formData.template} onValueChange={(value) => handleInputChange('template', value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTemplates.map(template => (
                          <SelectItem key={template.value} value={template.value}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Tell your guests what to expect..."
                    rows={3}
                    maxLength={500}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_name" className="text-sm font-medium text-gray-700">Venue</Label>
                    <Input
                      id="location_name"
                      value={formData.location.name}
                      onChange={(e) => handleInputChange('location.name', e.target.value)}
                      placeholder="Central Park"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_address" className="text-sm font-medium text-gray-700">Address</Label>
                    <Input
                      id="location_address"
                      value={formData.location.address}
                      onChange={(e) => handleInputChange('location.address', e.target.value)}
                      placeholder="New York, NY"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm font-medium text-gray-700">Start date & time</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm font-medium text-gray-700">End date & time</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cover Photo Card */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-gray-900">Cover Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Cover preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                        onClick={() => {
                          setCoverImageFile(null);
                          setPreviewUrl(null);
                          handleInputChange('cover_image.url', '');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                      <Camera className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-600">Add a cover photo</p>
                      <p className="text-xs text-gray-500">Help guests recognize your event</p>
                    </div>
                  )}

                  <Input
                    id="cover_image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('cover_image')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {previewUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sharing Tab */}
          <TabsContent value="sharing" className="space-y-4">
            <Card className="border-0 shadow-sm ">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Who can access your event?</CardTitle>
                <p className="text-sm text-gray-500">Choose how people can join and view photos</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={formData.visibility} onValueChange={(value) => handleInputChange('visibility', value)}>
                  <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-green-100 bg-green-50/30">
                    <RadioGroupItem value="anyone_with_link" id="anyone_with_link" className="mt-1" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="anyone_with_link" className="text-base font-medium cursor-pointer flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-600" />
                        Anyone with the link
                      </Label>
                      <p className="text-sm">Great for parties and public events. Share one link and anyone can join.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-blue-100 bg-blue-50/30">
                    <RadioGroupItem value="invited_only" id="invited_only" className="mt-1" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="invited_only" className="text-base font-medium cursor-pointer flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        Only people I invite
                      </Label>
                      <p className="text-sm ">Perfect for weddings and private gatherings. You control who gets access.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 bg-gray-50/50">
                    <RadioGroupItem value="private" id="private" className="mt-1" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="private" className="text-base font-medium cursor-pointer flex items-center gap-2">
                        <Lock className="h-4 w-4 " />
                        Just me and my team
                      </Label>
                      <p className="text-sm ">Completely private. Only you and co-hosts can see everything.</p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Share Links */}
            {(formData.visibility === 'anyone_with_link' || formData.visibility === 'invited_only') && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium ">Share your event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">Event link</Label>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        {formData.visibility === 'anyone_with_link' ? 'Public Link' : 'Invite Only'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={getShareUrl()}
                        readOnly
                        className="font-mono text-sm bg-gray-50"
                      />
                      <Button
                        onClick={() => copyToClipboard(getShareUrl(), 'guest')}
                        variant="outline"
                        size="sm"
                      >
                        {copiedLink === 'guest' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Send this link to guests so they can view and upload photos
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">Co-host invitation</Label>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">Team Access</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={getCoHostInviteUrl()}
                        readOnly
                        className="font-mono text-sm bg-gray-50"
                      />
                      <Button
                        onClick={() => copyToClipboard(getCoHostInviteUrl(), 'cohost')}
                        variant="outline"
                        size="sm"
                      >
                        {copiedLink === 'cohost' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Invite people to help you manage the event and approve photos
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Password Protection */}
            {formData.visibility !== 'private' && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">Additional Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Password protect this event</Label>
                      <p className="text-xs text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Switch
                      checked={!!formData.share_settings?.password}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('share_settings.password', 'temp-password');
                        } else {
                          handleInputChange('share_settings.password', null);
                        }
                      }}
                    />
                  </div>

                  {formData.share_settings?.password && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">Event password</Label>
                      <Input
                        id="password"
                        type="text"
                        value={formData.share_settings.password || ''}
                        onChange={(e) => handleInputChange('share_settings.password', e.target.value)}
                        placeholder="Enter password"
                        className="h-10"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Photo Management</CardTitle>
                <p className="text-sm text-gray-500">Control how photos are handled in your event</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">
                    Would you like to review photos before they appear?
                  </Label>
                  <RadioGroup
                    value={formData.permissions?.require_approval ? "review_first" : "publish_directly"}
                    onValueChange={(value) => handleInputChange('permissions.require_approval', value === "review_first")}
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border">
                      <RadioGroupItem value="publish_directly" id="publish_directly" className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="publish_directly" className="text-sm font-medium cursor-pointer">
                          No, publish photos immediately
                        </Label>
                        <p className="text-xs text-gray-500">Photos appear instantly when uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg border">
                      <RadioGroupItem value="review_first" id="review_first" className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="review_first" className="text-sm font-medium cursor-pointer">
                          Yes, I'll review photos first
                        </Label>
                        <p className="text-xs text-gray-500">You approve each photo before others can see it</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-medium text-gray-900 mb-4 block">
                    What can guests do?
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">View photos</Label>
                        <p className="text-xs text-gray-500">See all approved photos</p>
                      </div>
                      <Switch
                        checked={formData.permissions?.can_view}
                        onCheckedChange={(checked) => handleInputChange('permissions.can_view', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Upload photos</Label>
                        <p className="text-xs text-gray-500">Add their own photos to the event</p>
                      </div>
                      <Switch
                        checked={formData.permissions?.can_upload}
                        onCheckedChange={(checked) => handleInputChange('permissions.can_upload', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Download photos</Label>
                        <p className="text-xs text-gray-500">Save photos to their device</p>
                      </div>
                      <Switch
                        checked={formData.permissions?.can_download}
                        onCheckedChange={(checked) => handleInputChange('permissions.can_download', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium text-gray-900 mb-4 block">
                    What can guests upload?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Photos
                      </Label>
                      <Switch
                        checked={formData.permissions?.allowed_media_types?.images}
                        onCheckedChange={(checked) => handleInputChange('permissions.allowed_media_types.images', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Videos
                      </Label>
                      <Switch
                        checked={formData.permissions?.allowed_media_types?.videos}
                        onCheckedChange={(checked) => handleInputChange('permissions.allowed_media_types.videos', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-gray-900">Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium text-gray-900 mb-4 block">
                    Should guests provide their name when uploading?
                  </Label>
                  <RadioGroup
                    value="optional" // You'll need to add this to your schema
                    onValueChange={(value) => {
                      // Handle name requirement setting
                    }}
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border">
                      <RadioGroupItem value="optional" id="name_optional" className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="name_optional" className="text-sm font-medium cursor-pointer">
                          No, names are optional
                        </Label>
                        <p className="text-xs text-gray-500">Guests can upload anonymously</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg border">
                      <RadioGroupItem value="required" id="name_required" className="mt-1" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="name_required" className="text-sm font-medium cursor-pointer">
                          Yes, require names
                        </Label>
                        <p className="text-xs text-gray-500">You'll know who uploaded each photo</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            {eventId && authToken && <TeamTab eventId={eventId as string} authToken={authToken} isEventCreator={isEventCreator} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

};

export default EventSettingsPage;