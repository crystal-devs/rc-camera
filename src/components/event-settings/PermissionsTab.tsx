// components/PermissionsTab.tsx
import React from 'react';
import { Camera, Video, Eye, Settings, Upload } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { EventFormData } from '@/types/events';

interface PermissionsTabProps {
    formData: EventFormData;
    onInputChange: (field: string, value: any) => void;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({
    formData,
    onInputChange
}) => {
    return (
        <div className="space-y-12">
            {/* Photo Review Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-600" />
                        Photo Review
                    </h3>
                    <p className="text-sm text-gray-600">
                        Decide if you want to approve photos before they go live. Perfect for keeping things family-friendly!
                    </p>
                </div>

                {/* Right Column - Review Options */}
                <div className="lg:col-span-2">
                    <RadioGroup
                        value={formData.permissions?.require_approval ? "review_first" : "publish_directly"}
                        onValueChange={(value) => onInputChange('permissions.require_approval', value === "review_first")}
                        className="space-y-4"
                    >
                        <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                            <RadioGroupItem value="publish_directly" id="publish_directly" className="mt-1" />
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="publish_directly" className="text-base font-medium cursor-pointer">
                                    Auto-publish photos
                                </Label>
                                <p className="text-sm text-gray-600">
                                    Photos appear instantly when uploaded. Great for trusted groups!
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                            <RadioGroupItem value="review_first" id="review_first" className="mt-1" />
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="review_first" className="text-base font-medium cursor-pointer">
                                    Review before publishing
                                </Label>
                                <p className="text-sm text-gray-600">
                                    You approve each photo first. Perfect for peace of mind!
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Guest Permissions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-purple-600" />
                        Guest Permissions
                    </h3>
                    <p className="text-sm text-gray-600">
                        Control what your guests can do. Mix and match these permissions to fit your event perfectly.
                    </p>
                </div>

                {/* Right Column - Permission Toggles */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-gray-600" />
                                View photos
                            </Label>
                            <p className="text-sm text-gray-500">Let guests browse all the memories</p>
                        </div>
                        <Switch
                            checked={formData.permissions?.can_view}
                            onCheckedChange={(checked) => onInputChange('permissions.can_view', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                                <Upload className="h-4 w-4 text-gray-600" />
                                Upload photos
                            </Label>
                            <p className="text-sm text-gray-500">Allow guests to add their own shots</p>
                        </div>
                        <Switch
                            checked={formData.permissions?.can_upload}
                            onCheckedChange={(checked) => onInputChange('permissions.can_upload', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                                <Camera className="h-4 w-4 text-gray-600" />
                                Download photos
                            </Label>
                            <p className="text-sm text-gray-500">Let guests save memories to keep forever</p>
                        </div>
                        <Switch
                            checked={formData.permissions?.can_download}
                            onCheckedChange={(checked) => onInputChange('permissions.can_download', checked)}
                        />
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Media Types Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-green-600" />
                        Media Types
                    </h3>
                    <p className="text-sm text-gray-600">
                        Choose what types of content guests can upload. Photos are always fun, videos capture the full story!
                    </p>
                </div>

                {/* Right Column - Media Type Toggles */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                            <Label className="text-base font-medium text-gray-700 flex items-center gap-2 cursor-pointer">
                                <Camera className="h-5 w-5 text-gray-600" />
                                Photos
                            </Label>
                            <Switch
                                checked={formData.permissions?.allowed_media_types?.images}
                                onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.images', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                            <Label className="text-base font-medium text-gray-700 flex items-center gap-2 cursor-pointer">
                                <Video className="h-5 w-5 text-gray-600" />
                                Videos
                            </Label>
                            <Switch
                                checked={formData.permissions?.allowed_media_types?.videos}
                                onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.videos', checked)}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                        Pro tip: Videos make events come alive, but use more storage space
                    </p>
                </div>
            </div>
        </div>
    );
};