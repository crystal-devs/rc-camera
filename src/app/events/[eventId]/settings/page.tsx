// app/events/[eventId]/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  CircleDot, Link2, ShieldCheck, Palette, MonitorPlay, Save
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { GeneralTab } from '@/components/event-settings/GeneralTab';
import { SharingTab } from '@/components/event-settings/SharingTab';
import { PermissionsTab } from '@/components/event-settings/PermissionsTab';
import { AppearanceTab } from '@/components/event-settings/AppearanceTab';
import { PhotoWallTab } from '@/components/event-settings/PhotoWallTab';

import { useEventSettings } from '@/hooks/useEventSettings';
import { useEventRole } from '@/hooks/useEventRole';
import { UserRole, hasRolePrivilege } from '@/types/roles';

const TABS = [
  { id: 'basics', label: 'General', icon: CircleDot },
  { id: 'sharing', label: 'Sharing', icon: Link2 },
  { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
  { id: 'design', label: 'Appearance', icon: Palette },
  { id: 'photowall', label: 'Photo wall', icon: MonitorPlay },
] as const;

type TabId = (typeof TABS)[number]['id'];

const EventSettingsPage = () => {
  const params = useParams();
  const { eventId } = params;
  const router = useRouter();
  const { role: eventRole, isCreator } = useEventRole(eventId as string);

  useEffect(() => {
    // Only creators and co-hosts can access settings; wait until the event
    // (and with it the authoritative role) has loaded before deciding.
    if (eventRole !== null && !hasRolePrivilege(eventRole, UserRole.CO_HOST)) {
      toast.error('Access denied. Only event creators and co-hosts can access settings.');
      router.push(`/events/${eventId}`);
    }
  }, [eventRole, eventId, router]);

  // Allow deep links like /settings?tab=sharing
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const isValidTab = (tab: string | null): tab is TabId =>
    !!tab && TABS.some((t) => t.id === tab);
  const [activeTab, setActiveTab] = useState<TabId>(
    isValidTab(requestedTab) ? requestedTab : 'basics'
  );

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    // Keep the URL shareable without triggering a navigation
    window.history.replaceState(null, '', `?tab=${tab}`);
  };

  const {
    formData,
    isLoading,
    isSubmitting,
    hasChanges,
    error,
    handleInputChange,
    handleCoverImageChange,
    handleClearImage,
    handleSubmit,
    handleDeleteEvent,
    previewUrl,
  } = useEventSettings(eventId as string);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">Couldn&apos;t load settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => router.push(`/events/${eventId}`)}
            className="mt-6 h-11 rounded-xl bg-foreground px-6 text-background hover:bg-foreground/90"
          >
            Back to event
          </Button>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="w-full">
      {/* Header */}
      <header className="mb-6 max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Event settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename your event, personalize its appearance, and adjust privacy and sharing.
        </p>
      </header>

      {/* Underline tabs — sticky, full-width border, horizontally scrollable on small screens */}
      <nav
        role="tablist"
        aria-label="Settings sections"
        className="sticky top-0 z-10 mb-8 flex gap-1 overflow-x-auto border-b border-border bg-background px-4 pt-2 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(id)}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 pb-3 pt-1 text-sm outline-none transition-colors',
                'focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/40',
                active
                  ? 'border-foreground font-semibold text-foreground'
                  : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Active section */}
      <div className="max-w-5xl px-4 pb-28 sm:px-6 lg:px-8">
        {activeTab === 'basics' && (
          <GeneralTab
            formData={formData}
            onInputChange={handleInputChange}
            isCreator={isCreator}
            onDeleteEvent={handleDeleteEvent}
          />
        )}
        {activeTab === 'sharing' && (
          <SharingTab
            formData={formData}
            onInputChange={handleInputChange}
            eventId={eventId as string}
            isCreator={isCreator}
          />
        )}
        {activeTab === 'permissions' && (
          <PermissionsTab formData={formData} onInputChange={handleInputChange} />
        )}
        {activeTab === 'design' && (
          <AppearanceTab
            formData={formData}
            onInputChange={handleInputChange}
            previewUrl={previewUrl}
            onCoverImageChange={handleCoverImageChange}
            onClearImage={handleClearImage}
          />
        )}
        {activeTab === 'photowall' && (
          <PhotoWallTab formData={formData} onInputChange={handleInputChange} />
        )}
      </div>

      {/* Save bar — slides in only when there are unsaved changes */}
      <div
        aria-hidden={!hasChanges}
        className={cn(
          'pointer-events-none sticky bottom-0 z-20 transition-all duration-300',
          hasChanges ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        <div className="border-t border-border bg-background/90 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex max-w-5xl items-center justify-between gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              You have unsaved changes
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="pointer-events-auto h-11 w-full rounded-xl bg-foreground px-6 font-medium text-background shadow-none hover:bg-foreground/90 sm:w-auto"
            >
              {isSubmitting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSettingsPage;
