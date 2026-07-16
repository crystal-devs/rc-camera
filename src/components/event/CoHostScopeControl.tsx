'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSubEvents } from '@/hooks/useSubEvents';
import { useCoHosts, useSetCoHostScope } from '@/hooks/useCoHosts';

interface CoHostScopeControlProps {
    eventId: string;
    /** The co-host's user id (the scope endpoint is keyed by user, not participant) */
    userId: string;
}

/**
 * Assign a co-host to specific functions (Phase 1). Renders nothing when the
 * event has no functions — single-gallery events never see it. Empty selection
 * = full access.
 */
export function CoHostScopeControl({ eventId, userId }: CoHostScopeControlProps) {
    const { subEvents } = useSubEvents(eventId);
    const { coHosts } = useCoHosts(eventId);
    const setScope = useSetCoHostScope(eventId);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<string[] | null>(null);

    const currentScope = useMemo(
        () => coHosts.find((c) => c.user_id === userId)?.sub_event_scope ?? [],
        [coHosts, userId]
    );

    // Don't surface scoping for single-function events.
    if (subEvents.length === 0) return null;

    const selected = draft ?? currentScope;
    const toggle = (id: string) =>
        setDraft((prev) => {
            const base = prev ?? currentScope;
            return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
        });

    const save = async () => {
        try {
            await setScope.mutateAsync({ userId, subEventIds: selected });
            toast.success(selected.length ? 'Functions updated' : 'Given full access');
            setDraft(null);
            setOpen(false);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Could not update functions');
        }
    };

    const label =
        currentScope.length === 0
            ? 'All functions'
            : currentScope.length === 1
                ? subEvents.find((s) => s._id === currentScope[0])?.name ?? '1 function'
                : `${currentScope.length} functions`;

    return (
        <Popover
            open={open}
            onOpenChange={(o) => { setOpen(o); if (!o) setDraft(null); }}
        >
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg">
                    <CalendarDays className="size-3.5" />
                    <span className="max-w-[9rem] truncate">{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
                <p className="text-sm font-medium text-foreground">Assign to functions</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    Leave all unchecked for full access. Otherwise this co-host can only
                    moderate the checked functions.
                </p>
                <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                    {subEvents.map((s) => (
                        <label
                            key={s._id}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60"
                        >
                            <Checkbox
                                checked={selected.includes(s._id)}
                                onCheckedChange={() => toggle(s._id)}
                            />
                            <span className="text-sm text-foreground">{s.name}</span>
                        </label>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="font-normal">
                        {selected.length === 0 ? 'Full access' : `${selected.length} selected`}
                    </Badge>
                    <Button
                        type="button"
                        size="sm"
                        onClick={save}
                        disabled={setScope.isPending}
                        className="h-8 rounded-lg"
                    >
                        <Check className="size-3.5" />
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
