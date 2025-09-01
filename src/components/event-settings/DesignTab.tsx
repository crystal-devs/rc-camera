// components/event-settings/EnhancedDesignTab.tsx
import React, { useState } from 'react';
import { Camera, Upload, X, Palette, Layout, Type, Image, Grid, Eye, Monitor } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Enhanced constants
const ENHANCED_COVER_TEMPLATES = {
  // Full Screen Templates
  0: {
    name: "Full Screen Center",
    description: "Full-screen image with centered text overlay",
    layout: "fullscreen-center",
    hasImage: true,
    textPosition: "center",
    decorativeElement: "none",
    preview: "bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"
  },
  1: {
    name: "Full Screen Left",
    description: "Full-screen image with left-aligned text",
    layout: "fullscreen-left",
    hasImage: true,
    textPosition: "left",
    decorativeElement: "none",
    preview: "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"
  },
  2: {
    name: "Full Screen Right",
    description: "Full-screen image with right-aligned text",
    layout: "fullscreen-right",
    hasImage: true,
    textPosition: "right",
    decorativeElement: "none",
    preview: "bg-gradient-to-br from-green-600 via-teal-600 to-cyan-600"
  },
  3: {
    name: "Full Screen Top",
    description: "Full-screen image with text at top",
    layout: "fullscreen-top",
    hasImage: true,
    textPosition: "top",
    decorativeElement: "none",
    preview: "bg-gradient-to-b from-indigo-600 via-purple-500 to-pink-500"
  },
  4: {
    name: "Full Screen Bottom",
    description: "Full-screen image with text at bottom",
    layout: "fullscreen-bottom",
    hasImage: true,
    textPosition: "bottom",
    decorativeElement: "none",
    preview: "bg-gradient-to-t from-orange-600 via-red-500 to-pink-500"
  },

  // Decorative Templates
  5: {
    name: "Framed Center",
    description: "Full-screen with white frame border",
    layout: "fullscreen-center",
    hasImage: true,
    textPosition: "center",
    decorativeElement: "frame",
    preview: "bg-gradient-to-br from-emerald-600 to-teal-700 border-4 border-white"
  },
  6: {
    name: "Striped Top",
    description: "Full-screen with decorative top stripe",
    layout: "fullscreen-center",
    hasImage: true,
    textPosition: "center",
    decorativeElement: "stripe",
    preview: "bg-gradient-to-br from-violet-600 to-purple-700 border-t-8 border-yellow-400"
  },
  7: {
    name: "Outlined Text",
    description: "Full-screen with outlined text effect",
    layout: "fullscreen-center",
    hasImage: true,
    textPosition: "center",
    decorativeElement: "outline",
    preview: "bg-gradient-to-br from-rose-600 to-pink-700"
  },
  8: {
    name: "Gradient Overlay",
    description: "Full-screen with gradient overlay",
    layout: "fullscreen-center",
    hasImage: true,
    textPosition: "center",
    decorativeElement: "gradient",
    preview: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
  },

  // Split Layouts
  9: {
    name: "Split Left Image",
    description: "Image on left half, text on right half",
    layout: "split-left",
    hasImage: true,
    textPosition: "right",
    decorativeElement: "none",
    preview: "bg-gradient-to-r from-blue-500 to-transparent"
  },
  10: {
    name: "Split Right Image",
    description: "Text on left half, image on right half",
    layout: "split-right",
    hasImage: true,
    textPosition: "left",
    decorativeElement: "none",
    preview: "bg-gradient-to-l from-purple-500 to-transparent"
  },

  // Text Only Templates
  11: {
    name: "Text Only Center",
    description: "Clean centered title, no background",
    layout: "text-only-center",
    hasImage: false,
    textPosition: "center",
    decorativeElement: "none",
    preview: "bg-gray-50 border-2 border-dashed border-gray-300"
  },
  12: {
    name: "Text Only Left",
    description: "Left-aligned title, minimal style",
    layout: "text-only-left",
    hasImage: false,
    textPosition: "left",
    decorativeElement: "none",
    preview: "bg-gray-50 border-2 border-dashed border-gray-300"
  },
  13: {
    name: "Text Only Right",
    description: "Right-aligned title, clean style",
    layout: "text-only-right",
    hasImage: false,
    textPosition: "right",
    decorativeElement: "none",
    preview: "bg-gray-50 border-2 border-dashed border-gray-300"
  },
  14: {
    name: "Text with Frame",
    description: "Text header with decorative border",
    layout: "text-only-center",
    hasImage: false,
    textPosition: "center",
    decorativeElement: "frame",
    preview: "bg-white border-4 border-gray-800"
  },
  15: {
    name: "Text with Stripe",
    description: "Text header with accent stripe",
    layout: "text-only-center",
    hasImage: false,
    textPosition: "center",
    decorativeElement: "stripe",
    preview: "bg-gray-100 border-t-8 border-blue-500"
  }
};

const TEMPLATE_CATEGORIES = {
  fullscreen: {
    name: "Full Screen",
    description: "Full viewport coverage with image",
    templates: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    icon: "🖼️"
  },
  split: {
    name: "Split Layout",
    description: "Image and text in separate halves",
    templates: [9, 10],
    icon: "⚡"
  },
  textOnly: {
    name: "Text Only",
    description: "Clean headers without images",
    templates: [11, 12, 13, 14, 15],
    icon: "📝"
  }
};

const COVER_TYPES = [
  { id: 0, name: 'Standard', description: 'Normal height (400px)' },
  { id: 1, name: 'Tall', description: 'Increased height (600px)' },
  { id: 2, name: 'Compact', description: 'Reduced height (250px)' },
  { id: 3, name: 'Full Screen', description: 'Full viewport height' },
  { id: 4, name: 'Hero Section', description: 'Large hero style (80vh)' },
  { id: 5, name: 'Text Header', description: 'Minimal header (150px)' }
];

interface EnhancedDesignTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  previewUrl: string | null;
  onCoverImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

export const DesignTab: React.FC<EnhancedDesignTabProps> = ({
  formData,
  onInputChange,
  previewUrl,
  onCoverImageChange,
  onClearImage
}) => {
  const [activeCategory, setActiveCategory] = useState('fullscreen');

  const stylingConfig = formData?.styling_config || {
    cover: { template_id: 0, type: 0 },
    gallery: { layout_id: 1, grid_spacing: 1, thumbnail_size: 1 },
    theme: { theme_id: 8, fontset_id: 0 },
    navigation: { style_id: 0 }
  };

  const handleStyleChange = (section: string, field: string, value: any) => {
    onInputChange(`styling_config.${section}.${field}`, value);
  };

  const currentTemplate = ENHANCED_COVER_TEMPLATES[stylingConfig.cover.template_id as keyof typeof ENHANCED_COVER_TEMPLATES] || ENHANCED_COVER_TEMPLATES[0];

  const TemplatePreview = ({ template, templateId }: { template: any, templateId: number }) => {
    const isSelected = stylingConfig.cover.template_id === templateId;
    
    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleStyleChange('cover', 'template_id', templateId)}
      >
        <CardContent className="p-3">
          {/* Template Preview */}
          <div className={`w-full h-24 rounded mb-3 ${template.preview} relative overflow-hidden`}>
            {/* Show text positioning */}
            <div className={`absolute inset-0 flex ${
              template.textPosition === 'left' ? 'justify-start items-center' :
              template.textPosition === 'right' ? 'justify-end items-center' :
              template.textPosition === 'top' ? 'justify-center items-start pt-2' :
              template.textPosition === 'bottom' ? 'justify-center items-end pb-2' :
              'justify-center items-center'
            }`}>
              <div className={`text-xs font-bold text-white bg-black bg-opacity-50 px-2 py-1 rounded ${
                template.textPosition === 'left' ? 'ml-2' :
                template.textPosition === 'right' ? 'mr-2' : ''
              }`}>
                Title
              </div>
            </div>
            
            {/* Decorative elements */}
            {template.decorativeElement === 'frame' && (
              <div className="absolute inset-2 border-2 border-white border-opacity-80 rounded" />
            )}
            {template.decorativeElement === 'stripe' && (
              <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-400" />
            )}
            
            {/* No image indicator */}
            {!template.hasImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-400 text-xs">No Image</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{template.name}</p>
              {!template.hasImage && <Badge variant="outline" className="text-xs">Text Only</Badge>}
            </div>
            <p className="text-xs text-gray-500">{template.description}</p>
            
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Position: {template.textPosition}</span>
              {template.decorativeElement !== 'none' && (
                <span>• {template.decorativeElement}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Cover Image Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="h-5 w-5 text-gray-500" />
            Cover Image
          </h3>
          <p className="text-sm text-gray-600">
            Upload your cover image. Some templates work without images for text-only headers.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Input
            id="cover_image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onCoverImageChange}
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('cover_image')?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {previewUrl ? 'Change Image' : 'Upload Image'}
            </Button>
            {previewUrl && (
              <Button type="button" variant="outline" onClick={onClearImage} className="px-3">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {previewUrl && (
            <img src={previewUrl} alt="Cover preview" className="w-full h-32 object-cover rounded-lg border" />
          )}
        </div>
      </div>

      {/* Template Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="h-5 w-5 text-gray-500" />
            Cover Templates
          </h3>
          <p className="text-sm text-gray-600">
            Choose how your cover image and text are displayed. Options include full-screen, split layouts, and text-only headers.
          </p>
        </div>

        <div className="lg:col-span-2">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-6">
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <div className="text-center mb-4">
                  <h4 className="text-sm font-medium text-gray-800">{category.name}</h4>
                  <p className="text-xs text-gray-500">{category.description}</p>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.templates.map((templateId) => (
                    <TemplatePreview
                      key={templateId}
                      template={ENHANCED_COVER_TEMPLATES[templateId as keyof typeof ENHANCED_COVER_TEMPLATES]}
                      templateId={templateId}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Cover Height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Cover Height</h3>
          <p className="text-sm text-gray-600">
            Choose the height for your cover section. Full-screen templates will override this setting.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {COVER_TYPES.map((type) => (
              <Button
                key={type.id}
                type="button"
                variant={stylingConfig.cover.type === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleStyleChange('cover', 'type', type.id)}
                className="h-auto p-3 flex flex-col items-start"
              >
                <span className="font-medium text-sm">{type.name}</span>
                <span className="text-xs opacity-70">{type.description}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Selection Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Current Selection</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Template:</span>
            <br />
            <span className="text-blue-600">{currentTemplate.name}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Text Position:</span>
            <br />
            <span className="text-blue-600 capitalize">{currentTemplate.textPosition}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Style:</span>
            <br />
            <span className="text-blue-600">
              {currentTemplate.hasImage ? 'With Image' : 'Text Only'}
              {currentTemplate.decorativeElement !== 'none' && ` • ${currentTemplate.decorativeElement}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};