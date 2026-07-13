// components/event-settings/SharingTab.tsx
'use client';

import React, { useState } from 'react';
import { Globe, Users, Eye, EyeOff, ShieldCheck, PowerOff, Tv2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EventFormData } from '@/types/events';
import { InvitationManager } from './InvitationManager';
import {
    SettingsSection, SettingsCard, ToggleRow, ChoiceTile, Field,
    CopyLinkRow, useClipboard, shareOnWhatsApp, inputWell, InlineConfirm
} from './primitives';
import { cn } from '@/lib/utils';

interface SharingTabProps {
    formData: EventFormData;
    onInputChange: (field: string, value: any) => void;
    eventId?: string;
    /** Closing/reopening the event is creator-only (server-enforced) */
    isCreator?: boolean;
}

export const SharingTab: React.FC<SharingTabProps> = ({ formData, onInputChange, eventId, isCreator }) => {
    const { copied, copy } = useClipboard();
    const [showPin, setShowPin] = useState(false);
    // PIN is stored hashed server-side and never returned, so "a PIN exists" comes
    // from has_password; formData.password only holds a newly typed value.
    const hasStoredPin = !!formData.share_settings?.has_password;
    const [pinExpanded, setPinExpanded] = useState(
        !!formData.share_settings?.password || hasStoredPin
    );
    const [pendingMode, setPendingMode] = useState<'anyone_with_link' | 'invited_only' | null>(null);

    const effectiveMode: 'anyone_with_link' | 'invited_only' =
        formData.visibility === 'private' ? 'anyone_with_link' : formData.visibility as any;

    const isEventLive = formData.share_settings?.is_active !== false;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseShareUrl = formData.share_token ? `${origin}/join/${formData.share_token}` : '';
    // Embed the PIN in the link only while the host has just typed it; once saved
    // it can't be read back (only a hash is stored).
    const shareUrl = pinExpanded && formData.share_settings?.password
        ? `${baseShareUrl}?pin=${encodeURIComponent(formData.share_settings.password)}`
        : baseShareUrl;
    const wallUrl = formData.share_token ? `${origin}/wall/${formData.share_token}` : '';

    const handleModeClick = (mode: 'anyone_with_link' | 'invited_only') => {
        if (mode === effectiveMode) return;
        if (effectiveMode === 'anyone_with_link' && mode === 'invited_only') {
            setPendingMode(mode);
        } else {
            onInputChange('visibility', mode);
        }
    };

    return (
        <div className="space-y-10">
            {/* ── Closed notice ────────────────────────────────────────────── */}
            {!isEventLive && (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
                            <PowerOff className="size-4" />
                        </span>
                        <div>
                            <p className="text-sm font-medium text-foreground">This event is closed</p>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">
                                Links below won&apos;t work for guests until you reopen the event.
                            </p>
                        </div>
                    </div>
                    {isCreator && (
                        <Button
                            type="button"
                            onClick={() => onInputChange('share_settings.is_active', true)}
                            className="h-10 shrink-0 rounded-xl bg-foreground text-background shadow-none hover:bg-foreground/90"
                        >
                            Reopen event
                        </Button>
                    )}
                </div>
            )}

            {/* ── Access mode ─────────────────────────────────────────────── */}
            <SettingsSection
                title="Who can join"
                description="Choose how guests enter your event. You can lock it down to an invite list at any time."
            >
                <SettingsCard className="space-y-4">
                    <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ChoiceTile
                            selected={effectiveMode === 'anyone_with_link'}
                            onSelect={() => handleModeClick('anyone_with_link')}
                            icon={<Globe />}
                            title="Anyone with the link"
                            description="Guests join instantly via link or QR code. Great for weddings and parties."
                        />
                        <ChoiceTile
                            selected={effectiveMode === 'invited_only'}
                            onSelect={() => handleModeClick('invited_only')}
                            icon={<Users />}
                            title="Invited guests only"
                            description="Only people on your list can enter, verified by their email."
                        />
                    </div>

                    {pendingMode === 'invited_only' && (
                        <InlineConfirm
                            title="Lock out existing link-joiners?"
                            description="Anyone who joined via the open link loses access immediately unless their email is on the invite list."
                            confirmLabel="Switch to invite only"
                            onConfirm={() => {
                                onInputChange('visibility', pendingMode);
                                setPendingMode(null);
                            }}
                            onCancel={() => setPendingMode(null)}
                        />
                    )}
                </SettingsCard>
            </SettingsSection>

            {/* ── Guest link + PIN (open mode) ─────────────────────────────── */}
            {effectiveMode === 'anyone_with_link' && (
                <SettingsSection
                    title="Guest link"
                    description="Share this link anywhere — WhatsApp, invitations, or a printed QR code. Add a PIN for a simple extra layer of privacy."
                >
                    <SettingsCard className="space-y-4">
                        <CopyLinkRow
                            url={shareUrl}
                            copyKey="join"
                            copied={copied}
                            onCopy={copy}
                            onWhatsApp={() => shareOnWhatsApp(shareUrl, formData.title)}
                        />

                        <div className="divide-y divide-border/70 border-t border-border/70">
                            <ToggleRow
                                icon={<ShieldCheck />}
                                title="Require a PIN to enter"
                                description={
                                    pinExpanded && formData.share_settings?.password
                                        ? 'The PIN is embedded in copied links, so guests skip typing it.'
                                        : 'Guests must enter a short code before joining.'
                                }
                                checked={pinExpanded}
                                onCheckedChange={(val) => {
                                    if (val) {
                                        setPinExpanded(true);
                                    } else {
                                        // '' tells the API to clear the stored PIN (null = leave unchanged)
                                        onInputChange('share_settings.password', '');
                                        onInputChange('share_settings.has_password', false);
                                        setPinExpanded(false);
                                    }
                                }}
                            />
                        </div>

                        {pinExpanded && (
                            <Field label="Event PIN" htmlFor="pin-input">
                                <div className="relative max-w-sm">
                                    <input
                                        id="pin-input"
                                        type={showPin ? 'text' : 'password'}
                                        value={formData.share_settings?.password || ''}
                                        onChange={(e) => onInputChange('share_settings.password', e.target.value || null)}
                                        placeholder={hasStoredPin ? 'PIN is set — type to replace it' : 'e.g. bloom25'}
                                        autoComplete="new-password"
                                        className={cn(inputWell, 'pr-12 font-mono tracking-wide')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(v => !v)}
                                        tabIndex={-1}
                                        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                            </Field>
                        )}
                    </SettingsCard>
                </SettingsSection>
            )}

            {/* ── Invite list (invite-only mode) ───────────────────────────── */}
            {effectiveMode === 'invited_only' && eventId && (
                <SettingsSection
                    title="Guest invitations"
                    description="Manage your guest list. Only people added here can view or upload memories."
                >
                    <SettingsCard>
                        <InvitationManager eventId={eventId} isVisible={true} />
                    </SettingsCard>
                </SettingsSection>
            )}

            {/* ── Photo wall link ──────────────────────────────────────────── */}
            {formData.share_token && (
                <SettingsSection
                    title="Live photo wall"
                    description="A fullscreen slideshow of guest uploads that updates in real time. Open it on a TV, projector, or tablet at the venue."
                    aside={
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Tv2 className="size-3.5" /> Works with Chromecast and Apple TV
                        </p>
                    }
                >
                    <SettingsCard>
                        <CopyLinkRow
                            url={wallUrl}
                            copyKey="wall"
                            copied={copied}
                            onCopy={copy}
                        />
                        <p className="mt-3 text-xs text-muted-foreground">
                            Display settings live in the <span className="font-medium text-foreground">Photo wall</span> tab.
                        </p>
                    </SettingsCard>
                </SettingsSection>
            )}
        </div>
    );
};
