// components/event-settings/EnhancedDesignTab.tsx
import React from 'react';
import { Camera, Upload, X, Palette, Layout, Grid, Type, Zap, Sliders } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// Import all constants from the consolidated file
import { 
  STYLING_CONSTANTS,
  getTemplatePreviewClass,
  getThemePreviewClass,
  getThumbnailPreviewClass,
  getSpacingPreviewClass,
  getStyleOptions
} from '@/constants/styling.constant';

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
  const stylingConfig = formData?.styling_config || {
    cover: { template_id: 1 },
    gallery: { layout_id: 0, grid_spacing: 1, thumbnail_size: 1 },
    theme: { 
      theme_id: 0, 
      fontset_id: 0,
      animations: 1
    },
    advanced: {
      custom_css: '',
      overlay_opacity: 40,
      blur_strength: 0
    }
  };

  const handleStyleChange = (section: string, field: string, value: any) => {
    onInputChange(`styling_config.${section}.${field}`, value);
  };

  // Get style options from constants
  const styleOptions = getStyleOptions();
  const selectedTemplate = STYLING_CONSTANTS.coverTemplates[stylingConfig.cover.template_id] || STYLING_CONSTANTS.coverTemplates[1];

  const TemplatePreview = ({ template, templateId }: { template: any, templateId: number }) => {
    const isSelected = stylingConfig.cover.template_id === templateId;
    
    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleStyleChange('cover', 'template_id', templateId)}
      >
        <CardContent className="p-3">
          <div className={`w-full h-20 rounded mb-2 ${getTemplatePreviewClass(templateId)} relative overflow-hidden`}>
            {template.layout === 'none' ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-400 text-xs font-medium">No Cover</div>
              </div>
            ) : (
              <>
                {/* Text positioning indicator */}
                <div className={`absolute inset-0 flex ${
                  template.textPosition === 'left' ? 'justify-start items-center pl-2' :
                  template.textPosition === 'right' ? 'justify-end items-center pr-2' :
                  'justify-center items-center'
                }`}>
                  <div className="text-xs font-bold text-white bg-black bg-opacity-60 px-2 py-1 rounded">
                    Title
                  </div>
                </div>
                
                {/* Split layout indicator */}
                {template.layout.startsWith('split') && (
                  <div className={`absolute top-0 bottom-0 w-1/2 bg-black bg-opacity-20 ${
                    template.layout === 'split-left' ? 'left-0' : 'right-0'
                  }`} />
                )}
              </>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{template.name}</p>
              {/* {template.height === '100vh' && <Badge variant="outline" className="text-xs">Full</Badge>} */}
              {/* {template.height === '60vh' && <Badge variant="outline" className="text-xs">Hero</Badge>} */}
            </div>
            {/* <p className="text-xs text-gray-500">{template.description}</p> */}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Cover Image Upload */}
      {selectedTemplate.hasImage && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-gray-500" />
              Cover Image
            </h3>
            <p className="text-sm text-gray-600">
              Upload your cover image. This will be displayed according to your selected template.
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
      )}

      {/* Cover Template Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="h-5 w-5 text-gray-500" />
            Cover Template
          </h3>
          <p className="text-sm text-gray-600">
            Choose how your cover section appears. Options include different layouts and heights.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {styleOptions.coverTemplates.map((template) => (
              <TemplatePreview
                key={template.id}
                template={STYLING_CONSTANTS.coverTemplates[template.id]}
                templateId={template.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Grid className="h-5 w-5 text-gray-500" />
            Gallery Layout
          </h3>
          <p className="text-sm text-gray-600">
            Choose how photos are arranged in your gallery.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {styleOptions.galleryLayouts.map((layout) => (
              <Card
                key={layout.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  stylingConfig.gallery.layout_id === layout.id
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleStyleChange('gallery', 'layout_id', layout.id)}
              >
                <CardContent className="p-4">
                  <div className="w-full h-16 rounded mb-3 bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">{layout.icon}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{layout.name}</p>
                    <p className="text-xs text-gray-500">{layout.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Grid Spacing</h3>
          <p className="text-sm text-gray-600">
            Adjust the spacing between photos in your gallery.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {styleOptions.gridSpacing.map((spacing) => (
              <Button
                key={spacing.id}
                type="button"
                variant={stylingConfig.gallery.grid_spacing === spacing.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleStyleChange('gallery', 'grid_spacing', spacing.id)}
                className="h-auto p-3 flex flex-col items-center"
              >
                <div className={`w-8 h-8 grid grid-cols-2 ${spacing.preview} bg-gray-300 rounded mb-1`}>
                  <div className="bg-blue-400 rounded-sm"></div>
                  <div className="bg-blue-400 rounded-sm"></div>
                  <div className="bg-blue-400 rounded-sm"></div>
                  <div className="bg-blue-400 rounded-sm"></div>
                </div>
                <span className="text-xs font-medium">{spacing.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Thumbnail Size */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Thumbnail Size</h3>
          <p className="text-sm text-gray-600">
            Choose the base size for thumbnails in your gallery.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {styleOptions.thumbnailSizes.map((size) => (
              <Button
                key={size.id}
                type="button"
                variant={stylingConfig.gallery.thumbnail_size === size.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleStyleChange('gallery', 'thumbnail_size', size.id)}
                className="h-auto p-3 flex flex-col items-center"
              >
                <div className={`${size.preview} bg-blue-400 rounded mb-2`}></div>
                <span className="text-xs font-medium">{size.name}</span>
                <span className="text-xs opacity-70">{size.description}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-500" />
            Color Theme
          </h3>
          <p className="text-sm text-gray-600">
            Choose a color scheme that matches your event's style and mood.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {styleOptions.themes.map((theme) => (
              <Card
                key={theme.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  stylingConfig.theme.theme_id === theme.id
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleStyleChange('theme', 'theme_id', theme.id)}
              >
                <CardContent className="p-4">
                  <div className={`w-full h-16 rounded mb-3 ${theme.preview} relative overflow-hidden`}>
                    {/* Color swatches */}
                    <div className="absolute inset-0 flex">
                      <div 
                        className="w-1/3 h-full" 
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-1/3 h-full" 
                        style={{ backgroundColor: theme.colors.background }}
                      />
                      <div 
                        className="w-1/3 h-full" 
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{theme.name}</p>
                    <p className="text-xs text-gray-500">{theme.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Type className="h-5 w-5 text-gray-500" />
            Typography
          </h3>
          <p className="text-sm text-gray-600">
            Select font styles for your event's text content.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {styleOptions.fontsets.map((font) => (
              <Card
                key={font.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  stylingConfig.theme.fontset_id === font.id
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleStyleChange('theme', 'fontset_id', font.id)}
              >
                <CardContent className="p-4 text-center">
                  <div 
                    className="text-2xl font-bold mb-2"
                    style={{ fontFamily: font.fonts.primary }}
                  >
                    Aa
                  </div>
                  <div>
                    <p className="font-medium text-sm">{font.name}</p>
                    <p className="text-xs text-gray-500">{font.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};