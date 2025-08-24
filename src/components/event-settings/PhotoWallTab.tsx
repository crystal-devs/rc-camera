// components/event-settings/PhotoWallTab.tsx

import React from 'react';
import { Monitor, Timer, Image, Zap, Users, Eye, EyeOff, Grid, Palette } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

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

export const PhotoWallTab: React.FC<PhotoWallTabProps> = ({
  formData,
  onInputChange
}) => {
  const settings = formData.photowall_settings;
  
  const handleSettingChange = (key: string, value: any) => {
    onInputChange(`photowall_settings.${key}`, value);
  };

  const displayModeOptions = [
    { value: 'slideshow', label: 'Slideshow', icon: Image, description: 'Show photos one at a time with smooth transitions' },
    { value: 'grid', label: 'Grid View', icon: Grid, description: 'Display multiple photos in an organized grid' },
    { value: 'mosaic', label: 'Mosaic Layout', icon: Palette, description: 'Creative mosaic arrangement of photos' }
  ];

  const transitionDurations = [
    { value: 2000, label: '2 seconds' },
    { value: 3000, label: '3 seconds' },
    { value: 5000, label: '5 seconds' },
    { value: 7000, label: '7 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' }
  ];

  const insertionStrategies = [
    { 
      value: 'immediate', 
      label: 'Show Immediately', 
      description: 'New photos appear right away for instant sharing' 
    },
    { 
      value: 'after_current', 
      label: 'After Current Photo', 
      description: 'Queue new photos after the current one (recommended)' 
    },
    { 
      value: 'end_of_queue', 
      label: 'End of Slideshow', 
      description: 'Add new photos to the end of the current queue' 
    },
    { 
      value: 'smart_priority', 
      label: 'Smart Timing', 
      description: 'AI-powered insertion based on photo quality and timing' 
    }
  ];

  return (
    <div className="space-y-12">
      {/* Photo Wall Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-600" />
            Photo Wall Status
          </h3>
          <p className="text-sm text-gray-600">
            Enable or disable the live photo wall display. When active, guests can view photos in real-time on any screen.
          </p>
          {formData.share_token && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <Label className="text-xs font-medium text-blue-700">Photo Wall URL:</Label>
              <div className="text-xs text-blue-600 font-mono bg-white px-2 py-1 rounded mt-1">
                {window.location.origin}/wall/{formData.share_token}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Toggle */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-700">
                Enable Photo Wall
              </Label>
              <p className="text-sm text-gray-500">
                {settings.isEnabled ? 'Photo wall is currently active' : 'Photo wall is currently disabled'}
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) => handleSettingChange('isEnabled', checked)}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Display Mode Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Image className="h-5 w-5 text-purple-600" />
            Display Mode
          </h3>
          <p className="text-sm text-gray-600">
            Choose how photos are displayed on the wall. Each mode offers a different viewing experience for your guests.
          </p>
        </div>

        {/* Right Column - Mode Options */}
        <div className="lg:col-span-2">
          <RadioGroup
            value={settings.displayMode}
            onValueChange={(value) => handleSettingChange('displayMode', value)}
            className="space-y-4"
          >
            {displayModeOptions.map((mode) => {
              const IconComponent = mode.icon;
              return (
                <div key={mode.value} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor={mode.value} className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-gray-600" />
                      {mode.label}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {mode.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Timing Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Timer className="h-5 w-5 text-green-600" />
            Timing & Animation
          </h3>
          <p className="text-sm text-gray-600">
            Control how long photos are displayed and whether the slideshow advances automatically.
          </p>
        </div>

        {/* Right Column - Timing Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Slide Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Photo display duration</Label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {transitionDurations.map((duration) => (
                <Button
                  key={duration.value}
                  variant={settings.transitionDuration === duration.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange('transitionDuration', duration.value)}
                  className="text-xs h-9"
                >
                  {duration.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Auto Advance Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-600" />
                Auto-advance photos
              </Label>
              <p className="text-sm text-gray-500">Automatically move to the next photo after the set duration</p>
            </div>
            <Switch
              checked={settings.autoAdvance}
              onCheckedChange={(checked) => handleSettingChange('autoAdvance', checked)}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Display Options Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-orange-600" />
            Display Options
          </h3>
          <p className="text-sm text-gray-600">
            Customize what information is shown with each photo to create the perfect viewing experience.
          </p>
        </div>

        {/* Right Column - Display Toggles */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                {settings.showUploaderNames ? (
                  <Eye className="h-4 w-4 text-gray-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-600" />
                )}
                Show uploader names
              </Label>
              <p className="text-sm text-gray-500">
                Display who uploaded each photo on the wall
              </p>
            </div>
            <Switch
              checked={settings.showUploaderNames}
              onCheckedChange={(checked) => handleSettingChange('showUploaderNames', checked)}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* New Photos Strategy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            New Photos Strategy
          </h3>
          <p className="text-sm text-gray-600">
            Choose how newly uploaded photos are added to the slideshow. This affects the flow and timing of your photo wall.
          </p>
        </div>

        {/* Right Column - Strategy Options */}
        <div className="lg:col-span-2">
          <RadioGroup
            value={settings.newImageInsertion}
            onValueChange={(value) => handleSettingChange('newImageInsertion', value)}
            className="space-y-4"
          >
            {insertionStrategies.map((strategy) => (
              <div key={strategy.value} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <RadioGroupItem value={strategy.value} id={strategy.value} className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor={strategy.value} className="text-base font-medium cursor-pointer">
                    {strategy.label}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {strategy.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Use "After Current Photo" for smooth transitions without interruption</li>
          <li>• Slideshow mode works best for events with many photos</li>
          <li>• Grid view is perfect for showcasing photo variety</li>
          <li>• 5-7 second duration gives guests enough time to enjoy each photo</li>
        </ul>
      </div>
    </div>
  );
};