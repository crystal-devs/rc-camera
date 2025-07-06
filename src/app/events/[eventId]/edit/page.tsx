'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { useStore } from '@/lib/store';
import {
  CalendarIcon,
  MapPinIcon,
  ImageIcon,
  ArrowLeftIcon,
  SaveIcon,
  TrashIcon,
  InfoIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from "sonner";

// Import API services
import { getEventById, updateEvent, deleteEvent } from '@/services/apis/events.api';
import { Event } from '@/types/events';
import { uploadCoverImage } from '@/services/apis/media.api';

interface PageProps {
  eventId: string;
}

export default function EditEventPage({ params }: { params: PageProps }) {
  const { eventId } = params;
  const router = useRouter();
  const { fetchUsage } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalEvent, setOriginalEvent] = useState<Event | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('restricted');
  const [accessCode, setAccessCode] = useState('');
  const [template, setTemplate] = useState('custom');

  // Cover image state - consistent naming
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Get auth token on page load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      // Redirect to events page if no token
      toast.error("You need to be logged in to edit an event");
      router.push('/events');
    }
  }, [router]);

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!authToken) return;

      try {
        const eventData = await getEventById(eventId, authToken);
        if (!eventData) {
          toast.error("The event you're trying to edit doesn't exist.");
          router.push('/events');
          return;
        }

        setOriginalEvent(eventData);

        // Initialize form with event data
        setName(eventData.name);
        setDescription(eventData.description || '');
        setDate(new Date(eventData.date));
        setEndDate(eventData.endDate ? new Date(eventData.endDate) : undefined);
        setLocation(eventData.location || '');
        setAccessType(eventData.accessType);
        setCoverImageUrl(eventData.cover_image || '');
        setPreviewUrl(eventData.cover_image || null);
        setAccessCode(eventData.accessCode || '');
        setTemplate(eventData.template || 'custom');
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
    if (!originalEvent) return;

    const hasChanges =
      name !== originalEvent.name ||
      description !== (originalEvent.description || '') ||
      date.getTime() !== new Date(originalEvent.date).getTime() ||
      (endDate?.getTime() !== (originalEvent.endDate ? new Date(originalEvent.endDate).getTime() : undefined)) ||
      location !== (originalEvent.location || '') ||
      accessType !== originalEvent.accessType ||
      coverImageFile !== null || // Changed if there's a new file selected
      accessCode !== (originalEvent.accessCode || '') ||
      template !== (originalEvent.template || 'custom');

    setHasChanges(hasChanges);
  }, [
    originalEvent,
    name,
    description,
    date,
    endDate,
    location,
    accessType,
    coverImageFile,
    accessCode,
    template
  ]);

  // Handle cover image selection
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setCoverImageFile(null);
      // Don't reset preview URL to keep showing the existing image
      return;
    }

    // Get the actual File object
    const selectedFile = e.target.files[0];

    // Store the File object
    setCoverImageFile(selectedFile);

    // Create a local preview URL
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Log for debugging
    console.log('Selected file:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      lastModified: selectedFile.lastModified
    });
  };

  // Remove cover image
  const removeCoverImage = () => {
    setCoverImageFile(null);
    setPreviewUrl(null);
    setCoverImageUrl('');
  };

  // Regenerate access code
  const regenerateAccessCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setAccessCode(newCode);
  };

  // Save changes
  const saveChanges = async () => {
    if (!originalEvent || !hasChanges || !authToken) return;

    setIsSaving(true);

    try {
      let finalCoverImageUrl = coverImageUrl; // Start with existing URL

      // Only upload a new image if one was selected
      if (coverImageFile) {
        // Upload the new cover image
        finalCoverImageUrl = await uploadCoverImage(
          coverImageFile,
          'event_covers/' + eventId, // folder path
          authToken
        );
      }

      const updatedEventData: Partial<Event> = {
        name: name.trim(),
        description: description.trim(),
        date,
        endDate,
        location: location.trim(),
        accessType,
        cover_image: finalCoverImageUrl,
        accessCode,
        template: template as any,
      };

      // Call API to update the event
      const updatedEvent = await updateEvent(eventId, updatedEventData, authToken);

      // Update original state to reflect current state
      setOriginalEvent(updatedEvent);
      setCoverImageUrl(updatedEvent.cover_image || '');
      setCoverImageFile(null); // Reset the file input state

      toast.success("Your event has been updated successfully.");
      router.push(`/events/${eventId}`);

      // Reset has changes flag
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error("Failed to update event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    if (!authToken) return;

    try {
      // Call API to delete the event
      await deleteEvent(eventId, authToken);

      // Refresh usage data
      fetchUsage();

      toast.success("The event has been permanently removed.");

      // Redirect to events list
      router.push('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error("Failed to delete event. Please try again.");
    }
  };

  // Template options
  const templateOptions = [
    { id: 'custom', name: 'Custom Event', icon: '🎪', description: 'No specific theme' },
    { id: 'wedding', name: 'Wedding', icon: '💍', description: 'Wedding celebration' },
    { id: 'birthday', name: 'Birthday', icon: '🎂', description: 'Birthday party' },
    { id: 'concert', name: 'Concert', icon: '🎵', description: 'Music event' },
    { id: 'corporate', name: 'Corporate', icon: '👔', description: 'Business event' },
    { id: 'vacation', name: 'Vacation', icon: '🏖️', description: 'Travel photos' },
  ];

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/events/${eventId}`)}
            className="mr-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Event</h1>
        </div>

        <div className="flex space-x-3">
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{originalEvent?.name}" and all associated photos and albums. This action cannot be undone.
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
            disabled={!hasChanges || isSaving}
            onClick={saveChanges}
          >
            {isSaving ? 'Saving...' : (
              <>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center text-amber-800">
          <InfoIcon className="h-5 w-5 mr-3 flex-shrink-0" />
          <p className="text-sm">You have unsaved changes. Don't forget to save before leaving this page.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
              <TabsTrigger value="access" className="flex-1">Access & Sharing</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                  <CardDescription>
                    Edit the basic information about your event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Event Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter event name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your event"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Event Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(date) => date && setDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date (Optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="endDate"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'PPP') : 'Select end date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => setEndDate(date)}
                            initialFocus
                            disabled={(date) => date < new Date(date.getTime())}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <div className="flex">
                      <MapPinIcon className="h-4 w-4 mt-3 mr-2 text-gray-400" />
                      <Input
                        id="location"
                        placeholder="Where is this event taking place?"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Template</CardTitle>
                  <CardDescription>
                    Choose a template for your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {templateOptions.map((option) => (
                      <div
                        key={option.id}
                        onClick={() => setTemplate(option.id)}
                        className={`cursor-pointer border rounded-lg p-3 transition-all ${template === option.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="text-2xl mb-1">{option.icon}</div>
                        <h4 className="font-medium text-sm">{option.name}</h4>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cover Image</CardTitle>
                  <CardDescription>
                    Upload a photo to represent your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {previewUrl ? (
                      <div className="relative h-48 w-full mb-2">
                        <Image
                          src={previewUrl}
                          alt="Cover preview"
                          fill
                          className="object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full"
                          onClick={removeCoverImage}
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg">
                        <ImageIcon size={48} className="text-gray-300 mb-2" />
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
            </TabsContent>

            <TabsContent value="access" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Access Settings</CardTitle>
                  <CardDescription>
                    Control who can view and upload photos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessType">Who can upload photos?</Label>
                    <Select
                      value={accessType}
                      onValueChange={(value: 'public' | 'restricted') => setAccessType(value)}
                    >
                      <SelectTrigger className="w-full" id="accessType">
                        <SelectValue placeholder="Select access type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                            <div>
                              <p className="font-medium">Anyone with the link</p>
                              <p className="text-xs text-gray-500">All guests can upload photos without restrictions</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="restricted">
                          <div className="flex items-center">
                            <AlertCircleIcon className="h-4 w-4 mr-2 text-amber-500" />
                            <div>
                              <p className="font-medium">Only invited people</p>
                              <p className="text-xs text-gray-500">Guests need an invitation to upload photos</p>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessCode">
                      Access Code
                      <span className="ml-2 text-xs text-gray-500">(Guests will need this code to join)</span>
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="accessCode"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                        maxLength={8}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={regenerateAccessCode}
                      >
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="download">
                      <AccordionTrigger>Download Settings</AccordionTrigger>
                      <AccordionContent>
                        <div className="py-2">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              id="allowDownload"
                              className="mt-1"
                              checked={true}
                              onChange={() => { }}
                            />
                            <div>
                              <Label htmlFor="allowDownload" className="font-medium">
                                Allow guests to download photos
                              </Label>
                              <p className="text-sm text-gray-500">
                                When enabled, guests can download individual photos or the entire album
                              </p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="moderation">
                      <AccordionTrigger>Content Moderation</AccordionTrigger>
                      <AccordionContent>
                        <div className="py-2">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              id="requireApproval"
                              className="mt-1"
                              checked={false}
                              onChange={() => { }}
                            />
                            <div>
                              <Label htmlFor="requireApproval" className="font-medium">
                                Require approval for uploaded photos
                              </Label>
                              <p className="text-sm text-gray-500">
                                Photos uploaded by guests will need your approval before being visible to others
                              </p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <Card>
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
                    <Image
                      src={previewUrl}
                      alt="Cover preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {template === 'wedding' && <span className="text-4xl">💍</span>}
                      {template === 'birthday' && <span className="text-4xl">🎂</span>}
                      {template === 'concert' && <span className="text-4xl">🎵</span>}
                      {template === 'corporate' && <span className="text-4xl">👔</span>}
                      {template === 'vacation' && <span className="text-4xl">🏖️</span>}
                      {template === 'custom' && <span className="text-4xl">📸</span>}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg line-clamp-1">{name || 'Event Name'}</h3>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {date ? format(date, 'MMM d, yyyy') : 'Event Date'}
                    </div>

                    {location && (
                      <div className="flex items-center text-xs text-gray-600">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {location}
                      </div>
                    )}
                  </div>

                  {description && (
                    <p className="text-sm text-gray-700 mt-3 line-clamp-2">{description}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Access Information:</h4>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium">Access Type:</div>
                  <div className="text-xs">
                    {accessType === 'public' ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Public
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center">
                        <AlertCircleIcon className="h-3 w-3 mr-1" />
                        Restricted
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs font-medium">Access Code:</div>
                  <div className="text-xs font-mono">{accessCode || 'None'}</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                View Live Event
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}