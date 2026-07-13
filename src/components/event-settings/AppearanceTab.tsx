// components/event-settings/AppearanceTab.tsx
'use client';

import React from 'react';
import { Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { STYLING_CONSTANTS, getStyleOptions } from '@/constants/styling.constant';
import {
    SettingsSection, SettingsCard, Field, PillGroup, ChoiceTile
} from './primitives';
import { cn } from '@/lib/utils';

interface AppearanceTabProps {
    formData: any;
    onInputChange: (field: string, value: any) => void;
    previewUrl: string | null;
    onCoverImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearImage: () => void;
}

/** Abstract, theme-token-based mini preview of a cover template. */
function CoverPreview({ templateId }: { templateId: number }) {
    const template = STYLING_CONSTANTS.coverTemplates[templateId];
    if (!template) return null;

    if (template.layout === 'none') {
        return (
            <span className="mb-3 flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-[10px] font-medium text-muted-foreground">
                No cover
            </span>
        );
    }

    const position = template.textPosition || 'center';
    const isSplit = template.layout.startsWith('split');
    const hasFrame = !!template.overlay || !!template.special;

    return (
        <span className={cn(
            'relative mb-3 flex h-16 w-full overflow-hidden rounded-lg bg-muted',
            hasFrame && 'ring-2 ring-inset ring-background'
        )}>
            {isSplit && (
                <span className={cn(
                    'absolute inset-y-0 w-1/2 bg-muted-foreground/15',
                    template.layout === 'split-left' ? 'left-0' : 'right-0'
                )} />
            )}
            {hasFrame && (
                <span className={cn(
                    'absolute inset-1.5 rounded-sm border border-background/90',
                    template.overlay === 'border-dashed' && 'border-dashed',
                    template.overlay === 'border-double' && 'border-double border-2'
                )} />
            )}
            <span className={cn(
                'absolute inset-0 flex items-center px-2',
                position === 'left' && 'justify-start',
                position === 'right' && 'justify-end',
                position === 'center' && 'justify-center',
                position === 'bottom' && 'items-end justify-start pb-1.5'
            )}>
                <span className="h-2 w-8 rounded-full bg-foreground/60" />
            </span>
        </span>
    );
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
    formData,
    onInputChange,
    previewUrl,
    onCoverImageChange,
    onClearImage
}) => {
    const stylingConfig = formData?.styling_config || {
        cover: { template_id: 1 },
        gallery: { layout_id: 1, grid_spacing: 1, thumbnail_size: 1 },
        theme: { theme_id: 0, fontset_id: 0 }
    };

    const handleStyleChange = (section: string, field: string, value: any) => {
        onInputChange(`styling_config.${section}.${field}`, value);
    };

    const styleOptions = getStyleOptions();
    const selectedTemplate =
        STYLING_CONSTANTS.coverTemplates[stylingConfig.cover.template_id] ||
        STYLING_CONSTANTS.coverTemplates[1];

    return (
        <div className="space-y-10">
            {/* ── Cover ────────────────────────────────────────────────────── */}
            <SettingsSection
                title="Cover"
                description="The first thing guests see. Pick a layout for the cover section and upload a banner image."
            >
                <SettingsCard className="space-y-6">
                    <Field label="Cover layout">
                        <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {styleOptions.coverTemplates.map((template) => (
                                <ChoiceTile
                                    key={template.id}
                                    selected={stylingConfig.cover.template_id === template.id}
                                    onSelect={() => handleStyleChange('cover', 'template_id', template.id)}
                                    title={template.name}
                                    preview={<CoverPreview templateId={template.id} />}
                                    className="p-3"
                                />
                            ))}
                        </div>
                    </Field>

                    {selectedTemplate.hasImage && (
                        <Field label="Cover image" hint="JPEG, PNG or WebP, up to 10MB.">
                            <input
                                id="cover_image"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onCoverImageChange}
                            />
                            {previewUrl ? (
                                <div className="group relative overflow-hidden rounded-xl border border-border/70">
                                    <img
                                        src={previewUrl}
                                        alt="Cover preview"
                                        className="h-36 w-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/50 to-transparent p-3">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => document.getElementById('cover_image')?.click()}
                                            className="h-8 rounded-lg shadow-none"
                                        >
                                            <Upload className="size-3.5" /> Replace
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={onClearImage}
                                            className="h-8 rounded-lg shadow-none"
                                        >
                                            <X className="size-3.5" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('cover_image')?.click()}
                                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background p-4 text-left transition-colors hover:border-muted-foreground/50 hover:bg-muted/30"
                                >
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                                        <Upload className="size-4" />
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        Upload a banner image for your event
                                    </span>
                                </button>
                            )}
                        </Field>
                    )}
                </SettingsCard>
            </SettingsSection>

            {/* ── Gallery ──────────────────────────────────────────────────── */}
            <SettingsSection
                title="Gallery"
                description="How photos are arranged on the event page — layout, density, and thumbnail size."
            >
                <SettingsCard className="space-y-6">
                    <Field label="Layout">
                        <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {styleOptions.galleryLayouts.map((layout) => (
                                <ChoiceTile
                                    key={layout.id}
                                    selected={stylingConfig.gallery.layout_id === layout.id}
                                    onSelect={() => handleStyleChange('gallery', 'layout_id', layout.id)}
                                    title={layout.name}
                                    description={layout.description}
                                    preview={
                                        layout.name === 'Masonry' ? (
                                            <span className="mb-3 grid h-16 w-full grid-cols-3 gap-1">
                                                <span className="flex flex-col gap-1">
                                                    <span className="h-2/3 rounded-sm bg-muted" />
                                                    <span className="flex-1 rounded-sm bg-muted-foreground/25" />
                                                </span>
                                                <span className="flex flex-col gap-1">
                                                    <span className="h-1/3 rounded-sm bg-muted-foreground/25" />
                                                    <span className="flex-1 rounded-sm bg-muted" />
                                                </span>
                                                <span className="flex flex-col gap-1">
                                                    <span className="h-1/2 rounded-sm bg-muted" />
                                                    <span className="flex-1 rounded-sm bg-muted-foreground/25" />
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="mb-3 flex h-16 w-full flex-col gap-1">
                                                <span className="flex flex-1 gap-1">
                                                    <span className="w-2/5 rounded-sm bg-muted" />
                                                    <span className="flex-1 rounded-sm bg-muted-foreground/25" />
                                                    <span className="w-1/4 rounded-sm bg-muted" />
                                                </span>
                                                <span className="flex flex-1 gap-1">
                                                    <span className="w-1/4 rounded-sm bg-muted-foreground/25" />
                                                    <span className="flex-1 rounded-sm bg-muted" />
                                                </span>
                                            </span>
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </Field>

                    <Field label="Photo spacing">
                        <PillGroup
                            aria-label="Photo spacing"
                            options={styleOptions.gridSpacing.map((s) => ({ value: s.id, label: s.name }))}
                            value={stylingConfig.gallery.grid_spacing}
                            onChange={(value) => handleStyleChange('gallery', 'grid_spacing', value)}
                        />
                    </Field>

                    <Field label="Thumbnail size">
                        <PillGroup
                            aria-label="Thumbnail size"
                            options={styleOptions.thumbnailSizes.map((s) => ({ value: s.id, label: s.name }))}
                            value={stylingConfig.gallery.thumbnail_size}
                            onChange={(value) => handleStyleChange('gallery', 'thumbnail_size', value)}
                        />
                    </Field>
                </SettingsCard>
            </SettingsSection>

            {/* ── Theme & typography ───────────────────────────────────────── */}
            <SettingsSection
                title="Theme & typography"
                description="A color palette and font pairing that match the mood of your event."
            >
                <SettingsCard className="space-y-6">
                    <Field label="Color theme">
                        <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {styleOptions.themes.map((theme) => (
                                <ChoiceTile
                                    key={theme.id}
                                    selected={stylingConfig.theme.theme_id === theme.id}
                                    onSelect={() => handleStyleChange('theme', 'theme_id', theme.id)}
                                    title={theme.name}
                                    className="p-3"
                                    preview={
                                        <span
                                            className="mb-3 flex h-10 w-full items-center gap-2 rounded-lg border border-border/50 px-3"
                                            style={{ backgroundColor: theme.colors.background }}
                                        >
                                            <span className="size-4 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                                            <span className="size-4 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                            <span className="h-1.5 flex-1 rounded-full opacity-40" style={{ backgroundColor: theme.colors.text }} />
                                        </span>
                                    }
                                />
                            ))}
                        </div>
                    </Field>

                    <Field label="Fonts">
                        <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {styleOptions.fontsets.map((font) => (
                                <ChoiceTile
                                    key={font.id}
                                    selected={stylingConfig.theme.fontset_id === font.id}
                                    onSelect={() => handleStyleChange('theme', 'fontset_id', font.id)}
                                    title={font.name}
                                    className="p-3"
                                    preview={
                                        <span
                                            className="mb-2 block text-2xl leading-none text-foreground"
                                            style={{ fontFamily: font.fonts.primary }}
                                        >
                                            Aa
                                        </span>
                                    }
                                />
                            ))}
                        </div>
                    </Field>
                </SettingsCard>
            </SettingsSection>
        </div>
    );
};
