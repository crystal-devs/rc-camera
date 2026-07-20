// components/event-settings/PhotoWallTab.tsx
'use client';

import React from 'react';
import { MonitorPlay, Image as ImageIcon, Grid3X3, LayoutDashboard, Zap, Eye } from 'lucide-react';

import {
    SettingsSection, SettingsCard, ToggleRow, ChoiceTile, Field,
    PillGroup, CopyLinkRow, useClipboard
} from './primitives';

interface PhotoWallTabProps {
    formData: {
        photowall_settings: {
            isEnabled: boolean
            displayMode: 'slideshow' | 'grid' | 'mosaic'
            transitionDuration: number
            showUploaderNames: boolean
            autoAdvance: boolean
            newImageInsertion: 'immediate' | 'after_current' | 'end_of_queue' | 'smart_priority'
        }
        share_token: string
    };
    onInputChange: (field: string, value: any) => void;
}

const DISPLAY_MODES = [
    { value: 'slideshow', label: 'Slideshow', icon: <ImageIcon />, description: 'One photo at a time with smooth transitions. Best for many photos.' },
    { value: 'grid', label: 'Grid', icon: <Grid3X3 />, description: 'Several photos at once in an organized grid.' },
    { value: 'mosaic', label: 'Mosaic', icon: <LayoutDashboard />, description: 'A creative, varied arrangement of photos.' },
] as const;

const DURATIONS = [
    { value: 2000, label: '2s' },
    { value: 3000, label: '3s' },
    { value: 5000, label: '5s' },
    { value: 7000, label: '7s' },
    { value: 10000, label: '10s' },
    { value: 15000, label: '15s' },
    { value: 30000, label: '30s' },
];

const INSERTION_STRATEGIES = [
    { value: 'immediate', label: 'Show immediately', description: 'New uploads jump to the screen right away.' },
    { value: 'after_current', label: 'After current photo', description: 'New uploads queue up next. Smoothest experience.' },
    { value: 'end_of_queue', label: 'End of slideshow', description: 'New uploads wait for their turn at the end.' },
    { value: 'smart_priority', label: 'Smart timing', description: 'Inserted automatically based on quality and timing.' },
] as const;

export const PhotoWallTab: React.FC<PhotoWallTabProps> = ({
    formData,
    onInputChange
}) => {
    const settings = formData.photowall_settings;
    const { copied, copy } = useClipboard();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const wallUrl = formData.share_token ? `${origin}/wall/${formData.share_token}` : '';

    const handleSettingChange = (key: string, value: any) => {
        onInputChange(`photowall_settings.${key}`, value);
    };

    return (
        <div className="space-y-10">
            {/* ── Status ───────────────────────────────────────────────────── */}
            <SettingsSection
                title="Live photo wall"
                description="A real-time display of guest uploads for a TV or projector at your venue. 5–7 seconds per photo gives guests time to enjoy each one."
            >
                <SettingsCard className="space-y-4">
                    <ToggleRow
                        icon={<MonitorPlay />}
                        title="Enable photo wall"
                        description={settings.isEnabled
                            ? 'The wall is live and updating with new uploads.'
                            : 'The wall is turned off. Guests opening the link see a waiting screen.'}
                        checked={settings.isEnabled}
                        onCheckedChange={(checked) => handleSettingChange('isEnabled', checked)}
                    />
                    {wallUrl && (
                        <div className="border-t border-border/70 pt-4">
                            <CopyLinkRow
                                url={wallUrl}
                                copyKey="wall"
                                copied={copied}
                                onCopy={copy}
                            />
                        </div>
                    )}
                </SettingsCard>
            </SettingsSection>

            {/* ── Display mode ─────────────────────────────────────────────── */}
            <SettingsSection
                title="Display mode"
                description="How photos are arranged on the big screen."
            >
                <SettingsCard>
                    <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {DISPLAY_MODES.map((mode) => (
                            <ChoiceTile
                                key={mode.value}
                                selected={settings.displayMode === mode.value}
                                onSelect={() => handleSettingChange('displayMode', mode.value)}
                                icon={mode.icon}
                                title={mode.label}
                                description={mode.description}
                            />
                        ))}
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ── Timing ───────────────────────────────────────────────────── */}
            <SettingsSection
                title="Timing"
                description="How long each photo stays on screen before the next one appears."
            >
                <SettingsCard className="space-y-5">
                    <Field label="Photo display duration">
                        <PillGroup
                            aria-label="Photo display duration"
                            options={DURATIONS}
                            value={settings.transitionDuration}
                            onChange={(value) => handleSettingChange('transitionDuration', value)}
                        />
                    </Field>
                    <div className="border-t border-border/70 pt-1">
                        <ToggleRow
                            icon={<Zap />}
                            title="Auto-advance"
                            description="Automatically move to the next photo."
                            checked={settings.autoAdvance}
                            onCheckedChange={(checked) => handleSettingChange('autoAdvance', checked)}
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ── On-screen info ───────────────────────────────────────────── */}
            <SettingsSection
                title="On-screen info"
                description="What appears alongside each photo on the wall."
            >
                <SettingsCard>
                    <ToggleRow
                        icon={<Eye />}
                        title="Show uploader names"
                        description="Credit each photo with the guest who shared it."
                        checked={settings.showUploaderNames}
                        onCheckedChange={(checked) => handleSettingChange('showUploaderNames', checked)}
                    />
                </SettingsCard>
            </SettingsSection>

            {/* ── New uploads ──────────────────────────────────────────────── */}
            <SettingsSection
                title="New uploads"
                description="Where freshly uploaded photos join the slideshow."
            >
                <SettingsCard>
                    <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {INSERTION_STRATEGIES.map((strategy) => (
                            <ChoiceTile
                                key={strategy.value}
                                selected={settings.newImageInsertion === strategy.value}
                                onSelect={() => handleSettingChange('newImageInsertion', strategy.value)}
                                title={strategy.label}
                                description={strategy.description}
                            />
                        ))}
                    </div>
                </SettingsCard>
            </SettingsSection>
        </div>
    );
};
