// components/event-settings/primitives.tsx
// Shared building blocks for the event settings screens.
// One design language: soft cards on the page canvas, white input wells,
// quiet borders, a single accent (foreground) for selection states.
'use client';

import React from 'react';
import { Check, LinkIcon, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ── Section: left description column + right card ─────────────────────── */

interface SettingsSectionProps {
    title: string;
    description: string;
    children: React.ReactNode;
    /** Rendered under the description in the left column (badges, links…) */
    aside?: React.ReactNode;
    danger?: boolean;
}

export function SettingsSection({ title, description, children, aside, danger }: SettingsSectionProps) {
    return (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,240px)_1fr] lg:gap-10">
            <div className="space-y-1.5 lg:pt-1">
                <h3 className={cn(
                    'text-sm font-semibold tracking-tight',
                    danger ? 'text-destructive' : 'text-foreground'
                )}>
                    {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                {aside}
            </div>
            <div className="min-w-0">{children}</div>
        </section>
    );
}

/* ── Card: the right-hand surface holding controls ─────────────────────── */

export function SettingsCard({ className, children, danger }: {
    className?: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <div className={cn(
            'rounded-2xl border bg-card p-5 sm:p-6',
            danger ? 'border-destructive/30' : 'border-border/70',
            className
        )}>
            {children}
        </div>
    );
}

/* ── Field: label above control, Rompolo-style ──────────────────────────── */

export function Field({ label, htmlFor, hint, children }: {
    label: string;
    htmlFor?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

/** Shared input style: white well on the soft card. */
export const inputWell =
    'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground ' +
    'placeholder:text-muted-foreground shadow-none outline-none transition-colors ' +
    'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

/* ── ToggleRow: setting with a switch ───────────────────────────────────── */

interface ToggleRowProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function ToggleRow({ icon, title, description, checked, onCheckedChange, disabled }: ToggleRowProps) {
    return (
        <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-start gap-3">
                {icon && (
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground [&_svg]:size-4">
                        {icon}
                    </span>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    {description && (
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="shrink-0" />
        </div>
    );
}

/* ── ChoiceTile: selectable card (radio behaviour) ──────────────────────── */

interface ChoiceTileProps {
    selected: boolean;
    onSelect: () => void;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    badge?: string;
    /** Custom preview content rendered above the title */
    preview?: React.ReactNode;
    className?: string;
}

export function ChoiceTile({ selected, onSelect, title, description, icon, badge, preview, className }: ChoiceTileProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                'group relative flex w-full flex-col rounded-xl border bg-background p-4 text-left outline-none transition-all',
                'focus-visible:ring-2 focus-visible:ring-ring/40',
                selected
                    ? 'border-muted-foreground/70 ring-1 ring-muted-foreground/40'
                    : 'border-border/70 hover:border-border hover:shadow-sm',
                className
            )}
        >
            <span className={cn(
                'absolute right-3 top-3 z-10 flex size-4.5 items-center justify-center rounded-full border transition-all',
                selected
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background group-hover:border-muted-foreground/50'
            )}>
                {selected && <Check className="size-3" strokeWidth={3} />}
            </span>

            {preview}

            <span className="flex items-center gap-2 pr-7">
                {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
                <span className="text-sm font-medium text-foreground">{title}</span>
                {badge && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {badge}
                    </span>
                )}
            </span>
            {description && (
                <span className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</span>
            )}
        </button>
    );
}

/* ── PillGroup: compact single-select for short option lists ────────────── */

interface PillGroupProps<T extends string | number> {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    'aria-label'?: string;
}

export function PillGroup<T extends string | number>({ options, value, onChange, ...rest }: PillGroupProps<T>) {
    return (
        <div role="radiogroup" aria-label={rest['aria-label']} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-9 rounded-full border px-4 text-[13px] font-medium outline-none transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-ring/40',
                            selected
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border/70 bg-background text-muted-foreground hover:border-border hover:text-foreground'
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ── CopyLinkRow: readonly link with copy / WhatsApp actions ────────────── */

export function useClipboard() {
    const [copied, setCopied] = React.useState('');
    const copy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            toast.success('Link copied!');
            setTimeout(() => setCopied(''), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };
    return { copied, copy };
}

export function shareOnWhatsApp(url: string, eventTitle?: string) {
    const text = encodeURIComponent(
        `Hey! 📸 Join and share your photos from *${eventTitle || 'our event'}*:\n${url}\n\nFree, no app needed!`
    );
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const waUrl = isMobile
        ? `whatsapp://send?text=${text}`
        : `https://web.whatsapp.com/send?text=${text}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
}

interface CopyLinkRowProps {
    url: string;
    copyKey: string;
    copied: string;
    onCopy: (url: string, key: string) => void;
    onWhatsApp?: () => void;
}

export function CopyLinkRow({ url, copyKey, copied, onCopy, onWhatsApp }: CopyLinkRowProps) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
                <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                    className={cn(inputWell, 'pl-10 font-mono text-[13px] text-muted-foreground focus:text-foreground')}
                />
            </div>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onCopy(url, copyKey)}
                    className="h-11 flex-1 rounded-xl bg-background px-4 shadow-none sm:flex-none"
                >
                    {copied === copyKey
                        ? <><Check className="size-4" /> Copied</>
                        : <><Copy className="size-4" /> Copy</>}
                </Button>
                {onWhatsApp && (
                    <Button
                        type="button"
                        onClick={onWhatsApp}
                        className="h-11 rounded-xl bg-[#25D366] px-4 text-white shadow-none hover:bg-[#1ebe5d]"
                    >
                        <MessageCircle className="size-4" />
                        <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ── InlineConfirm: soft confirmation callout for risky switches ────────── */

interface InlineConfirmProps {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    tone?: 'warning' | 'danger';
}

export function InlineConfirm({ title, description, confirmLabel, onConfirm, onCancel, tone = 'warning' }: InlineConfirmProps) {
    const danger = tone === 'danger';
    return (
        <div className={cn(
            'rounded-xl border p-4 animate-in fade-in slide-in-from-top-2 duration-200',
            danger
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
        )}>
            <p className={cn(
                'text-sm font-medium',
                danger ? 'text-destructive' : 'text-amber-900 dark:text-amber-300'
            )}>
                {title}
            </p>
            <p className={cn(
                'mt-1 text-[13px] leading-relaxed',
                danger ? 'text-destructive/80' : 'text-amber-800/80 dark:text-amber-300/70'
            )}>
                {description}
            </p>
            <div className="mt-3 flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    onClick={onConfirm}
                    className={cn(
                        'h-9 rounded-lg px-4 shadow-none',
                        danger
                            ? 'bg-destructive text-white hover:bg-destructive/90'
                            : 'bg-amber-600 text-white hover:bg-amber-700'
                    )}
                >
                    {confirmLabel}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onCancel}
                    className="h-9 rounded-lg px-4"
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
