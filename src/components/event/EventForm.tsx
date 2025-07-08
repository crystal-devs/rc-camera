// components/events/EventForm.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, MapPinIcon, ImageIcon, LockIcon, PlusIcon, XIcon, UserIcon } from 'lucide-react';
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
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuestInput } from '@/components/event/GuestInput';

import { Event, EventTemplate } from '@/types/events';
import { EventAccessLevel } from '@/types/sharing';
import { createEvent, updateEvent, addGuests } from '@/services/apis/events.api';
import { useAuthToken } from '@/hooks/use-auth';
import { useSubscriptionLimits } from '@/hooks/use-subscription-limits';
import { useStore } from '@/lib/store';

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
  const { canCreateEvent, navigateToUpgrade } = useSubscriptionLimits();

  // Form state
  const [formState, setFormState] = useState({
    title: event?.name || '',
    description: event?.description || '',
    startDate: event?.date || new Date(),
    endDate: event?.endDate || undefined,
    location: event?.location || '',
    accessLevel: event?.access?.level === 'invited_only' ? 'invited_only' : event?.is_private ? 'link_only' : 'public',
    guestList: event?.invitedGuests || [], // Store guests as array for better management
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

  const { fetchUsage } = useStore();
  
  const validateForm = () => {
    if (!formState.title.trim()) {
      toast.error('Event title is required');
      return false;
    }
    
    // For invited-only events, we must have at least one guest
    if (formState.accessLevel === 'invited_only' && formState.guestList.length === 0) {
      toast.error('At least one invited guest is required for invited-only events');
      return false;
    }
    
    return true;
  };
  
  // Handle bulk guest import from a text area
  const handleBulkGuestImport = (guestList: string) => {
    if (!guestList.trim()) return;
    
    const emails = guestList
      .split(/[,;\n\s]+/) // Split by commas, semicolons, newlines, or spaces
      .map(email => email.trim().toLowerCase())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)); // Filter valid emails
    
    // Filter out duplicates
    const uniqueEmails = [...new Set([...formState.guestList, ...emails])];
    
    if (uniqueEmails.length > formState.guestList.length) {
      handleChange('guestList', uniqueEmails);
      toast.success(`Added ${uniqueEmails.length - formState.guestList.length} new guests`);
    } else if (emails.length > 0) {
      toast.info('All these guests were already added');
    } else {
      toast.error('No valid email addresses found');
    }
  };
  
  // Add a ref to track if we've already checked subscription limits
  const [limitChecked, setLimitChecked] = useState(false);
  const [canCreateNewEvent, setCanCreateNewEvent] = useState(true);
  
  // Check subscription limits when component mounts, but only once
  useEffect(() => {
    // Skip for edit mode, only check for new events
    if (isEditMode || limitChecked) return;
    
    const checkEventLimit = async () => {
      // Use cached result if available, but don't force a refresh
      const canCreate = await canCreateEvent(false, false);
      setCanCreateNewEvent(canCreate);
      setLimitChecked(true);
    };
    
    checkEventLimit();
  }, [isEditMode, canCreateEvent, limitChecked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form fields
    if (!validateForm()) {
      return;
    }
    
    // For new events, use the pre-checked subscription limit result
    if (!isEditMode && !canCreateNewEvent) {
      // We already showed the error message in the useEffect
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
          template: formState.template,
          cover_image: formState.thumbnailPic || undefined,
          // New access model
          is_private: formState.accessLevel !== 'public',
          share_settings: {
            restricted_to_guests: formState.accessLevel === 'invited_only',
            has_password_protection: false
          }
        };
        
        await updateEvent(event.id, updatePayload, authToken || '');
        
        // If it's a private event with invited guests, update the guest list
        if (formState.accessLevel === 'invited_only') {
          try {
            if (formState.guestList.length > 0) {
              await addGuests(event.id, formState.guestList, authToken || '');
              toast.success(`Successfully updated guest list with ${formState.guestList.length} guests`);
            } else {
              // This is an invited-only event but no guests are added
              toast.warning('No guests were added to this invited-only event. Please add guests or change access level.');
            }
          } catch (error) {
            console.error('Error updating guest list:', error);
            toast.error('Failed to update guest list, but event was updated');
          }
        }
        
        // Ensure usage is refreshed after update
        fetchUsage();
        
        router.push(`/events/${event.id}`);
      } else {
        // Create new event
        const createPayload = {
          name: formState.title,
          description: formState.description,
          date: formState.startDate,
          endDate: formState.endDate,
          location: formState.location,
          template: formState.template,
          cover_image: formState.thumbnailPic,
          // New access model
          is_private: formState.accessLevel !== 'public',
          share_settings: {
            restricted_to_guests: formState.accessLevel === 'invited_only',
            has_password_protection: false
          }
        };
        
        const newEvent = await createEvent(createPayload, authToken || '');
        
        // If it's a private event with invited guests, update the guest list
        if (formState.accessLevel === 'invited_only') {
          try {
            if (formState.guestList.length > 0) {
              await addGuests(newEvent.id, formState.guestList, authToken || '');
              toast.success(`Successfully added ${formState.guestList.length} guests to the event`);
            } else {
              // This is an invited-only event but no guests are added
              toast.warning('No guests were added to this invited-only event. Please add guests or change access level.');
            }
          } catch (error) {
            console.error('Error adding guests:', error);
            toast.error('Failed to add guests, but event was created');
          }
        }
        
        // Ensure usage is refreshed after creation
        fetchUsage();
        
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
            value={formState.accessLevel}
            onValueChange={(value) => {
              // If changing from invited-only to another access level but we have guests
              if (formState.accessLevel === 'invited_only' && value !== 'invited_only' && formState.guestList.length > 0) {
                if (confirm(`You have ${formState.guestList.length} guests in your invite list. Changing the access level will not remove them, but they will no longer be required for access. Continue?`)) {
                  handleChange('accessLevel', value);
                }
              } else {
                handleChange('accessLevel', value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public (Anyone can view)</SelectItem>
              <SelectItem value="link_only">Link Only (Anyone with link)</SelectItem>
              <SelectItem value="invited_only">Invited Only (Only specified guests)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {formState.accessLevel === 'invited_only' ? 
              "Only invited guests can view this event" : 
              formState.accessLevel === 'link_only' ?
              "Anyone with the link can view this event" :
              "Anyone can view this event without restrictions"}
          </p>
        </div>

        {formState.accessLevel === 'invited_only' && (
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="invitedGuests" className="text-md font-medium">Invited Guests</Label>
              <Badge variant="outline" className="font-normal">
                {formState.guestList.length} {formState.guestList.length === 1 ? 'guest' : 'guests'}
              </Badge>
            </div>
            <div className="mt-2">
              <GuestInput 
                guestList={formState.guestList}
                onChange={(guests) => handleChange('guestList', guests)}
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-md mt-3 text-sm text-blue-800">
              <p className="font-medium">About Invited Guests</p>
              <ul className="list-disc pl-5 mt-1 text-xs space-y-1">
                <li>Only these people will be able to view and participate in this event</li>
                <li>Each guest will receive a personalized access link</li>
                <li>Guests must use the exact email you entered to access the event</li>
                <li>You can add or remove guests at any time</li>
              </ul>
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