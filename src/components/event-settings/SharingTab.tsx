// components/SharingTab.tsx
import React, { useState } from 'react';
import { Globe, Users, Lock, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <>
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium">Who can access your event?</CardTitle>
                    <p className="text-sm text-gray-500">Choose how people can join and view photos</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup
                        value={formData.visibility}
                        onValueChange={(value) => onInputChange('visibility', value)}
                    >
                        <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-green-100 bg-green-50/30">
                            <RadioGroupItem value="anyone_with_link" id="anyone_with_link" className="mt-1" />
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="anyone_with_link" className="text-base font-medium cursor-pointer flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-green-600" />
                                    Anyone with the link
                                </Label>
                                <p className="text-sm">Great for parties and public events. Share one link and anyone can join.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-blue-100 bg-blue-50/30">
                            <RadioGroupItem value="invited_only" id="invited_only" className="mt-1" />
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="invited_only" className="text-base font-medium cursor-pointer flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    Only people I invite
                                </Label>
                                <p className="text-sm">Perfect for weddings and private gatherings. You control who gets access.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 bg-gray-50/50">
                            <RadioGroupItem value="private" id="private" className="mt-1" />
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="private" className="text-base font-medium cursor-pointer flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Just me and my team
                                </Label>
                                <p className="text-sm">Completely private. Only you and co-hosts can see everything.</p>
                            </div>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Share Links */}
            {(formData.visibility === 'anyone_with_link' || formData.visibility === 'invited_only') && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-medium">Share your event</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-muted-foreground">Event link</Label>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                    {formData.visibility === 'anyone_with_link' ? 'Public Link' : 'Invite Only'}
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={getShareUrl()}
                                    readOnly
                                    className="font-mono text-sm bg-gray-50"
                                />
                                <Button
                                    onClick={() => copyToClipboard(getShareUrl(), 'guest')}
                                    variant="outline"
                                    size="sm"
                                >
                                    {copiedLink === 'guest' ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Send this link to guests so they can view and upload photos
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-muted-foreground">Event link</Label>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                    {formData.visibility === 'anyone_with_link' ? 'Public Link' : 'Invite Only'}
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={getWallUrl()}
                                    readOnly
                                    className="font-mono text-sm bg-gray-50"
                                />
                                <Button
                                    onClick={() => copyToClipboard(getWallUrl(), 'guest')}
                                    variant="outline"
                                    size="sm"
                                >
                                    {copiedLink === 'guest' ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Send this link to guests so they can view and upload photos
                            </p>
                        </div>


                    </CardContent>
                </Card>
            )}
            {/* Password Protection */}
            {formData.visibility !== 'private' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-medium">Additional Security</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Password protect this event
                                </Label>
                                <p className="text-xs text-gray-500">Add an extra layer of security</p>
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
                                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                                    Event password
                                </Label>
                                <Input
                                    id="password"
                                    type="text"
                                    value={formData.share_settings.password || ''}
                                    onChange={(e) => onInputChange('share_settings.password', e.target.value)}
                                    placeholder="Enter password"
                                    className="h-10"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
};