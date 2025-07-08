'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Users, Shield, Settings, Image, Tag, Plus, X, Clock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { createEvent } from '@/services/apis/events.api';
import { useRouter } from 'next/navigation';

type EventFormData = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  timezone: string;
  location: {
    name: string;
    address: string;
    coordinates: any[]; // You can replace 'any' with a more specific type if needed
  };
  cover_image: {
    url: string;
    public_id: string;
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

const EventCreateForm = () => {
  const router = useRouter();

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

  const [newTag, setNewTag] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newCoHost, setNewCoHost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      // Redirect to events page if no token
      toast.error("You need to be logged in to create an event");
      router.push('/events');
    }
  }, [router]);

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

  const removeTag = (tagToRemove) => {
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

  const removeDomain = (domainToRemove) => {
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

  const removeCoHost = (hostToRemove) => {
    setFormData(prev => ({
      ...prev,
      co_hosts: prev.co_hosts.filter(host => host !== hostToRemove)
    }));
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child, grandchild] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild ? {
            ...prev[parent][child],
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast("Validation Error", {
        description: errors.join(', '),
        // variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the data for submission
      const submitData = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };

      console.log(submitData, 'submitDatasubmitData');
      const createdEvent = await createEvent(submitData, authToken);

      router.push(`/events/${createdEvent.id}`);

      toast("Success!", {
        description: "Event created successfully",
      });
    } catch (error) {
      toast("Error", {
        description: error.message || "Failed to create event",
        // variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Event
          </h1>
          <p className="text-gray-600 mt-2">Set up your photo gallery event with advanced settings</p>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="shadow-lg border-0 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription className="text-blue-100">
                Essential details about your event
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Amazing Wedding Reception"
                    className="mt-1"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
                </div>

                <div>
                  <Label htmlFor="template" className="text-sm font-medium">Event Template</Label>
                  <Select value={formData.template} onValueChange={(value) => handleInputChange('template', value)}>
                    <SelectTrigger className="mt-1">
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
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your event..."
                  className="mt-1 min-h-20"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start_date" className="text-sm font-medium">Start Date & Time</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="end_date" className="text-sm font-medium">End Date & Time</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="timezone" className="text-sm font-medium">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Timezone
                  </Label>
                  <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                    <SelectTrigger className="mt-1">
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
            </CardContent>
          </Card>

          {/* Location & Media */}
          <Card className="shadow-lg border-0  backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location & Media
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location_name" className="text-sm font-medium">Location Name</Label>
                  <Input
                    id="location_name"
                    value={formData.location.name}
                    onChange={(e) => handleInputChange('location.name', e.target.value)}
                    placeholder="Central Park"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="location_address" className="text-sm font-medium">Address</Label>
                  <Input
                    id="location_address"
                    value={formData.location.address}
                    onChange={(e) => handleInputChange('location.address', e.target.value)}
                    placeholder="New York, NY 10024"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cover_image" className="text-sm font-medium">
                  <Image className="h-4 w-4 inline mr-1" />
                  Cover Image URL
                </Label>
                <Input
                  id="cover_image"
                  value={formData.cover_image.url}
                  onChange={(e) => handleInputChange('cover_image.url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  <Tag className="h-4 w-4 inline mr-1" />
                  Tags
                </Label>
                <div className="flex gap-2 mt-1">
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Access Control */}
          <Card className="shadow-lg border-0 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Event Visibility
                  </Label>
                  <Select value={formData.privacy.visibility} onValueChange={(value) => handleInputChange('privacy.visibility', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">🌍 Public - Anyone can find and view</SelectItem>
                      <SelectItem value="unlisted">🔗 Unlisted - Only with link</SelectItem>
                      <SelectItem value="private">🔒 Private - Invited guests only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Content Moderation</Label>
                  <Select value={formData.privacy.content_controls.content_moderation} onValueChange={(value) => handleInputChange('privacy.content_controls.content_moderation', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off - No moderation</SelectItem>
                      <SelectItem value="manual">Manual - Host approval required</SelectItem>
                      <SelectItem value="auto">Auto - AI + Manual moderation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
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
                </div>

                <div className="space-y-3">
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

                  <div>
                    <Label htmlFor="max_guests" className="text-sm font-medium">Max Guests</Label>
                    <Input
                      id="max_guests"
                      type="number"
                      value={formData.privacy.guest_management.max_guests}
                      onChange={(e) => handleInputChange('privacy.guest_management.max_guests', parseInt(e.target.value))}
                      className="mt-1"
                      min="1"
                      max="10000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Auto-Approve Email Domains</Label>
                <div className="flex gap-2 mt-1">
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
                <div className="flex flex-wrap gap-2 mt-2">
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

          {/* Guest Permissions */}
          <Card className="shadow-lg border-0 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Default Guest Permissions
              </CardTitle>
              <CardDescription className="text-orange-100">
                Set default permissions for new guests
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
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

          {/* Co-hosts */}
          <Card className="shadow-lg border-0 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Co-hosts
              </CardTitle>
              <CardDescription className="text-indigo-100">
                Add users who can help manage this event
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
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

          <div className="flex justify-center pt-6">
            <Button
              onClick={handleSubmit}
              size="lg"
              disabled={isSubmitting}
              className="px-12 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transform transition hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Event...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCreateForm;