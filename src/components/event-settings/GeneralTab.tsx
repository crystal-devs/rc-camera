// components/event-settings/GeneralTab.tsx
'use client';

import React, { useState } from 'react';
import { isBefore, format } from 'date-fns';
import { CalendarIcon, PowerOff, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import { EventFormData, EventTemplate } from '@/types/events';
import { EVENT_TEMPLATES } from '@/constants/constants';
import {
    SettingsSection, SettingsCard, Field, inputWell, InlineConfirm
} from './primitives';

interface GeneralTabProps {
    formData: EventFormData;
    onInputChange: (field: string, value: any) => void;
    isCreator: boolean;
    onDeleteEvent: () => void;
}

interface DatePickerFieldProps {
    label: string;
    value: string;
    onSelect: (date: Date | undefined) => void;
    /** Disable days before this ISO date (used for the end-date picker) */
    disabledBefore?: string;
}

// Module-scope so React keeps the Popover/Calendar subtree mounted while the
// parent re-renders (defining it inside GeneralTab would remount it on every
// keystroke in the other fields).
const DatePickerField = ({ label, value, onSelect, disabledBefore }: DatePickerFieldProps) => (
    <Field label={label}>
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-11 w-full justify-start rounded-xl bg-background px-3.5 text-left font-normal shadow-none"
                >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    {value ? (
                        format(new Date(value), 'PPP')
                    ) : (
                        <span className="text-muted-foreground">Select date</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value ? new Date(value) : undefined}
                    onSelect={onSelect}
                    disabled={
                        disabledBefore
                            ? (date) => isBefore(date, new Date(disabledBefore))
                            : undefined
                    }
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    </Field>
);

export const GeneralTab: React.FC<GeneralTabProps> = ({
    formData,
    onInputChange,
    isCreator,
    onDeleteEvent
}) => {
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const isEventLive = formData.share_settings?.is_active !== false;

    const handleDateChange = (field: 'start_date' | 'end_date', date: Date | undefined) => {
        if (!date) return;
        const isoDate = date.toISOString();

        if (field === 'start_date') {
            onInputChange('start_date', isoDate);
            // If end date is not set or now before new start date, update it to match
            if (!formData.end_date || isBefore(new Date(formData.end_date), date)) {
                onInputChange('end_date', isoDate);
            }
        }
        if (field === 'end_date') {
            onInputChange('end_date', isoDate);
        }
    };

    return (
        <div className="space-y-10">
            {/* ── About ─────────────────────────────────────────────────────── */}
            <SettingsSection
                title="About your event"
                description="Name your event and add a description. The event type helps us tailor the experience to your occasion."
            >
                <SettingsCard className="space-y-5">
                    <Field label="Event type" htmlFor="template">
                        <Select value={formData.template} onValueChange={(value) => onInputChange('template', value)}>
                            <SelectTrigger id="template" className="!h-11 w-full rounded-xl bg-background shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EVENT_TEMPLATES.map((template: EventTemplate) => (
                                    <SelectItem key={template.value} value={template.value}>
                                        {template.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Event name" htmlFor="title">
                        <input
                            id="title"
                            value={formData.title}
                            onChange={(e) => onInputChange('title', e.target.value)}
                            placeholder="Sarah's Birthday Party"
                            maxLength={100}
                            className={inputWell}
                        />
                    </Field>

                    <Field
                        label="About"
                        htmlFor="description"
                        hint={`${formData.description.length}/500 characters`}
                    >
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => onInputChange('description', e.target.value)}
                            placeholder="Tell your guests what to expect…"
                            rows={4}
                            maxLength={500}
                            className="resize-none rounded-xl bg-background shadow-none"
                        />
                    </Field>
                </SettingsCard>
            </SettingsSection>

            {/* ── Date & location ──────────────────────────────────────────── */}
            <SettingsSection
                title="Date & location"
                description="When and where it's happening. Shown to guests on the event page."
            >
                <SettingsCard className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <DatePickerField
                            label="Start date"
                            value={formData.start_date}
                            onSelect={(date) => handleDateChange('start_date', date)}
                        />
                        <DatePickerField
                            label="End date"
                            value={formData.end_date}
                            onSelect={(date) => handleDateChange('end_date', date)}
                            disabledBefore={formData.start_date || undefined}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Venue name" htmlFor="location_name">
                            <input
                                id="location_name"
                                value={formData.location.name}
                                onChange={(e) => onInputChange('location.name', e.target.value)}
                                placeholder="Taj Palace, Mumbai"
                                className={inputWell}
                            />
                        </Field>
                        <Field label="Address" htmlFor="location_address">
                            <input
                                id="location_address"
                                value={formData.location.address}
                                onChange={(e) => onInputChange('location.address', e.target.value)}
                                placeholder="Colaba, Mumbai 400001"
                                className={inputWell}
                            />
                        </Field>
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ── Danger zone — creator only (close/reopen + delete are
                 creator-gated server-side, so don't show them to co-hosts) ── */}
            {isCreator && (
            <SettingsSection
                danger
                title="Danger zone"
                description="Actions here immediately affect all guests. Photos stay safe in your dashboard until the event is deleted."
            >
                <SettingsCard danger className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {isEventLive ? 'Close event' : 'Event is closed'}
                            </p>
                            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                                {isEventLive
                                    ? 'Guests will see an "Event has ended" screen. You can reopen anytime.'
                                    : 'Guests currently see an "Event has ended" screen.'}
                            </p>
                        </div>
                        {isEventLive ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCloseConfirm(true)}
                                className="h-10 shrink-0 rounded-xl bg-background shadow-none"
                            >
                                <PowerOff className="size-4" />
                                Close event
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => onInputChange('share_settings.is_active', true)}
                                className="h-10 shrink-0 rounded-xl bg-foreground text-background shadow-none hover:bg-foreground/90"
                            >
                                Reopen event
                            </Button>
                        )}
                    </div>

                    {showCloseConfirm && isEventLive && (
                        <InlineConfirm
                            tone="danger"
                            title="Close this event for guests?"
                            description="The event page is replaced with a friendly &quot;Event ended&quot; screen for everyone. Your photos are untouched and you can undo this anytime."
                            confirmLabel="Close event"
                            onConfirm={() => {
                                onInputChange('share_settings.is_active', false);
                                setShowCloseConfirm(false);
                            }}
                            onCancel={() => setShowCloseConfirm(false)}
                        />
                    )}

                    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">Delete event</p>
                                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                                    Permanently removes the event and all uploaded photos. This cannot be undone.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 shrink-0 rounded-xl border-destructive/40 bg-background text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
                                    >
                                        <Trash2 className="size-4" />
                                        Delete event
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete “{formData.title}”?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This permanently deletes the event, its settings, and every photo and video
                                            guests have uploaded. There is no way to recover them afterwards.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-xl">Keep event</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={onDeleteEvent}
                                            className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
                                        >
                                            Delete permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                </SettingsCard>
            </SettingsSection>
            )}
        </div>
    );
};
