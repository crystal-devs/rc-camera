'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Save,
  Trash2,
  Users,
  Shield,
  Camera,
  Settings,
  Mail,
  Plus,
  X,
  UserPlus,
  Upload,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { getEventById, updateEvent, deleteEvent } from '@/services/apis/events.api';
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
import { Skeleton } from '@/components/ui/skeleton';

type EventFormData = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: {
    name: string;
  };
  template: string;
  cover_image: {
    url: string;
    public_id: string;
  };
  localization: {
    primary_language: string;
  };
  privacy: {
    visibility: string;
    content_controls: {
      approval_mode: string;
      allowed_media_types: {
        images: boolean;
        videos: boolean;
      };
      allow_downloads: boolean;
      allow_sharing: boolean;
      max_file_size_mb: number;
    };
    guest_management: {
      max_guests: number;
      allow_anonymous: boolean;
      auto_approve_invited: boolean;
    };
  };
  default_guest_permissions: {
    view: boolean;
    upload: boolean;
    download: boolean;
    comment: boolean;
    share: boolean;
  };
  co_hosts: string[];
};

const EventSettingsPage = () => {
  const params = useParams();
  const { eventId } = params;
  const router = useRouter();

  console.log(eventId,'eventIdeventId')
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: { name: '' },
    template: 'custom',
    cover_image: {
      url: '',
      public_id: ''
    },
    localization: {
      primary_language: 'en'
    },
    privacy: {
      visibility: 'private',
      content_controls: {
        approval_mode: 'auto',
        allowed_media_types: {
          images: true,
          videos: true
        },
        allow_downloads: true,
        allow_sharing: false,
        max_file_size_mb: 50
      },
      guest_management: {
        max_guests: 200,
        allow_anonymous: false,
        auto_approve_invited: true
      }
    },
    default_guest_permissions: {
      view: true,
      upload: true,
      download: true,
      comment: true,
      share: false
    },
    co_hosts: []
  });

  const [newCoHost, setNewCoHost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<EventFormData | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    const loadEvent = async () => {
      if (!authToken) return;

      try {
        const eventData = await getEventById(eventId as string, authToken);
        if (!eventData) {
          toast.error("Event not found");
          router.push('/events');
          return;
        }

        const convertedData: EventFormData = {
          title: eventData.title || '',
          description: eventData.description || '',
          start_date: eventData.start_date ? new Date(eventData.start_date).toISOString().slice(0, 16) : '',
          end_date: eventData.end_date ? new Date(eventData.end_date).toISOString().slice(0, 16) : '',
          location: { name: eventData.location?.name || '' },
          template: eventData.template || 'custom',
          cover_image: {
            url: eventData.cover_image?.url || '',
            public_id: eventData.cover_image?.public_id || ''
          },
          localization: {
            primary_language: eventData.localization?.primary_language || 'en'
          },
          privacy: {
            visibility: eventData.privacy?.visibility || 'private',
            content_controls: {
              approval_mode: eventData.privacy?.content_controls?.approval_mode || 'auto',
              allowed_media_types: {
                images: eventData.privacy?.content_controls?.allowed_media_types?.images ?? true,
                videos: eventData.privacy?.content_controls?.allowed_media_types?.videos ?? true
              },
              allow_downloads: eventData.privacy?.content_controls?.allow_downloads ?? true,
              allow_sharing: eventData.privacy?.content_controls?.allow_sharing ?? false,
              max_file_size_mb: eventData.privacy?.content_controls?.max_file_size_mb || 50
            },
            guest_management: {
              max_guests: eventData.privacy?.guest_management?.max_guests || 200,
              allow_anonymous: eventData.privacy?.guest_management?.allow_anonymous ?? false,
              auto_approve_invited: eventData.privacy?.guest_management?.auto_approve_invited ?? true
            }
          },
          default_guest_permissions: {
            view: eventData.default_guest_permissions?.view ?? true,
            upload: eventData.default_guest_permissions?.upload ?? true,
            download: eventData.default_guest_permissions?.download ?? true,
            comment: eventData.default_guest_permissions?.comment ?? true,
            share: eventData.default_guest_permissions?.share ?? false
          },
          co_hosts: eventData.co_hosts || []
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
    { value: 'wedding', label: 'Wedding' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'party', label: 'Party' },
    { value: 'graduation', label: 'Graduation' },
    { value: 'vacation', label: 'Vacation' },
    { value: 'custom', label: 'Other' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी (Hindi)' },
    { value: 'bn', label: 'বাংলা (Bengali)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'mr', label: 'मराठी (Marathi)' },
    { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { value: 'ml', label: 'മലയാളം (Malayalam)' },
    { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' }
  ];

  const addCoHost = () => {
    if (newCoHost.trim() && !formData.co_hosts.includes(newCoHost.trim())) {
      setFormData(prev => ({
        ...prev,
        co_hosts: [...prev.co_hosts, newCoHost.trim()]
      }));
      setNewCoHost('');
    }
  };

  const removeCoHost = (hostToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      co_hosts: prev.co_hosts.filter(host => host !== hostToRemove)
    }));
  };

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

  const removeCoverImage = () => {
    setCoverImageFile(null);
    setPreviewUrl(null);
    handleInputChange('cover_image.url', '');
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/events/${eventId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Event Settings</h1>
            <p className="text-sm text-muted-foreground">{formData.title || 'Unnamed Event'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
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
                <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground">
                  Delete Event
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSubmit} disabled={!hasChanges || isSubmitting} size="sm">
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 overflow-x-auto">
          <TabsTrigger value="basic" className="flex items-center gap-2 text-xs md:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2 text-xs md:text-sm">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2 text-xs md:text-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2 text-xs md:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Event Name</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="My Amazing Event"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="template">Event Type</Label>
                  <Select value={formData.template} onValueChange={(value) => handleInputChange('template', value)}>
                    <SelectTrigger>
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Tell guests about your event..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location.name}
                  onChange={(e) => handleInputChange('location.name', e.target.value)}
                  placeholder="Paradise Resort, Goa"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </Label>
                <Select value={formData.localization.primary_language} onValueChange={(value) => handleInputChange('localization.primary_language', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cover Image</CardTitle>
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
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeCoverImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No cover image selected</p>
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
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {previewUrl ? 'Change Image' : 'Upload Image'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Allowed Media Types</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="images"
                      checked={formData.privacy.content_controls.allowed_media_types.images}
                      onCheckedChange={(checked) => handleInputChange('privacy.content_controls.allowed_media_types.images', checked)}
                    />
                    <Label htmlFor="images">📸 Images</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="videos"
                      checked={formData.privacy.content_controls.allowed_media_types.videos}
                      onCheckedChange={(checked) => handleInputChange('privacy.content_controls.allowed_media_types.videos', checked)}
                    />
                    <Label htmlFor="videos">🎥 Videos</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="max_file_size">Maximum File Size</Label>
                <Select
                  value={formData.privacy.content_controls.max_file_size_mb.toString()}
                  onValueChange={(value) => handleInputChange('privacy.content_controls.max_file_size_mb', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 MB - Fast uploads</SelectItem>
                    <SelectItem value="25">25 MB - Balanced</SelectItem>
                    <SelectItem value="50">50 MB - High quality</SelectItem>
                    <SelectItem value="100">100 MB - Maximum quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Guest Permissions</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="text-sm">Upload</Label>
                    <Switch
                      checked={formData.default_guest_permissions.upload}
                      onCheckedChange={(checked) => handleInputChange('default_guest_permissions.upload', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="text-sm">Download</Label>
                    <Switch
                      checked={formData.default_guest_permissions.download}
                      onCheckedChange={(checked) => handleInputChange('default_guest_permissions.download', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="text-sm">Comment</Label>
                    <Switch
                      checked={formData.default_guest_permissions.comment}
                      onCheckedChange={(checked) => handleInputChange('default_guest_permissions.comment', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="text-sm">Share</Label>
                    <Switch
                      checked={formData.default_guest_permissions.share}
                      onCheckedChange={(checked) => handleInputChange('default_guest_permissions.share', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Access Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Who can access this event?</Label>
                <Select value={formData.privacy.visibility} onValueChange={(value) => handleInputChange('privacy.visibility', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Private - Invited guests only</SelectItem>
                    <SelectItem value="unlisted">🔗 Unlisted - Anyone with link</SelectItem>
                    <SelectItem value="public">🌍 Public - Anyone can find</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Photo Approval</Label>
                <Select value={formData.privacy.content_controls.approval_mode} onValueChange={(value) => handleInputChange('privacy.content_controls.approval_mode', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">✨ Smart - Invited guests auto-approved</SelectItem>
                    <SelectItem value="manual">👀 Manual - Approve every photo</SelectItem>
                    <SelectItem value="ai_assisted">🤖 AI Assisted - Filter inappropriate content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Allow Anonymous Guests</Label>
                    <p className="text-xs text-muted-foreground">Guests don't need to sign in</p>
                  </div>
                  <Switch
                    checked={formData.privacy.guest_management.allow_anonymous}
                    onCheckedChange={(checked) => handleInputChange('privacy.guest_management.allow_anonymous', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Allow Downloads</Label>
                    <p className="text-xs text-muted-foreground">Guests can download photos</p>
                  </div>
                  <Switch
                    checked={formData.privacy.content_controls.allow_downloads}
                    onCheckedChange={(checked) => handleInputChange('privacy.content_controls.allow_downloads', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Allow Sharing</Label>
                    <p className="text-xs text-muted-foreground">Guests can share photos externally</p>
                  </div>
                  <Switch
                    checked={formData.privacy.content_controls.allow_sharing}
                    onCheckedChange={(checked) => handleInputChange('privacy.content_controls.allow_sharing', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="max_guests" className="text-sm font-medium">Maximum Guests</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    value={formData.privacy.guest_management.max_guests}
                    onChange={(e) => handleInputChange('privacy.guest_management.max_guests', parseInt(e.target.value) || 200)}
                    min="1"
                    max="1000"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Managers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invite other members who can access and manage this event
              </p>

              <div className="flex gap-2">
                <Input
                  value={newCoHost}
                  onChange={(e) => setNewCoHost(e.target.value)}
                  placeholder="Enter email address..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoHost())}
                />
                <Button type="button" onClick={addCoHost}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>

              {formData.co_hosts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Managers</Label>
                  <div className="space-y-2">
                    {formData.co_hosts.map(host => (
                      <div key={host} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{host}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCoHost(host)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.co_hosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No managers added yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manager Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Event managers can:</p>
                <ul className="space-y-1 ml-4">
                  <li>• View and manage all event photos</li>
                  <li>• Moderate and approve uploaded content</li>
                  <li>• Invite additional guests</li>
                  <li>• Update event settings</li>
                  <li>• Download event content</li>
                </ul>
                <p className="text-xs mt-3 p-3 bg-muted rounded-lg">
                  <strong>Note:</strong> Managers cannot delete the event or remove the event creator.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventSettingsPage;