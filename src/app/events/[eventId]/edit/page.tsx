'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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


import TeamTab from '@/components/event-settings/TeamTab';
import { deleteEvent, updateEvent } from '@/services/apis/events.api';
import { uploadCoverImage } from '@/services/apis/media.api';
import { useAuth } from '@/hooks/use-auth';
import { useEventData } from '@/hooks/useEventData';
import { EventDetailsTab } from '@/components/event-settings/EventDetailsTab';
import { SharingTab } from '@/components/event-settings/SharingTab';
import { PermissionsTab } from '@/components/event-settings/PermissionsTab';
import { prepareSubmitData } from '@/utils/helpers';

const EventSettingsPage = () => {
  const params = useParams();
  const { eventId } = params;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  const { authToken, currentUserId } = useAuth();
  const {
    formData,
    setFormData,
    originalData,
    setOriginalData,
    isLoading,
    hasChanges,
    eventCreatorId,
    previewUrl,
    setPreviewUrl,
    handleInputChange,
    loadEventData
  } = useEventData(eventId as string, authToken);

  const isEventCreator = currentUserId && eventCreatorId && currentUserId === eventCreatorId;

  useEffect(() => {
    if (authToken) {
      loadEventData();
    }
  }, [authToken, loadEventData]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setCoverImageFile(null);
      return;
    }

    const selectedFile = e.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (selectedFile.size > maxSize) {
      toast.error("Image size should be less than 10MB");
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP)");
      e.target.value = '';
      return;
    }

    setCoverImageFile(selectedFile);

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Event name is required");
      return;
    }

    if (!authToken) {
      toast.error("Authentication required");
      return;
    }

    setIsSubmitting(true);

    try {
      let updatedFormData = { ...formData };

      if (coverImageFile) {
        toast.info("Uploading cover image...");
        try {
          const imageUrl = await uploadCoverImage(
            coverImageFile,
            'event-covers',
            authToken,
            {
              compressionQuality: 'high',
              maxWidth: 1920,
              maxHeight: 1080
            }
          );

          updatedFormData.cover_image = {
            url: imageUrl,
            public_id: '',
          };

          toast.success("Cover image uploaded successfully!");
        } catch (uploadError: any) {
          console.error('Cover image upload failed:', uploadError);
          toast.error(uploadError.message || "Failed to upload cover image");
          return;
        }
      }

      const submitData = prepareSubmitData(updatedFormData);

      await updateEvent(eventId as string, submitData, authToken);
      toast.success("Event updated successfully!");
      await updateEvent(eventId as string, submitData, authToken);
      toast.success("Event updated successfully!");

      setFormData(updatedFormData);
      setOriginalData(updatedFormData);
      setCoverImageFile(null);

      if (updatedFormData.cover_image.url) {
        setPreviewUrl(updatedFormData.cover_image.url);
      }

    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error(error.message || "Failed to update event");
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
              <h1 className="text-2xl font-semibold">Event Settings</h1>
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
          <TabsList className="grid w-full grid-cols-4 mb-6 h-11 border-0">
            <TabsTrigger value="basics" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger value="sharing" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <span className="hidden sm:inline text">Sharing</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4">
            <EventDetailsTab
              formData={formData}
              onInputChange={handleInputChange}
              previewUrl={previewUrl}
              onCoverImageChange={handleCoverImageChange}
              onClearImage={() => {
                setCoverImageFile(null);
                setPreviewUrl(null);
                handleInputChange('cover_image.url', '');
              }}
            />
          </TabsContent>

          <TabsContent value="sharing" className="space-y-4">
            <SharingTab
              formData={formData}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <PermissionsTab
              formData={formData}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {eventId && authToken && (
              <TeamTab
                eventId={eventId as string}
                authToken={authToken}
                isEventCreator={isEventCreator as boolean}
                formData={formData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EventSettingsPage;