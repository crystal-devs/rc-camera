// app/wall/[shareToken]/components/SettingsSheet.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    X, 
    Monitor, 
    Grid, 
    Timer, 
    Users, 
    Palette,
    Image,
    Zap,
    Settings as SettingsIcon,
    Eye,
    EyeOff,
    Save,
    Loader2,
    CheckCircle
} from 'lucide-react';
import { PhotoWallSettings } from '@/services/apis/photowall.api';
import { updatePhotoWallSettings } from '@/services/apis/photowall.api';
import { toast } from 'sonner';

interface SettingsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PhotoWallSettings;
    shareToken: string;
    onSettingsChange: (newSettings: PhotoWallSettings) => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
    isOpen,
    onClose,
    settings,
    shareToken,
    onSettingsChange
}) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const updateSetting = (key: keyof PhotoWallSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Get auth token from localStorage or your auth context
            const authToken = localStorage.getItem('authToken') || '';
            
            const response = await updatePhotoWallSettings(shareToken, localSettings, authToken);
            
            if (response.status) {
                onSettingsChange(localSettings);
                setHasChanges(false);
                toast.success('Settings updated successfully');
                onClose();
            } else {
                throw new Error(response.error?.message || 'Failed to update settings');
            }
        } catch (error: any) {
            console.error('Error updating settings:', error);
            toast.error(error.message || 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setLocalSettings(settings);
        setHasChanges(false);
    };

    const displayModeOptions = [
        { value: 'slideshow', label: 'Slideshow', icon: Image, description: 'Show photos one at a time' },
        { value: 'grid', label: 'Grid', icon: Grid, description: 'Display multiple photos in a grid' },
        { value: 'mosaic', label: 'Mosaic', icon: Palette, description: 'Creative mosaic layout' }
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
            label: 'Immediate', 
            description: 'Show new photos right away' 
        },
        { 
            value: 'after_current', 
            label: 'After Current', 
            description: 'Queue after current photo (recommended)' 
        },
        { 
            value: 'end_of_queue', 
            label: 'End of Queue', 
            description: 'Add to the end of slideshow' 
        },
        { 
            value: 'smart_priority', 
            label: 'Smart Priority', 
            description: 'AI-powered insertion timing' 
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Settings Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-96 bg-zinc-900 border-l border-zinc-700 z-50 overflow-y-auto"
                    >
                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <SettingsIcon className="h-5 w-5 text-green-400" />
                                    <h2 className="text-xl font-bold text-white">Display Settings</h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Changes indicator */}
                            {hasChanges && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"
                                >
                                    <p className="text-amber-400 text-sm font-medium">
                                        You have unsaved changes
                                    </p>
                                </motion.div>
                            )}

                            {/* Photo Wall Status */}
                            <Card className="bg-zinc-800 border-zinc-700 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="h-4 w-4 text-green-400" />
                                        <h3 className="font-semibold text-white">Photo Wall Status</h3>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('isEnabled', !localSettings.isEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            localSettings.isEnabled ? 'bg-green-400' : 'bg-zinc-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                localSettings.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400 mt-2">
                                    {localSettings.isEnabled ? 'Photo wall is active' : 'Photo wall is disabled'}
                                </p>
                            </Card>

                            {/* Display Mode */}
                            <Card className="bg-zinc-800 border-zinc-700 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Monitor className="h-4 w-4 text-green-400" />
                                    <h3 className="font-semibold text-white">Display Mode</h3>
                                </div>
                                <div className="space-y-2">
                                    {displayModeOptions.map((mode) => {
                                        const IconComponent = mode.icon;
                                        return (
                                            <button
                                                key={mode.value}
                                                onClick={() => updateSetting('displayMode', mode.value)}
                                                className={`w-full p-3 rounded-lg border transition-all text-left ${
                                                    localSettings.displayMode === mode.value
                                                        ? 'border-green-400 bg-green-400/10 text-green-400'
                                                        : 'border-zinc-600 bg-zinc-700/50 text-slate-300 hover:border-zinc-500'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <IconComponent className="h-4 w-4" />
                                                    <span className="font-medium">{mode.label}</span>
                                                </div>
                                                <p className="text-xs opacity-75">{mode.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Transition Duration */}
                            <Card className="bg-zinc-800 border-zinc-700 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Timer className="h-4 w-4 text-green-400" />
                                    <h3 className="font-semibold text-white">Slide Duration</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {transitionDurations.map((duration) => (
                                        <button
                                            key={duration.value}
                                            onClick={() => updateSetting('transitionDuration', duration.value)}
                                            className={`p-2 rounded-lg border transition-all text-center text-sm ${
                                                localSettings.transitionDuration === duration.value
                                                    ? 'border-green-400 bg-green-400/10 text-green-400'
                                                    : 'border-zinc-600 bg-zinc-700/50 text-slate-300 hover:border-zinc-500'
                                            }`}
                                        >
                                            {duration.label}
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Auto Advance */}
                            <Card className="bg-zinc-800 border-zinc-700 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-green-400" />
                                        <h3 className="font-semibold text-white">Auto Advance</h3>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('autoAdvance', !localSettings.autoAdvance)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            localSettings.autoAdvance ? 'bg-green-400' : 'bg-zinc-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                localSettings.autoAdvance ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400 mt-2">
                                    Automatically advance to the next photo
                                </p>
                            </Card>

                            {/* Show Uploader Names */}
                            <Card className="bg-zinc-800 border-zinc-700 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {localSettings.showUploaderNames ? (
                                            <Eye className="h-4 w-4 text-green-400" />
                                        ) : (
                                            <EyeOff className="h-4 w-4 text-green-400" />
                                        )}
                                        <h3 className="font-semibold text-white">Show Uploader Names</h3>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('showUploaderNames', !localSettings.showUploaderNames)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            localSettings.showUploaderNames ? 'bg-green-400' : 'bg-zinc-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                localSettings.showUploaderNames ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400 mt-2">
                                    Display who uploaded each photo
                                </p>
                            </Card>

                            {/* New Image Insertion Strategy */}
                            <Card className="bg-zinc-800 border-zinc-700 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-green-400" />
                                    <h3 className="font-semibold text-white">New Photo Strategy</h3>
                                </div>
                                <div className="space-y-2">
                                    {insertionStrategies.map((strategy) => (
                                        <button
                                            key={strategy.value}
                                            onClick={() => updateSetting('newImageInsertion', strategy.value)}
                                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                                                localSettings.newImageInsertion === strategy.value
                                                    ? 'border-green-400 bg-green-400/10 text-green-400'
                                                    : 'border-zinc-600 bg-zinc-700/50 text-slate-300 hover:border-zinc-500'
                                            }`}
                                        >
                                            <div className="font-medium mb-1">{strategy.label}</div>
                                            <p className="text-xs opacity-75">{strategy.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={hasChanges ? handleReset : onClose}
                                    variant="outline"
                                    className="flex-1 border-zinc-600 text-slate-300 hover:bg-zinc-700"
                                    disabled={isSaving}
                                >
                                    {hasChanges ? 'Reset' : 'Cancel'}
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasChanges || isSaving}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Settings
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Info */}
                            <div className="text-xs text-slate-500 text-center space-y-1">
                                <p>Press 'S' key to quickly open settings</p>
                                <p>Changes are applied to all viewers in real-time</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};