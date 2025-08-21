// app/events/[eventId]/settings/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

// Import components
import TeamTab from '@/components/event-settings/TeamTab';
import { EventDetailsTab } from '@/components/event-settings/EventDetailsTab';
import { SharingTab } from '@/components/event-settings/SharingTab';
import { PermissionsTab } from '@/components/event-settings/PermissionsTab';

// Import our optimized hook
import { useEventSettings } from '@/hooks/useEventSettings';

const OptimizedEventSettingsPage = () => {
  const params = useParams();
  const { eventId } = params;
  const router = useRouter();

  // Local state
  const [activeTab, setActiveTab] = useState('basics');

  // Use our optimized hook - this handles all the form logic
  const {
    formData,
    isLoading,
    isSubmitting,
    hasChanges,
    error,
    currentUserId,
    isEventCreator,
    handleInputChange,
    handleCoverImageChange,
    handleClearImage,
    handleSubmit,
    handleDeleteEvent,
    previewUrl,
    authToken
  } = useEventSettings(eventId as string);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Settings</h1>
        <p className="text-gray-500 mb-6">{error}</p>
        <Button onClick={() => router.push(`/events/${eventId}`)}>
          Back to Event
        </Button>
      </div>
    );
  }

  // No form data yet
  if (!formData) {
    return (
      <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Loading Settings...</h1>
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
              <p className="text-gray-500 text-sm">
                {formData.title || 'Configure your event'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
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
                  <AlertDialogAction 
                    onClick={handleDeleteEvent} 
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Event
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Save Button */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-11 border-0">
            <TabsTrigger 
              value="basics" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="hidden sm:inline">Details</span>
              <span className="sm:hidden">📝</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sharing" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="hidden sm:inline">Sharing</span>
              <span className="sm:hidden">🔗</span>
            </TabsTrigger>
            <TabsTrigger 
              value="permissions" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="hidden sm:inline">Permissions</span>
              <span className="sm:hidden">🔒</span>
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="hidden sm:inline">Team</span>
              <span className="sm:hidden">👥</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="basics" className="space-y-4">
            <EventDetailsTab
              formData={formData}
              onInputChange={handleInputChange}
              previewUrl={previewUrl}
              onCoverImageChange={handleCoverImageChange}
              onClearImage={handleClearImage}
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

export default OptimizedEventSettingsPage;