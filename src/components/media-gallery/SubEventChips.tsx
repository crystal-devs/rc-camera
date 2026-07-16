'use client';

import { cn } from '@/lib/utils';
import type { SubEvent } from '@/hooks/useSubEvents';

interface SubEventChipsProps {
    subEvents: SubEvent[];
    /** undefined = All, 'none' = Unsorted, otherwise a function id */
    value?: string;
    onChange: (value: string | undefined) => void;
    /**
     * Show an "Unsorted" chip for media in no function. Useful for hosts
     * organizing photos; off for guest-facing views.
     */
    includeUnsorted?: boolean;
    className?: string;
}

/**
 * Horizontal filter chips for an event's functions (sub-events). Renders nothing
 * when the event has no functions, so single-gallery events never see it — the
 * progressive-disclosure default. (Phase 1)
 */
export function SubEventChips({
    subEvents,
    value,
    onChange,
    includeUnsorted = false,
    className,
}: SubEventChipsProps) {
    if (!subEvents.length) return null;

    const Chip = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
        >
            {label}
        </button>
    );

    return (
        <div
            role="tablist"
            aria-label="Filter photos by function"
            className={cn(
                'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                className
            )}
        >
            <Chip active={value === undefined} label="All" onClick={() => onChange(undefined)} />
            {subEvents.map((s) => (
                <Chip
                    key={s._id}
                    active={value === s._id}
                    label={s.name}
                    onClick={() => onChange(s._id)}
                />
            ))}
            {includeUnsorted && (
                <Chip active={value === 'none'} label="Unsorted" onClick={() => onChange('none')} />
            )}
        </div>
    );
}
