// app/events/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
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
import { db } from '@/lib/db';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface Event {
  id: string;
  name: string;
  description?: string;
  date: Date;
  endDate?: Date;
  location?: string;
  coverImage?: string;
  createdAt: Date;
  createdById: number;
  accessType: 'public' | 'restricted';
  accessCode?: string;
  template?: 'custom' | 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation';
  isActive: boolean;
}

interface Album {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdById: number;
  accessType: 'public' | 'restricted';
  isDefault: boolean;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Event details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [template, setTemplate] = useState<'custom' | 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation'>('custom');
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('restricted');

  // User ID would come from auth in a real app
  const userId = 1;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      const eventId = uuidv4();
      // Generate a shorter, user-friendly access code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const newEvent: Event = {
        id: eventId,
        name: name.trim(),
        description: description.trim(),
        date,
        endDate,
        location,
        createdAt: new Date(),
        createdById: userId,
        coverImage: previewImage || undefined,
        accessType,
        accessCode,
        template: template as any,
        isActive: true
      };

      // Add event to database
      await db.events.add(newEvent);

      // Create owner access record
      await db.eventAccess.add({
        id: uuidv4(),
        eventId,
        userId,
        accessType: 'owner',
        joinedAt: new Date()
      });

      // Create default album for this event
      const defaultAlbum: Album = {
        id: uuidv4(),
        eventId,
        name: "All Photos",
        description: "Default album for all photos",
        createdAt: new Date(),
        createdById: userId,
        accessType: 'public',
        isDefault: true
      };

      await db.albums.add(defaultAlbum);

      // Create owner access record for the default album
      await db.albumAccess.add({
        id: uuidv4(),
        albumId: defaultAlbum.id,
        userId,
        accessType: 'owner',
        joinedAt: new Date()
      });

      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error('Error creating event:', error);
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
                <Label htmlFor="coverImage">Event Cover Image (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {previewImage ? (
                    <div className="relative h-48 w-full mb-2">
                      <Image
                        src={previewImage}
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
                    id="coverImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('coverImage')?.click()}
                    className="mt-2"
                  >
                    {previewImage ? 'Change Image' : 'Select Image'}
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