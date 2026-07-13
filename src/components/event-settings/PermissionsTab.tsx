// components/event-settings/PermissionsTab.tsx
'use client';

import React from 'react';
import { Camera, Video, Eye, Upload, Download, CheckCircle2, Clock, X } from 'lucide-react';

import { EventFormData } from '@/types/events';
import {
    SettingsSection, SettingsCard, ToggleRow, ChoiceTile, Field, inputWell
} from './primitives';
import { cn } from '@/lib/utils';

interface PermissionsTabProps {
    formData: EventFormData;
    onInputChange: (field: string, value: any) => void;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({
    formData,
    onInputChange
}) => {
    const uploadsEnabled = formData.permissions?.can_upload !== false;
    const maxPerGuest = formData.permissions?.max_photos_per_guest || 0;

    return (
        <div className="space-y-10">
            {/* ── Moderation ───────────────────────────────────────────────── */}
            <SettingsSection
                title="Photo review"
                description="Decide whether uploads appear instantly or wait for your approval first."
            >
                <SettingsCard>
                    <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ChoiceTile
                            selected={!formData.permissions?.require_approval}
                            onSelect={() => onInputChange('permissions.require_approval', false)}
                            icon={<CheckCircle2 />}
                            title="Publish instantly"
                            description="Photos appear the moment they're uploaded. Great for trusted groups."
                        />
                        <ChoiceTile
                            selected={!!formData.permissions?.require_approval}
                            onSelect={() => onInputChange('permissions.require_approval', true)}
                            icon={<Clock />}
                            title="Review first"
                            description="You approve each photo before guests see it. Peace of mind for formal events."
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ── Guest permissions ────────────────────────────────────────── */}
            <SettingsSection
                title="What guests can do"
                description="Control browsing, uploading, and downloading. Turning uploads off keeps existing photos untouched."
            >
                <SettingsCard>
                    <div className="divide-y divide-border/70">
                        <ToggleRow
                            icon={<Eye />}
                            title="View photos"
                            description="Let guests browse the full gallery."
                            checked={!!formData.permissions?.can_view}
                            onCheckedChange={(checked) => onInputChange('permissions.can_view', checked)}
                        />
                        <ToggleRow
                            icon={<Upload />}
                            title="Upload photos"
                            description="Allow guests to add their own shots."
                            checked={!!formData.permissions?.can_upload}
                            onCheckedChange={(checked) => onInputChange('permissions.can_upload', checked)}
                        />
                        <ToggleRow
                            icon={<Download />}
                            title="Download photos"
                            description="Let guests save memories to their device."
                            checked={!!formData.permissions?.can_download}
                            onCheckedChange={(checked) => onInputChange('permissions.can_download', checked)}
                        />
                    </div>

                    {uploadsEnabled && (
                        <div className="mt-4 rounded-xl bg-background p-4 ring-1 ring-inset ring-border/70">
                            <Field
                                label="Upload limit per guest"
                                htmlFor="max-photos"
                                hint='Cap each guest&apos;s uploads for a "disposable camera" feel. 0 means unlimited.'
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        id="max-photos"
                                        type="number"
                                        min="0"
                                        max="500"
                                        value={maxPerGuest}
                                        onChange={(e) => onInputChange('permissions.max_photos_per_guest', parseInt(e.target.value) || 0)}
                                        className={cn(inputWell, 'max-w-[120px] bg-card')}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {maxPerGuest === 0 ? 'Unlimited' : `${maxPerGuest} photos each`}
                                    </span>
                                    {maxPerGuest > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => onInputChange('permissions.max_photos_per_guest', 0)}
                                            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <X className="size-3.5" /> Remove cap
                                        </button>
                                    )}
                                </div>
                            </Field>
                        </div>
                    )}
                </SettingsCard>
            </SettingsSection>

            {/* ── Media types ──────────────────────────────────────────────── */}
            <SettingsSection
                title="Media types"
                description="Choose what guests can upload. Videos capture emotions beautifully but use more storage."
            >
                <SettingsCard>
                    <div className="divide-y divide-border/70">
                        <ToggleRow
                            icon={<Camera />}
                            title="Photos"
                            description="JPEG, PNG, HEIC"
                            checked={!!formData.permissions?.allowed_media_types?.images}
                            onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.images', checked)}
                        />
                        <ToggleRow
                            icon={<Video />}
                            title="Videos"
                            description="MP4, MOV, AVI"
                            checked={!!formData.permissions?.allowed_media_types?.videos}
                            onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.videos', checked)}
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>
        </div>
    );
};
