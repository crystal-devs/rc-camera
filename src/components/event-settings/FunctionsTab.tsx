// components/event-settings/FunctionsTab.tsx
'use client';

import React, { useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsSection, SettingsCard, Field, inputWell, InlineConfirm } from './primitives';
import { cn } from '@/lib/utils';
import {
    useSubEvents, useCreateSubEvent, useUpdateSubEvent, useDeleteSubEvent, type SubEvent
} from '@/hooks/useSubEvents';

interface FunctionsTabProps {
    eventId: string;
}

/** ISO -> yyyy-mm-dd for <input type="date">, in local time (not UTC-shifted). */
const toDateInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const prettyDate = (iso: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime())
        ? null
        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const errMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export const FunctionsTab: React.FC<FunctionsTabProps> = ({ eventId }) => {
    const { subEvents, isLoading } = useSubEvents(eventId);
    const createSubEvent = useCreateSubEvent(eventId);
    const updateSubEvent = useUpdateSubEvent(eventId);
    const deleteSubEvent = useDeleteSubEvent(eventId);

    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDate, setEditDate] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const busy = createSubEvent.isPending || updateSubEvent.isPending || deleteSubEvent.isPending;

    const handleAdd = async () => {
        const name = newName.trim();
        if (!name) {
            toast.error('Give the function a name');
            return;
        }
        try {
            await createSubEvent.mutateAsync({
                name,
                date: newDate || null,
                order: subEvents.length + 1,
            });
            setNewName('');
            setNewDate('');
            toast.success(`“${name}” added`);
        } catch (e) {
            toast.error(errMessage(e, 'Could not add the function'));
        }
    };

    const startEdit = (fn: SubEvent) => {
        setEditingId(fn._id);
        setEditName(fn.name);
        setEditDate(toDateInput(fn.date));
        setConfirmDeleteId(null);
    };

    const handleSaveEdit = async (fn: SubEvent) => {
        const name = editName.trim();
        if (!name) {
            toast.error('Give the function a name');
            return;
        }
        try {
            await updateSubEvent.mutateAsync({
                subEventId: fn._id,
                input: { name, date: editDate || null },
            });
            setEditingId(null);
            toast.success('Function updated');
        } catch (e) {
            toast.error(errMessage(e, 'Could not update the function'));
        }
    };

    const handleDelete = async (fn: SubEvent) => {
        try {
            await deleteSubEvent.mutateAsync(fn._id);
            setConfirmDeleteId(null);
            toast.success(`“${fn.name}” removed — its photos moved to the main gallery`);
        } catch (e) {
            toast.error(errMessage(e, 'Could not remove the function'));
        }
    };

    /** Swap this function's order with its neighbour to move it in the timeline. */
    const handleMove = async (index: number, direction: -1 | 1) => {
        const current = subEvents[index];
        const neighbour = subEvents[index + direction];
        if (!current || !neighbour) return;
        try {
            await Promise.all([
                updateSubEvent.mutateAsync({ subEventId: current._id, input: { order: neighbour.order } }),
                updateSubEvent.mutateAsync({ subEventId: neighbour._id, input: { order: current.order } }),
            ]);
        } catch (e) {
            toast.error(errMessage(e, 'Could not reorder the functions'));
        }
    };

    return (
        <div className="space-y-10">
            <SettingsSection
                title="Functions"
                description="Break the event into its functions — haldi, sangeet, reception. Guests can pick one when they upload, and the gallery groups photos by function. Leave this empty and the event stays one simple gallery."
            >
                <SettingsCard className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                        </div>
                    ) : subEvents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
                            <CalendarDays className="mx-auto size-5 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium text-foreground">No functions yet</p>
                            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-snug text-muted-foreground">
                                Add your first function below. Until then every photo lands in one gallery —
                                which is all a smaller event needs.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/70">
                            {subEvents.map((fn, index) => (
                                <li key={fn._id} className="py-3 first:pt-0 last:pb-0">
                                    {editingId === fn._id ? (
                                        <div className="space-y-3">
                                            <Field label="Name" htmlFor={`name-${fn._id}`}>
                                                <input
                                                    id={`name-${fn._id}`}
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    maxLength={80}
                                                    className={inputWell}
                                                />
                                            </Field>
                                            <Field label="Date" htmlFor={`date-${fn._id}`} hint="Optional — used to order the timeline">
                                                <input
                                                    id={`date-${fn._id}`}
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className={inputWell}
                                                />
                                            </Field>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleSaveEdit(fn)}
                                                    disabled={busy}
                                                    className="h-9 rounded-xl bg-foreground text-background shadow-none hover:bg-foreground/90"
                                                >
                                                    <Check className="size-4" />
                                                    Save
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setEditingId(null)}
                                                    className="h-9 rounded-xl bg-background shadow-none"
                                                >
                                                    <X className="size-4" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">{fn.name}</p>
                                                <p className="mt-0.5 text-[13px] text-muted-foreground">
                                                    {prettyDate(fn.date) ?? 'No date set'}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Move ${fn.name} earlier`}
                                                    disabled={index === 0 || busy}
                                                    onClick={() => handleMove(index, -1)}
                                                    className="size-8 rounded-lg"
                                                >
                                                    <ChevronUp className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Move ${fn.name} later`}
                                                    disabled={index === subEvents.length - 1 || busy}
                                                    onClick={() => handleMove(index, 1)}
                                                    className="size-8 rounded-lg"
                                                >
                                                    <ChevronDown className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit ${fn.name}`}
                                                    onClick={() => startEdit(fn)}
                                                    className="size-8 rounded-lg"
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Remove ${fn.name}`}
                                                    onClick={() => setConfirmDeleteId(fn._id)}
                                                    className="size-8 rounded-lg text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {confirmDeleteId === fn._id && (
                                        <div className="mt-3">
                                            <InlineConfirm
                                                tone="danger"
                                                title={`Remove “${fn.name}”?`}
                                                description="Photos are not deleted — anything tagged to this function moves to the main gallery."
                                                confirmLabel="Remove function"
                                                onConfirm={() => handleDelete(fn)}
                                                onCancel={() => setConfirmDeleteId(null)}
                                            />
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </SettingsCard>
            </SettingsSection>

            <SettingsSection
                title="Add a function"
                description="Name it the way your guests would say it — “Haldi”, not “Ceremony 1”."
            >
                <SettingsCard className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                        <Field label="Name" htmlFor="new-function-name">
                            <input
                                id="new-function-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                                placeholder="Haldi"
                                maxLength={80}
                                className={inputWell}
                            />
                        </Field>
                        <Field label="Date" htmlFor="new-function-date" hint="Optional">
                            <input
                                id="new-function-date"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className={cn(inputWell, 'sm:w-48')}
                            />
                        </Field>
                    </div>
                    <Button
                        type="button"
                        onClick={handleAdd}
                        disabled={busy || !newName.trim()}
                        className="h-10 rounded-xl bg-foreground px-5 text-background shadow-none hover:bg-foreground/90"
                    >
                        <Plus className="size-4" />
                        Add function
                    </Button>
                </SettingsCard>
            </SettingsSection>
        </div>
    );
};
