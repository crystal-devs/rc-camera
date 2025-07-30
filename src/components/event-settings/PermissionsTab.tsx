// components/PermissionsTab.tsx
import React from 'react';
import { Camera, Video } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <>
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium">Photo Management</CardTitle>
                    <p className="text-sm text-gray-500">Control how photos are handled in your event</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="text-base font-medium mb-4 block">
                            Would you like to review photos before they appear?
                        </Label>
                        <RadioGroup
                            value={formData.permissions?.require_approval ? "review_first" : "publish_directly"}
                            onValueChange={(value) => onInputChange('permissions.require_approval', value === "review_first")}
                        >
                            <div className="flex items-start space-x-3 p-3 rounded-lg border">
                                <RadioGroupItem value="publish_directly" id="publish_directly" className="mt-1" />
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor="publish_directly" className="text-sm font-medium cursor-pointer">
                                        No, publish photos immediately
                                    </Label>
                                    <p className="text-xs text-gray-500">Photos appear instantly when uploaded</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 rounded-lg border">
                                <RadioGroupItem value="review_first" id="review_first" className="mt-1" />
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor="review_first" className="text-sm font-medium cursor-pointer">
                                        Yes, I'll review photos first
                                    </Label>
                                    <p className="text-xs text-gray-500">You approve each photo before others can see it</p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label className="text-base font-medium mb-4 block">
                            What can guests do?
                        </Label>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <Label className="text-sm font-medium">View photos</Label>
                                    <p className="text-xs text-gray-500">See all approved photos</p>
                                </div>
                                <Switch
                                    checked={formData.permissions?.can_view}
                                    onCheckedChange={(checked) => onInputChange('permissions.can_view', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <Label className="text-sm font-medium">Upload photos</Label>
                                    <p className="text-xs text-gray-500">Add their own photos to the event</p>
                                </div>
                                <Switch
                                    checked={formData.permissions?.can_upload}
                                    onCheckedChange={(checked) => onInputChange('permissions.can_upload', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <Label className="text-sm font-medium">Download photos</Label>
                                    <p className="text-xs text-gray-500">Save photos to their device</p>
                                </div>
                                <Switch
                                    checked={formData.permissions?.can_download}
                                    onCheckedChange={(checked) => onInputChange('permissions.can_download', checked)}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-base font-medium mb-4 block">
                            What can guests upload?
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Camera className="h-4 w-4" />
                                    Photos
                                </Label>
                                <Switch
                                    checked={formData.permissions?.allowed_media_types?.images}
                                    onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.images', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Video className="h-4 w-4" />
                                    Videos
                                </Label>
                                <Switch
                                    checked={formData.permissions?.allowed_media_types?.videos}
                                    onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.videos', checked)}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
};