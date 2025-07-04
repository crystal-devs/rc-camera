// components/events/EventForm.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, MapPinIcon, ImageIcon, LockIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

import { Event, EventTemplate } from '@/types/events';
import { EventAccessLevel } from '@/types/sharing';
import { createEvent, updateEvent } from '@/services/apis/events.api';
import { useAuthToken } from '@/hooks/use-auth';

// Event template options
const eventTemplates = [
  { value: 'custom', label: 'Custom Event' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday Party' },
  { value: 'concert', label: 'Concert' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'vacation', label: 'Vacation' }
];

interface EventFormProps {
  event?: Event; // Undefined for new event, defined for edit
}

export const EventForm = ({ event }: EventFormProps) => {
  const router = useRouter();
  const authToken = useAuthToken();
  const isEditMode = Boolean(event);

  // Form state
  const [formState, setFormState] = useState({
    title: event?.name || '',
    description: event?.description || '',
    startDate: event?.date || new Date(),
    endDate: event?.endDate || undefined,
    location: event?.location || '',
    isPrivate: event?.accessType === 'restricted',
    accessCode: event?.accessCode || '',
    template: event?.template || 'custom' as EventTemplate,
    thumbnailPic: event?.cover_image || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form handlers
  const handleChange = (field: string, value: any) => {
    setFormState({
      ...formState,
      [field]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditMode && event) {
        // Update existing event
        const updatePayload = {
          name: formState.title,
          description: formState.description || undefined,
          date: formState.startDate,
          endDate: formState.endDate,
          location: formState.location || undefined,
          accessType: formState.isPrivate ? 'restricted' as const : 'public' as const,
          accessCode: formState.isPrivate ? formState.accessCode : undefined,
          template: formState.template,
          cover_image: formState.thumbnailPic || undefined,
          // New access model
          access: {
            level: formState.isPrivate ? EventAccessLevel.RESTRICTED : EventAccessLevel.PUBLIC,
            allowGuestUploads: false,
            requireApproval: false
          }
        };
        
        await updateEvent(event.id, updatePayload, authToken || '');
        router.push(`/events/${event.id}`);
      } else {
        // Create new event
        const createPayload = {
          name: formState.title,
          description: formState.description,
          date: formState.startDate,
          endDate: formState.endDate,
          location: formState.location,
          accessType: formState.isPrivate ? 'restricted' as const : 'public' as const,
          accessCode: formState.isPrivate ? formState.accessCode : undefined,
          template: formState.template,
          cover_image: formState.thumbnailPic,
          // New access model
          access: {
            level: formState.isPrivate ? EventAccessLevel.RESTRICTED : EventAccessLevel.PUBLIC,
            allowGuestUploads: false,
            requireApproval: false
          }
        };
        
        const newEvent = await createEvent(createPayload, authToken || '');
        router.push(`/events/${newEvent.id}`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && event) {
      router.push(`/events/${event.id}`);
    } else {
      router.push('/events');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Event Title *</Label>
        <Input
          id="title"
          value={formState.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter event title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formState.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe your event"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formState.startDate ? format(formState.startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formState.startDate}
                onSelect={(date) => handleChange('startDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formState.endDate ? format(formState.endDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formState.endDate}
                onSelect={(date) => handleChange('endDate', date)}
                initialFocus
                disabled={(date) => date < formState.startDate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <div className="relative">
          <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="location"
            value={formState.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Event location"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Event Type</Label>
        <Select
          value={formState.template}
          onValueChange={(value) => handleChange('template', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {eventTemplates.map((template) => (
              <SelectItem key={template.value} value={template.value}>
                {template.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnailUrl">Cover Image URL</Label>
        <div className="relative">
          <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="thumbnailUrl"
            value={formState.thumbnailPic}
            onChange={(e) => handleChange('thumbnailPic', e.target.value)}
            placeholder="URL for event cover image"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="accessLevel">Access Level</Label>
          <Select
            value={formState.isPrivate ? "restricted" : "public"}
            onValueChange={(value) => {
              handleChange('isPrivate', value === "restricted");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public (Anyone can view)</SelectItem>
              <SelectItem value="link_only">Link Only (Anyone with link)</SelectItem>
              <SelectItem value="restricted">Restricted (Requires access code)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {formState.isPrivate ? 
              "Only people with the access code can view this event" : 
              "Anyone can view this event without restrictions"}
          </p>
        </div>

        {formState.isPrivate && (
          <div className="pt-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <div className="relative mt-1">
              <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="accessCode"
                value={formState.accessCode}
                onChange={(e) => handleChange('accessCode', e.target.value)}
                placeholder="Create an access code"
                className="pl-10"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <span>{isEditMode ? 'Update Event' : 'Create Event'}</span>
          )}
        </Button>
      </div>
    </form>
  );
};