'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { CalendarIcon, MapPinIcon, ImageIcon } from 'lucide-react';

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from "sonner";

// Import API client for event creation
import { createEvent } from '@/services/apis/events.api';
import { Event } from '@/types/events';
import { uploadCoverImage } from '@/services/apis/media.api';

import { useSubscriptionLimits } from '@/hooks/use-subscription-limits';
import { useStore } from '@/lib/store';

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { canCreateEvent, navigateToUpgrade } = useSubscriptionLimits();
  const { fetchUsage } = useStore();
  
  // Check if the user can create an event when the page loads
  // Use a ref to track if we've already redirected to avoid duplicate redirects
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // Avoid unnecessary checks if we've already redirected
    if (hasRedirectedRef.current) return;
    
    const checkEventLimit = async () => {
      setIsLoading(true);
      
      try {
        // Check if user can create an event (use cache if available, force refresh if not)
        // We'll pass true for forceFetchUsage ONLY if this is the first page load
        // This prevents multiple API calls when the component re-renders
        console.log('Create event page: Checking event creation limit...');
        const canCreate = await canCreateEvent(true, false); // Force refresh but don't bypass cache
        
        if (!canCreate) {
          // User has reached their event limit - mark that we're redirecting
          console.log('Create event page: User has reached event limit, redirecting to upgrade');
          hasRedirectedRef.current = true;
          
          // Add a small delay before redirecting to ensure the UI updates
          setTimeout(() => {
            navigateToUpgrade();
          }, 1000);
        } else {
          console.log('Create event page: User can create more events');
        }
      } catch (error) {
        console.error('Error checking event limits:', error);
        toast.error('Something went wrong while checking your subscription. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkEventLimit();
  }, [canCreateEvent, navigateToUpgrade]);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null); // Add this state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // Renamed from previewImage
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Event details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [template, setTemplate] = useState<'custom' | 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation'>('custom');
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('restricted');

  // Get auth token on page load
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

  // Handle cover image selection - renamed to match the usage in your JSX
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always reset the value when nothing is selected
    if (!e.target.files || e.target.files.length === 0) {
      setCoverImageFile(null);
      setPreviewUrl(null);
      return;
    }
    
    // Get the actual File object
    const selectedFile = e.target.files[0];
    
    // Store the File object (not the URL)
    setCoverImageFile(selectedFile);
    
    // For preview only, create an object URL
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

  const handleTemplateSelect = (template: string) => {
    setTemplate(template as any);

    // Set defaults based on template
    switch (template) {
      case 'wedding':
        setName('Our Wedding');
        setDescription('Join us on our special day');
        break;
      case 'birthday':
        setName('Birthday Celebration');
        setDescription('Let\'s celebrate together!');
        break;
      case 'concert':
        setName('Concert Memories');
        setDescription('Photos from the show');
        break;
      case 'corporate':
        setName('Company Event');
        setDescription('Official photos from our corporate event');
        break;
      case 'vacation':
        setName('Vacation Photos');
        setDescription('Memories from our trip');
        break;
      case 'custom':
        setName('');
        setDescription('');
        break;
    }
  };

  const handleCreateEvent = async () => {
    if (!name.trim() || !authToken) return;

    setIsSubmitting(true);

    try {
      let coverImageUrl;
      // Use the actual File object, not the preview URL
      if (coverImageFile) {
        coverImageUrl = await uploadCoverImage(coverImageFile, 'new-event', authToken);
      }

      // Generate a shorter, user-friendly access code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Prepare event data for API
      const eventData: Partial<Event> = {
        name: name.trim(),
        description: description.trim(),
        date,
        endDate,
        location,
        cover_image: coverImageUrl || undefined,
        accessType,
        accessCode,
        template,
        isActive: true
      };

      // Call the API to create the event
      const createdEvent = await createEvent(eventData, authToken);

      // Navigate to the new event page
      toast.success("Event created successfully!");
      router.push(`/events/${createdEvent.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const templateOptions = [
    { id: 'custom', name: 'Custom Event', icon: '🎪', description: 'Start from scratch' },
    { id: 'wedding', name: 'Wedding', icon: '💍', description: 'For your special day' },
    { id: 'birthday', name: 'Birthday', icon: '🎂', description: 'Celebrate another year' },
    { id: 'concert', name: 'Concert', icon: '🎵', description: 'Music event photos' },
    { id: 'corporate', name: 'Corporate', icon: '👔', description: 'Professional gatherings' },
    { id: 'vacation', name: 'Vacation', icon: '🏖️', description: 'Travel memories' },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card className="border shadow-lg">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-2xl font-bold">Create New Event</CardTitle>
            <CardDescription>
              Checking your subscription limits...
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 pb-8">
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  Verifying event limits
                </p>
                <p className="text-sm text-gray-500 max-w-md">
                  We're checking your subscription to ensure you can create another event.
                  This will only take a moment...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Card className="border shadow-lg">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-2xl font-bold">Create New Event</CardTitle>
          <CardDescription>
            Let's set up a photo collection for your event
          </CardDescription>
        </CardHeader>

        <div>
          {step === 1 && (
            /* Step 1: Choose Template */
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Choose an Event Type</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select a template for quick setup or create a custom event
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {templateOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleTemplateSelect(option.id)}
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
              </div>
            </CardContent>
          )}

          {step === 2 && (
            /* Step 2: Event Details */
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  placeholder="Summer Beach Party"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Share details about your event"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
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
                  <Label htmlFor="location">Location (Optional)</Label>
                  <div className="flex">
                    <MapPinIcon className="h-4 w-4 mt-3 mr-2 text-gray-400" />
                    <Input
                      id="location"
                      placeholder="Event location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessType">Who can upload photos?</Label>
                <Select
                  value={accessType}
                  onValueChange={(value: 'public' | 'restricted') => setAccessType(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select access type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Anyone with the link</SelectItem>
                    <SelectItem value="restricted">Only invited people</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}

          {step === 3 && (
            /* Step 3: Cover Image */
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="cover_image">Event Cover Image (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {previewUrl ? (
                    <div className="relative h-48 w-full mb-2">
                      <Image
                        src={previewUrl}
                        alt="Cover preview"
                        fill
                        className="object-cover rounded-lg"
                      />
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
                    onChange={handleImageUpload}
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
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h4 className="font-medium text-yellow-800 text-sm">Almost Ready!</h4>
                <p className="text-yellow-700 text-xs mt-1">
                  After creating your event, you'll get a shareable link and QR code to invite people.
                </p>
              </div>
            </CardContent>
          )}

          <CardFooter className="flex justify-between border-t pt-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
              >
                Back
              </Button>
            ) : (
              <div></div>
            )}

            {step === 3 ? (
              <Button
                type="button"
                onClick={handleCreateEvent}
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                disabled={step === 2 && !name.trim()}
              >
                Continue
              </Button>
            )}
          </CardFooter>
        </div>
      </Card>
    </div>
  );
}