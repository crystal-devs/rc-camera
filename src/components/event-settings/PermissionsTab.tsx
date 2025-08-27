// components/PermissionsTab.tsx
import React from 'react';
import { Camera, Video, Eye, Settings, Upload, Shield, CheckCircle, Clock } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        Photo Review
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Choose whether to approve photos before they appear.
                    </p>
                    <Badge variant="secondary" className="text-xs w-fit">
                        Content Control
                    </Badge>
                </div>

                {/* Right Column - Review Options */}
                <div className="lg:col-span-2">
                    <RadioGroup
                        value={formData.permissions?.require_approval ? "review_first" : "publish_directly"}
                        onValueChange={(value) => onInputChange('permissions.require_approval', value === "review_first")}
                        className="space-y-3"
                    >
                        <div className="group relative">
                            <div className="flex items-start space-x-4 p-5 rounded-lg border hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 cursor-pointer">
                                <RadioGroupItem value="publish_directly" id="publish_directly" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="publish_directly" className="text-base font-medium cursor-pointer text-foreground">
                                            Auto-publish photos
                                        </Label>
                                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                                            Instant
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-7">
                                        Photos appear instantly when uploaded. Great for trusted groups and casual events!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="group relative">
                            <div className="flex items-start space-x-4 p-5 rounded-lg border hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 cursor-pointer">
                                <RadioGroupItem value="review_first" id="review_first" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="review_first" className="text-base font-medium cursor-pointer text-foreground">
                                            Review before publishing
                                        </Label>
                                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                                            Secure
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-7">
                                        You approve each photo first. Perfect for peace of mind and professional events!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Guest Permissions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        Guest Permissions
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Control what guests can do at your event.
                    </p>
                    <Badge variant="secondary" className="text-xs w-fit">
                        Access Control
                    </Badge>
                </div>

                {/* Right Column - Permission Toggles */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200">
                        <div className="flex items-center gap-4">
                            <Eye className="h-5 w-5 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-foreground">
                                    View photos
                                </Label>
                                <p className="text-sm text-muted-foreground">Let guests browse all the memories</p>
                            </div>
                        </div>
                        <Switch
                            checked={formData.permissions?.can_view}
                            onCheckedChange={(checked) => onInputChange('permissions.can_view', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200">
                        <div className="flex items-center gap-4">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-foreground">
                                    Upload photos
                                </Label>
                                <p className="text-sm text-muted-foreground">Allow guests to add their own shots</p>
                            </div>
                        </div>
                        <Switch
                            checked={formData.permissions?.can_upload}
                            onCheckedChange={(checked) => onInputChange('permissions.can_upload', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200">
                        <div className="flex items-center gap-4">
                            <Camera className="h-5 w-5 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-foreground">
                                    Download photos
                                </Label>
                                <p className="text-sm text-muted-foreground">Let guests save memories to keep forever</p>
                            </div>
                        </div>
                        <Switch
                            checked={formData.permissions?.can_download}
                            onCheckedChange={(checked) => onInputChange('permissions.can_download', checked)}
                        />
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Media Types Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                        Media Types
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Choose what types of content guests can upload.
                    </p>
                    <Badge variant="secondary" className="text-xs w-fit">
                        Content Types
                    </Badge>
                </div>

                {/* Right Column - Media Type Toggles */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200 h-full">
                            <div className="flex items-center gap-4">
                                <Camera className="h-5 w-5 text-muted-foreground" />
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium text-foreground cursor-pointer">
                                        Photos
                                    </Label>
                                    <p className="text-xs text-muted-foreground">JPEG, PNG, HEIC</p>
                                </div>
                            </div>
                            <Switch
                                checked={formData.permissions?.allowed_media_types?.images}
                                onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.images', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200 h-full">
                            <div className="flex items-center gap-4">
                                <Video className="h-5 w-5 text-muted-foreground" />
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium text-foreground cursor-pointer">
                                        Videos
                                    </Label>
                                    <p className="text-xs text-muted-foreground">MP4, MOV, AVI</p>
                                </div>
                            </div>
                            <Switch
                                checked={formData.permissions?.allowed_media_types?.videos}
                                onCheckedChange={(checked) => onInputChange('permissions.allowed_media_types.videos', checked)}
                            />
                        </div>
                    </div>
                    
                    {/* Simplified Pro Tip */}
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">💡 Tip:</span> Videos capture emotions beautifully but use more storage. 
                            Choose based on your event type and needs.
                        </p>
                    </div>
                </div>
            </div>

            {/* Clean Settings Summary */}
            <div className="bg-accent/30 rounded-lg p-5 border">
                <h4 className="text-sm font-medium text-foreground mb-3">
                    Current Configuration
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Review:</span>
                        <div className="font-medium text-foreground">
                            {formData.permissions?.require_approval ? 'Manual' : 'Auto'}
                        </div>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Upload:</span>
                        <div className="font-medium text-foreground">
                            {formData.permissions?.can_upload ? 'Yes' : 'No'}
                        </div>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Media:</span>
                        <div className="font-medium text-foreground">
                            {[
                                formData.permissions?.allowed_media_types?.images && 'Photos',
                                formData.permissions?.allowed_media_types?.videos && 'Videos'
                            ].filter(Boolean).join(' + ') || 'None'}
                        </div>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Download:</span>
                        <div className="font-medium text-foreground">
                            {formData.permissions?.can_download ? 'Yes' : 'No'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};