// components/SharingTab.tsx
import React, { useState } from 'react';
import { Globe, Users, Lock, Check, Copy, Share2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { EventFormData } from '@/types/events';

interface SharingTabProps {
    formData: EventFormData;
    onInputChange: (field: string, value: any) => void;
}

export const SharingTab: React.FC<SharingTabProps> = ({
    formData,
    onInputChange
}) => {
    const [copiedLink, setCopiedLink] = useState('');

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedLink(type);
            toast.success("Link copied!");
            setTimeout(() => setCopiedLink(''), 2000);
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    const getShareUrl = () => {
        if (!formData.share_token) return '';
        return `${window.location.origin}/join/${formData.share_token}`;
    };

    const getWallUrl = () => {
        if (!formData.co_host_invite_token.token) return '';
        return `${window.location.origin}/wall/${formData.share_token}`;
    };

    return (
        <div className="space-y-12">
            {/* Visibility Settings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Privacy Settings
                    </h3>
                    <p className="text-sm text-gray-600">
                        Choose who can access your event and view photos. This setting affects how people can join and what they can see.
                    </p>
                </div>

                {/* Right Column - Visibility Options */}
                <div className="lg:col-span-2">
                    <RadioGroup
                        value={formData.visibility}
                        onValueChange={(value) => onInputChange('visibility', value)}
                        className="space-y-4"
                    >
                        <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                            <RadioGroupItem value="anyone_with_link" id="anyone_with_link" className="mt-1" />
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="anyone_with_link" className="text-base font-medium cursor-pointer flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-gray-600" />
                                    Anyone with the link
                                </Label>
                                <p className="text-sm text-gray-600">
                                    Great for parties and public events. Share one link and anyone can join.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                            <RadioGroupItem value="invited_only" id="invited_only" className="mt-1" />
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="invited_only" className="text-base font-medium cursor-pointer flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-600" />
                                    Only people I invite
                                </Label>
                                <p className="text-sm text-gray-600">
                                    Perfect for weddings and private gatherings. You control who gets access.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                            <RadioGroupItem value="private" id="private" className="mt-1" />
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="private" className="text-base font-medium cursor-pointer flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-gray-600" />
                                    Just me and my team
                                </Label>
                                <p className="text-sm text-gray-600">
                                    Completely private. Only you and co-hosts can see everything.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            {/* Share Links Section */}
            {(formData.visibility === 'anyone_with_link' || formData.visibility === 'invited_only') && (
                <>
                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Info */}
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-purple-600" />
                                Share Links
                            </h3>
                            <p className="text-sm text-gray-600">
                                Copy these links to share your event with guests. The event link allows joining, while the wall link is for viewing only.
                            </p>
                        </div>

                        {/* Right Column - Share Links */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Event Join Link */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-700">Event join link</Label>
                                    <Badge variant="secondary" className="text-xs">
                                        {formData.visibility === 'anyone_with_link' ? 'Public Link' : 'Invite Only'}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={getShareUrl()}
                                        readOnly
                                        className="font-mono text-sm bg-gray-50 h-11"
                                    />
                                    <Button
                                        onClick={() => copyToClipboard(getShareUrl(), 'join')}
                                        variant="outline"
                                        size="sm"
                                        className="px-3 h-11"
                                    >
                                        {copiedLink === 'join' ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Send this link to guests so they can join and upload photos
                                </p>
                            </div>

                            {/* Wall View Link */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-700">Photo wall link</Label>
                                    <Badge variant="secondary" className="text-xs">
                                        View Only
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={getWallUrl()}
                                        readOnly
                                        className="font-mono text-sm bg-gray-50 h-11"
                                    />
                                    <Button
                                        onClick={() => copyToClipboard(getWallUrl(), 'wall')}
                                        variant="outline"
                                        size="sm"
                                        className="px-3 h-11"
                                    >
                                        {copiedLink === 'wall' ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Share this link for viewing photos without joining the event
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Password Protection Section */}
            {formData.visibility !== 'private' && (
                <>
                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Info */}
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-orange-600" />
                                Additional Security
                            </h3>
                            <p className="text-sm text-gray-600">
                                Add password protection to your event for an extra layer of security. Guests will need this password to access your event.
                            </p>
                        </div>

                        {/* Right Column - Password Settings */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-gray-700">
                                        Password protect this event
                                    </Label>
                                    <p className="text-sm text-gray-500">
                                        Require a password for guests to join
                                    </p>
                                </div>
                                <Switch
                                    checked={!!formData.share_settings?.password}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            onInputChange('share_settings.password', 'temp-password');
                                        } else {
                                            onInputChange('share_settings.password', null);
                                        }
                                    }}
                                />
                            </div>

                            {formData.share_settings?.password && (
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                        Event password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="text"
                                        value={formData.share_settings.password || ''}
                                        onChange={(e) => onInputChange('share_settings.password', e.target.value)}
                                        placeholder="Enter a secure password"
                                        className="h-11"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Choose a password that's easy for your guests to remember but secure
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};