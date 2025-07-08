'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MapPin,
  Users,
  Shield,
  Settings,
  Image,
  Tag,
  Plus,
  X,
  Clock,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { getEventById, updateEvent, deleteEvent } from '@/services/apis/events.api';
import { uploadCoverImage } from '@/services/apis/media.api';
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
  timezone: string;
  location: {
    name: string;
    address: string;
    coordinates: any[];
  };
  cover_image: {
    url: string;
    public_id: string;
    uploaded_by: string;
  };
  template: string;
  tags: string[];
  privacy: {
    visibility: string;
    discoverable: boolean;
    guest_management: {
      anyone_can_invite: boolean;
      require_approval: boolean;
      auto_approve_domains: string[];
      max_guests: number;
      allow_anonymous: boolean;
    };
    content_controls: {
      allow_downloads: boolean;
      allow_sharing: boolean;
      require_watermark: boolean;
      content_moderation: string;
    };
  };
  share_settings: {
    active_share_tokens: number;
    guest_count: number;
    has_password_protection: boolean;
    last_shared_at: string | null;
    restricted_to_guests: boolean;
  }
  default_guest_permissions: {
    view: boolean;
    upload: boolean;
    download: boolean;
    comment: boolean;
    share: boolean;
    create_albums: boolean;
  };
  co_hosts: string[];
};

const EditEventPage = () => {
  const params = useParams();
  const { eventId } = params;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: {
      name: '',
      address: '',
      coordinates: []
    },
    cover_image: {
      url: '',
      public_id: ''
    },
    template: 'custom',
    tags: [],
    privacy: {
      visibility: 'private',
      discoverable: false,
      guest_management: {
        anyone_can_invite: false,
        require_approval: true,
        auto_approve_domains: [],
        max_guests: 500,
        allow_anonymous: false
      },
      content_controls: {
        allow_downloads: true,
        allow_sharing: false,
        require_watermark: false,
        content_moderation: 'auto'
      }
    },
    default_guest_permissions: {
      view: true,
      upload: false,
      download: false,
      comment: true,
      share: false,
      create_albums: false
    },
    co_hosts: []
  });

  const [originalData, setOriginalData] = useState<EventFormData | null>(null);
  const [newTag, setNewTag] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newCoHost, setNewCoHost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      toast.error("You need to be logged in to edit an event");
      router.push('/events');
    }
  }, [router]);

  useEffect(() => {
    const loadEvent = async () => {
      if (!authToken) return;

      try {
        const eventData = await getEventById(eventId as string, authToken);
        if (!eventData) {
          toast.error("The event you're trying to edit doesn't exist.");
          router.push('/events');
          return;
        }
        console.log(eventData, 'eventDataeventData')

        // Convert event data to form format
        const convertedData: EventFormData = {
          title: eventData.title || '',
          description: eventData.description || '',
          start_date: eventData.start_date ? new Date(eventData.start_date).toISOString().slice(0, 16) : '',
          end_date: eventData.end_date ? new Date(eventData.end_date).toISOString().slice(0, 16) : '',
          timezone: eventData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: {
            name: eventData.location || '',
            address: eventData.location || '',
            coordinates: []
          },
          cover_image: {
            url: eventData?.cover_image || '',
            public_id: ''
          },
          template: eventData.template || 'custom',
          tags: eventData.tags || [],
          privacy: {
            visibility: eventData.privacy.visibility,
            discoverable: !eventData.privacy.discoverable,
            guest_management: {
              anyone_can_invite: eventData.privacy?.guest_management?.anyone_can_invite || false,
              require_approval: eventData.privacy?.guest_management?.require_approval !== false,
              auto_approve_domains: eventData.privacy?.guest_management?.auto_approve_domains || [],
              max_guests: eventData.privacy?.guest_management?.max_guests || 500,
              allow_anonymous: eventData.privacy?.guest_management?.allow_anonymous || false
            },
            content_controls: {
              allow_downloads: eventData.privacy?.content_controls?.allow_downloads !== false,
              allow_sharing: eventData.privacy?.content_controls?.allow_sharing || false,
              require_watermark: eventData.privacy?.content_controls?.require_watermark || false,
              content_moderation: eventData.privacy?.content_controls?.content_moderation || 'auto'
            }
          },
          default_guest_permissions: {
            view: true,
            upload: eventData.default_guest_permissions?.upload || false,
            download: eventData.default_guest_permissions?.download || false,
            comment: eventData.default_guest_permissions?.comment !== false,
            share: eventData.default_guest_permissions?.share || false,
            create_albums: eventData.default_guest_permissions?.create_albums || false
          },
          co_hosts: eventData.co_hosts || []
        };

        console.log(convertedData, 'convertedDataconvertedData')
        setFormData(convertedData);
        setOriginalData(convertedData);
        setPreviewUrl(eventData?.cover_image?.url || null);
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error("Failed to load event details. Please try again.");
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
    { value: 'wedding', label: 'Wedding', icon: '💒' },
    { value: 'birthday', label: 'Birthday', icon: '🎂' },
    { value: 'corporate', label: 'Corporate', icon: '🏢' },
    { value: 'graduation', label: 'Graduation', icon: '🎓' },
    { value: 'vacation', label: 'Vacation', icon: '🏖️' },
    { value: 'party', label: 'Party', icon: '🎉' },
    { value: 'custom', label: 'Custom', icon: '⚙️' }
  ];

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addDomain = () => {
    if (newDomain.trim() && !formData.privacy.guest_management.auto_approve_domains.includes(newDomain.trim())) {
      setFormData(prev => ({
        ...prev,
        privacy: {
          ...prev.privacy,
          guest_management: {
            ...prev.privacy.guest_management,
            auto_approve_domains: [...prev.privacy.guest_management.auto_approve_domains, newDomain.trim()]
          }
        }
      }));
      setNewDomain('');
    }
  };

  const removeDomain = (domainToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        guest_management: {
          ...prev.privacy.guest_management,
          auto_approve_domains: prev.privacy.guest_management.auto_approve_domains.filter(domain => domain !== domainToRemove)
        }
      }
    }));
  };

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
    if (field.includes('.')) {
      const [parent, child, grandchild] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof EventFormData],
          [child]: grandchild ? {
            ...prev[parent as keyof EventFormData][child],
            [grandchild]: value
          } : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
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

  const validateForm = () => {
    const errors = [];

    if (!formData.title.trim()) errors.push('Event title is required');
    if (formData.title.length > 100) errors.push('Title must be less than 100 characters');
    if (formData.description.length > 1000) errors.push('Description must be less than 1000 characters');

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (formData.start_date && isNaN(startDate.getTime())) errors.push('Invalid start date');
    if (formData.end_date && isNaN(endDate.getTime())) errors.push('Invalid end date');
    if (formData.start_date && formData.end_date && startDate >= endDate) {
      errors.push('End date must be after start date');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error("Validation Error", {
        description: errors.join(', ')
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let finalCoverImageUrl = formData.cover_image.url;

      // Upload new cover image if one was selected
      if (coverImageFile) {
        finalCoverImageUrl = await uploadCoverImage(
          coverImageFile,
          'event_covers/' + eventId,
          authToken!
        );
      }

      // Prepare the data for submission
      const submitData = {
        ...formData,
      };

      console.log('Updating event with data:', formData);

      const updatedEvent = await updateEvent(eventId as string, submitData, authToken!);

      toast.success("Event updated successfully!");
      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error("Failed to update event. Please try again.");
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
      toast.error("Failed to delete event. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Skeleton className="h-8 w-40 mr-4" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  console.log(formData, 'formDataformDataformData');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/events/${eventId}`)}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Event</h1>
            <p className="text-gray-600 text-sm">Update your event details and settings</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{formData.title}" and all associated photos and albums. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteEvent}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            disabled={!hasChanges || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center text-amber-800">
          <Info className="h-5 w-5 mr-3 flex-shrink-0" />
          <p className="text-sm">You have unsaved changes. Don't forget to save before leaving this page.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="media">Media & Tags</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Event Details
                  </CardTitle>
                  <CardDescription>
                    Basic information about your event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Name *</Label>
                    <Input
                      id="title"
                      placeholder="Enter event name"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500">{formData.title.length}/100 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your event"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500">{formData.description.length}/1000 characters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date & Time</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date & Time</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template">Event Template</Label>
                      <Select value={formData.template} onValueChange={(value) => handleInputChange('template', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTemplates.map(template => (
                            <SelectItem key={template.value} value={template.value}>
                              <span className="flex items-center gap-2">
                                <span>{template.icon}</span>
                                {template.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Timezone
                      </Label>
                      <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      placeholder="Where is this event taking place?"
                      value={formData.location.name}
                      onChange={(e) => handleInputChange('location.name', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Cover Image
                  </CardTitle>
                  <CardDescription>
                    Upload a photo to represent your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {previewUrl ? (
                      <div className="relative h-48 w-full mb-2">
                        <img
                          src={previewUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full"
                          onClick={removeCoverImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg">
                        <Image size={48} className="text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload a cover image</p>
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
                      className="mt-2"
                    >
                      {previewUrl ? 'Change Image' : 'Select Image'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </CardTitle>
                  <CardDescription>
                    Add tags to help categorize your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control who can view and access your event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Event Visibility</Label>
                    <Select value={formData.privacy.visibility} onValueChange={(value) => handleInputChange('privacy.visibility', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">🌍 Public - Anyone can find and view</SelectItem>
                        <SelectItem value="unlisted">🔗 Unlisted - Only with link</SelectItem>
                        <SelectItem value="private">🔒 Private - Invited guests only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Make Discoverable</Label>
                    <Switch
                      checked={formData.privacy.discoverable}
                      onCheckedChange={(checked) => handleInputChange('privacy.discoverable', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Require Guest Approval</Label>
                    <Switch
                      checked={formData.privacy.guest_management.require_approval}
                      onCheckedChange={(checked) => handleInputChange('privacy.guest_management.require_approval', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Allow Anonymous Guests</Label>
                    <Switch
                      checked={formData.privacy.guest_management.allow_anonymous}
                      onCheckedChange={(checked) => handleInputChange('privacy.guest_management.allow_anonymous', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Anyone Can Invite</Label>
                    <Switch
                      checked={formData.privacy.guest_management.anyone_can_invite}
                      onCheckedChange={(checked) => handleInputChange('privacy.guest_management.anyone_can_invite', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_guests">Maximum Guests</Label>
                    <Input
                      id="max_guests"
                      type="number"
                      value={formData.privacy.guest_management.max_guests}
                      onChange={(e) => handleInputChange('privacy.guest_management.max_guests', parseInt(e.target.value))}
                      min="1"
                      max="10000"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Controls</CardTitle>
                  <CardDescription>
                    Manage how content is shared and moderated
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Allow Downloads</Label>
                    <Switch
                      checked={formData.privacy.content_controls.allow_downloads}
                      onCheckedChange={(checked) => handleInputChange('privacy.content_controls.allow_downloads', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Allow Sharing</Label>
                    <Switch
                      checked={formData.privacy.content_controls.allow_sharing}
                      onCheckedChange={(checked) => handleInputChange('privacy.content_controls.allow_sharing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Require Watermark</Label>
                    <Switch
                      checked={formData.privacy.content_controls.require_watermark}
                      onCheckedChange={(checked) => handleInputChange('privacy.content_controls.require_watermark', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content Moderation</Label>
                    <Select value={formData.privacy.content_controls.content_moderation} onValueChange={(value) => handleInputChange('privacy.content_controls.content_moderation', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off - No moderation</SelectItem>
                        <SelectItem value="manual">Manual - Host approval required</SelectItem>
                        <SelectItem value="auto">Auto - AI + Manual moderation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Auto-Approve Email Domains</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="company.com"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                      />
                      <Button type="button" onClick={addDomain} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.privacy.guest_management.auto_approve_domains.map(domain => (
                        <Badge key={domain} variant="outline" className="flex items-center gap-1">
                          {domain}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeDomain(domain)} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Guest Permissions
                  </CardTitle>
                  <CardDescription>
                    Set default permissions for new guests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(formData.default_guest_permissions).map(([permission, enabled]) => (
                      <div key={permission} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="text-sm font-medium capitalize">
                          {permission.replace('_', ' ')}
                        </Label>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handleInputChange(`default_guest_permissions.${permission}`, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Co-hosts
                  </CardTitle>
                  <CardDescription>
                    Add users who can help manage this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newCoHost}
                      onChange={(e) => setNewCoHost(e.target.value)}
                      placeholder="Enter email or user ID..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoHost())}
                    />
                    <Button type="button" onClick={addCoHost} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.co_hosts.map(host => (
                      <Badge key={host} variant="secondary" className="flex items-center gap-1">
                        {host}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeCoHost(host)} />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Event Preview</CardTitle>
              <CardDescription>
                See how your event will appear to guests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border bg-card">
                <div className="relative h-32 w-full bg-gray-100">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {formData.template === 'wedding' && <span className="text-4xl">💍</span>}
                      {formData.template === 'birthday' && <span className="text-4xl">🎂</span>}
                      {formData.template === 'corporate' && <span className="text-4xl">🏢</span>}
                      {formData.template === 'graduation' && <span className="text-4xl">🎓</span>}
                      {formData.template === 'vacation' && <span className="text-4xl">🏖️</span>}
                      {formData.template === 'party' && <span className="text-4xl">🎉</span>}
                      {formData.template === 'custom' && <span className="text-4xl">📸</span>}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg line-clamp-1">{formData.title || 'Event Name'}</h3>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.start_date && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(formData.start_date).toLocaleDateString()}
                      </div>
                    )}

                    {formData.location.name && (
                      <div className="flex items-center text-xs text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {formData.location.name}
                      </div>
                    )}
                  </div>

                  {formData.description && (
                    <p className="text-sm text-gray-700 mt-3 line-clamp-2">{formData.description}</p>
                  )}

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {formData.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {formData.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{formData.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <h4 className="text-sm font-medium">Settings Summary:</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Privacy:</span>
                    <span className="capitalize">{formData.privacy.visibility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downloads:</span>
                    <span>{formData.privacy.content_controls.allow_downloads ? 'Allowed' : 'Restricted'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Guests:</span>
                    <span>{formData.privacy.guest_management.max_guests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Co-hosts:</span>
                    <span>{formData.co_hosts.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditEventPage;