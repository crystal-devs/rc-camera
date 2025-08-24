// app/events/[eventId]/settings/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Import components
import TeamTab from '@/components/event-settings/TeamTab';
import { EventDetailsTab } from '@/components/event-settings/EventDetailsTab';
import { SharingTab } from '@/components/event-settings/SharingTab';
import { PermissionsTab } from '@/components/event-settings/PermissionsTab';

// Import our optimized hook
import { useEventSettings } from '@/hooks/useEventSettings';
import { PhotoWallTab } from '@/components/event-settings/PhotoWallTab';

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
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-6xl px-4 py-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Skeleton className="h-64 w-full" />
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Error Loading Settings</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push(`/events/${eventId}`)}>
            Back to Event
          </Button>
        </div>
      </div>
    );
  }

  // No form data yet
  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Loading Settings...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl px-4 py-8 lg:px-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Event Settings</h1>
              <p className="text-gray-600 mt-1">
                Manage your event details and preferences
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="bg-primary hover:bg-primary/70 text-white"
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
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-white border h-12">
            <TabsTrigger
              value="basics"
              className="flex items-center justify-center gap-1 px-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <span className="text-base">📝</span>
              <span className="hidden sm:inline font-medium text-xs lg:text-sm truncate">General</span>
            </TabsTrigger>
            <TabsTrigger
              value="sharing"
              className="flex items-center justify-center gap-1 px-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <span className="text-base">🔗</span>
              <span className="hidden sm:inline font-medium text-xs lg:text-sm truncate">Sharing</span>
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="flex items-center justify-center gap-1 px-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <span className="text-base">🔒</span>
              <span className="hidden sm:inline font-medium text-xs lg:text-sm truncate">Permissions</span>
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="flex items-center justify-center gap-1 px-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <span className="text-base">👥</span>
              <span className="hidden sm:inline font-medium text-xs lg:text-sm truncate">Team</span>
            </TabsTrigger>
            <TabsTrigger
              value="photowall"
              className="flex items-center justify-center gap-1 px-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <span className="text-base">👥</span>
              <span className="hidden sm:inline font-medium text-xs lg:text-sm truncate">Photowall</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="basics" className="mt-0">
            <EventDetailsTab
              formData={formData}
              onInputChange={handleInputChange}
              previewUrl={previewUrl}
              onCoverImageChange={handleCoverImageChange}
              onClearImage={handleClearImage}
            />
          </TabsContent>

          <TabsContent value="sharing" className="mt-0">
            <SharingTab
              formData={formData}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="permissions" className="mt-0">
            <PermissionsTab
              formData={formData}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            {eventId && authToken && (
              <TeamTab
                eventId={eventId as string}
                authToken={authToken}
                isEventCreator={isEventCreator as boolean}
                formData={formData}
              />
            )}
          </TabsContent>
          <TabsContent value="photowall" className="mt-0">
            {eventId && authToken && (
              <PhotoWallTab
                formData={formData}
                onInputChange={handleInputChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OptimizedEventSettingsPage;