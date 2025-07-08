// app/events/[eventId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use } from 'react';
import {
    CalendarIcon,
    MapPinIcon,
    UsersIcon,
    QrCodeIcon,
    ShareIcon,
    CameraIcon,
    FolderIcon,
    SettingsIcon,
    RefreshCcwIcon,
    UserPlusIcon,
    LinkIcon,
    MailIcon,
    CopyIcon,
    CheckIcon,
    XIcon,
    EyeIcon,
    UploadIcon,
    DownloadIcon,
    MessageCircleIcon,
    ShieldIcon,
    ClockIcon,
    UserCheckIcon,
    TrashIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

import PhotoGallery from '@/components/album/PhotoGallery';
import AlbumManagement from '@/components/album/AlbumManagement';
import EventHeader from '@/components/event/EventHeader';
import EventHeaderDetails from '@/components/event/EventDetailsHeader';
import EventCoverSection from '@/components/event/EventCoverSection';
import { getEventById } from '@/services/apis/events.api';
import { fetchEventAlbums } from '@/services/apis/albums.api';
import {
    createShareToken,
    getEventShareTokens,
    inviteParticipants,
    getEventParticipants,
    updateParticipant,
    removeParticipant,
    ShareToken,
    Participant,
    getTokenInfo
} from '@/services/apis/sharing.api';
import { SharedWelcomeBanner } from '@/components/event/SharedWelcomeBanner';

// Share Management Component
const ShareManagement = ({
    eventId,
    event,
    authToken,
    onClose
}: {
    eventId: string;
    event: any;
    authToken: string;
    onClose: () => void;
}) => {
    const [activeTab, setActiveTab] = useState('tokens');
    const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // New Token Creation State
    const [isCreatingToken, setIsCreatingToken] = useState(false);
    const [newTokenData, setNewTokenData] = useState({
        name: '',
        tokenType: 'invite' as 'invite' | 'view_only' | 'collaborate',
        permissions: {
            view: true,
            upload: false,
            download: false,
            share: false,
            comment: true
        },
        restrictions: {
            maxUses: '',
            expiresAt: '',
            requiresApproval: false
        }
    });

    // Participant Invitation State
    const [isInviting, setIsInviting] = useState(false);
    const [inviteData, setInviteData] = useState({
        emails: [''],
        message: '',
        role: 'guest',
        sendImmediately: true
    });

    useEffect(() => {
        loadData();
    }, [eventId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tokensData, participantsData] = await Promise.all([
                getEventShareTokens(eventId, authToken),
                getEventParticipants(eventId, authToken)
            ]);
            setShareTokens(tokensData.tokens);
            setParticipants(participantsData.participants);
        } catch (error) {
            console.error('Error loading share data:', error);
            toast.error('Failed to load sharing data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateToken = async () => {
        if (!newTokenData.name.trim()) {
            toast.error('Please enter a token name');
            return;
        }

        setIsCreatingToken(true);
        try {
            const tokenData = {
                tokenType: newTokenData.tokenType,
                name: newTokenData.name,
                permissions: newTokenData.permissions,
                restrictions: {
                    maxUses: newTokenData.restrictions.maxUses ? parseInt(newTokenData.restrictions.maxUses) : undefined,
                    expiresAt: newTokenData.restrictions.expiresAt ? new Date(newTokenData.restrictions.expiresAt) : undefined,
                    requiresApproval: newTokenData.restrictions.requiresApproval
                }
            };

            const newToken = await createShareToken(eventId, tokenData, authToken);
            setShareTokens(prev => [newToken, ...prev]);

            // Reset form
            setNewTokenData({
                name: '',
                tokenType: 'invite',
                permissions: {
                    view: true,
                    upload: false,
                    download: false,
                    share: false,
                    comment: true
                },
                restrictions: {
                    maxUses: '',
                    expiresAt: '',
                    requiresApproval: false
                }
            });

            toast.success('Share token created successfully');
        } catch (error) {
            console.error('Error creating token:', error);
            toast.error('Failed to create share token');
        } finally {
            setIsCreatingToken(false);
        }
    };

    const handleInviteParticipants = async () => {
        const validEmails = inviteData.emails.filter(email => email.trim() && email.includes('@'));

        if (validEmails.length === 0) {
            toast.error('Please enter at least one valid email address');
            return;
        }

        setIsInviting(true);
        try {
            const participants = validEmails.map(email => ({
                email: email.trim(),
                name: email.split('@')[0], // Use email prefix as default name
                role: inviteData.role
            }));

            const result = await inviteParticipants(eventId, {
                participants,
                message: inviteData.message,
                sendImmediately: inviteData.sendImmediately,
                defaultRole: inviteData.role
            }, authToken);

            toast.success(`Successfully invited ${result.invited.length} participants`);

            // Reset form
            setInviteData({
                emails: [''],
                message: '',
                role: 'guest',
                sendImmediately: true
            });

            // Reload participants
            loadData();
        } catch (error) {
            console.error('Error inviting participants:', error);
            toast.error('Failed to invite participants');
        } finally {
            setIsInviting(false);
        }
    };

    const copyToClipboard = async (text: string, tokenId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedToken(tokenId);
            toast.success('Link copied to clipboard');
            setTimeout(() => setCopiedToken(null), 2000);
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    const addEmailField = () => {
        setInviteData(prev => ({
            ...prev,
            emails: [...prev.emails, '']
        }));
    };

    const removeEmailField = (index: number) => {
        setInviteData(prev => ({
            ...prev,
            emails: prev.emails.filter((_, i) => i !== index)
        }));
    };

    const updateEmail = (index: number, value: string) => {
        setInviteData(prev => ({
            ...prev,
            emails: prev.emails.map((email, i) => i === index ? value : email)
        }));
    };

    console.log(shareTokens, 'shareTokensshareTokensshareTokens')
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Share & Invite</h2>
                    <p className="text-sm text-gray-600">Manage event access and invite guests</p>
                </div>
                <Button variant="outline" onClick={onClose}>
                    <XIcon className="h-4 w-4" />
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tokens">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Share Links
                    </TabsTrigger>
                    <TabsTrigger value="invite">
                        <MailIcon className="h-4 w-4 mr-2" />
                        Invite Guests
                    </TabsTrigger>
                    <TabsTrigger value="participants">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        Participants
                    </TabsTrigger>
                </TabsList>

                {/* Share Links Tab */}
                <TabsContent value="tokens" className="space-y-4">
                    {/* Create New Token */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Create Share Link</CardTitle>
                            <CardDescription>
                                Generate a secure link to share your event
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="token-name">Link Name</Label>
                                    <Input
                                        id="token-name"
                                        value={newTokenData.name}
                                        onChange={(e) => setNewTokenData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Family & Friends Link"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="token-type">Link Type</Label>
                                    <Select
                                        value={newTokenData.tokenType}
                                        onValueChange={(value: any) => setNewTokenData(prev => ({ ...prev, tokenType: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="invite">
                                                <div className="flex items-center">
                                                    <UserPlusIcon className="h-4 w-4 mr-2" />
                                                    Invite - Full access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="view_only">
                                                <div className="flex items-center">
                                                    <EyeIcon className="h-4 w-4 mr-2" />
                                                    View Only - Read access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="collaborate">
                                                <div className="flex items-center">
                                                    <ShareIcon className="h-4 w-4 mr-2" />
                                                    Collaborate - Upload & share
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Permissions */}
                            <div>
                                <Label className="text-sm font-medium">Permissions</Label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                                    {Object.entries(newTokenData.permissions).map(([key, value]) => (
                                        <div key={key} className="flex items-center space-x-2">
                                            <Switch
                                                checked={value}
                                                onCheckedChange={(checked) =>
                                                    setNewTokenData(prev => ({
                                                        ...prev,
                                                        permissions: { ...prev.permissions, [key]: checked }
                                                    }))
                                                }
                                            />
                                            <Label className="text-xs capitalize">{key}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Restrictions */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="max-uses">Max Uses</Label>
                                    <Input
                                        id="max-uses"
                                        type="number"
                                        value={newTokenData.restrictions.maxUses}
                                        onChange={(e) => setNewTokenData(prev => ({
                                            ...prev,
                                            restrictions: { ...prev.restrictions, maxUses: e.target.value }
                                        }))}
                                        placeholder="Unlimited"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expires-at">Expires At</Label>
                                    <Input
                                        id="expires-at"
                                        type="datetime-local"
                                        value={newTokenData.restrictions.expiresAt}
                                        onChange={(e) => setNewTokenData(prev => ({
                                            ...prev,
                                            restrictions: { ...prev.restrictions, expiresAt: e.target.value }
                                        }))}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Switch
                                        checked={newTokenData.restrictions.requiresApproval}
                                        onCheckedChange={(checked) => setNewTokenData(prev => ({
                                            ...prev,
                                            restrictions: { ...prev.restrictions, requiresApproval: checked }
                                        }))}
                                    />
                                    <Label className="text-sm">Require Approval</Label>
                                </div>
                            </div>

                            <Button onClick={handleCreateToken} disabled={isCreatingToken} className="w-full">
                                {isCreatingToken ? (
                                    <>
                                        <RefreshCcwIcon className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="h-4 w-4 mr-2" />
                                        Create Share Link
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Existing Tokens */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Existing Share Links ({shareTokens.length})</h3>
                        {shareTokens.map((token) => (
                            <Card key={token._id}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-medium">{token.name || 'Unnamed Link'}</h4>
                                                <Badge variant={token.revoked ? 'destructive' : 'default'}>
                                                    {token.tokenType}
                                                </Badge>
                                                {token.revoked && <Badge variant="destructive">Revoked</Badge>}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                                <span>Uses: {token.usage.count}</span>
                                                {token.restrictions.maxUses && (
                                                    <span>/ {token.restrictions.maxUses}</span>
                                                )}
                                                {token.restrictions.expiresAt && (
                                                    <span>Expires: {new Date(token.restrictions.expiresAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 mb-3">
                                                {Object.entries(token.permissions).map(([key, enabled]) =>
                                                    enabled && (
                                                        <Badge key={key} variant="outline" className="text-xs">
                                                            {key}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1 truncate">
                                                    {`${window.location.origin}/join/${token.token}`}
                                                </code>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => copyToClipboard(`${window.location.origin}/join/${token.token}`, token.id)}
                                                >
                                                    {copiedToken === token.id ? (
                                                        <CheckIcon className="h-4 w-4" />
                                                    ) : (
                                                        <CopyIcon className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {shareTokens.length === 0 && !isLoading && (
                            <div className="text-center py-8 text-gray-500">
                                <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No share links created yet</p>
                                <p className="text-sm">Create your first share link above</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Invite Guests Tab */}
                <TabsContent value="invite" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Invite Guests by Email</CardTitle>
                            <CardDescription>
                                Send direct invitations to specific people
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Email Fields */}
                            <div>
                                <Label>Email Addresses</Label>
                                {inviteData.emails.map((email, index) => (
                                    <div key={index} className="flex items-center gap-2 mt-2">
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => updateEmail(index, e.target.value)}
                                            placeholder="guest@example.com"
                                            className="flex-1"
                                        />
                                        {inviteData.emails.length > 1 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => removeEmailField(index)}
                                            >
                                                <XIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={addEmailField}
                                    className="mt-2"
                                >
                                    <UserPlusIcon className="h-4 w-4 mr-2" />
                                    Add Another Email
                                </Button>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <Label htmlFor="invite-role">Default Role</Label>
                                <Select
                                    value={inviteData.role}
                                    onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="guest">
                                            <div className="flex items-center">
                                                <UsersIcon className="h-4 w-4 mr-2" />
                                                Guest - Basic access
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="co_host">
                                            <div className="flex items-center">
                                                <ShieldIcon className="h-4 w-4 mr-2" />
                                                Co-host - Management access
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="moderator">
                                            <div className="flex items-center">
                                                <UserCheckIcon className="h-4 w-4 mr-2" />
                                                Moderator - Content moderation
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Custom Message */}
                            <div>
                                <Label htmlFor="invite-message">Custom Message (Optional)</Label>
                                <Textarea
                                    id="invite-message"
                                    value={inviteData.message}
                                    onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Join our event gallery to view and share photos!"
                                    rows={3}
                                />
                            </div>

                            {/* Send Options */}
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={inviteData.sendImmediately}
                                    onCheckedChange={(checked) => setInviteData(prev => ({ ...prev, sendImmediately: checked }))}
                                />
                                <Label className="text-sm">Send invitations immediately</Label>
                            </div>

                            <Button onClick={handleInviteParticipants} disabled={isInviting} className="w-full">
                                {isInviting ? (
                                    <>
                                        <RefreshCcwIcon className="h-4 w-4 mr-2 animate-spin" />
                                        Sending Invitations...
                                    </>
                                ) : (
                                    <>
                                        <MailIcon className="h-4 w-4 mr-2" />
                                        Send Invitations
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Participants Tab */}
                <TabsContent value="participants" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-medium">Event Participants ({participants.length})</h3>
                        <Button size="sm" onClick={loadData}>
                            <RefreshCcwIcon className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {participants.map((participant) => (
                            <Card key={participant.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={participant.identity.avatarUrl} />
                                                <AvatarFallback>
                                                    {participant.identity.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{participant.identity.name}</span>
                                                    <Badge variant={
                                                        participant.participation.status === 'active' ? 'default' :
                                                            participant.participation.status === 'pending' ? 'secondary' :
                                                                'destructive'
                                                    }>
                                                        {participant.participation.status}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {participant.participation.role}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {participant.identity.email}
                                                </div>
                                                {participant.participation.joinedAt && (
                                                    <div className="text-xs text-gray-500">
                                                        Joined: {new Date(participant.participation.joinedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {participant.participation.role !== 'owner' && (
                                                <>
                                                    <Select
                                                        value={participant.participation.role}
                                                        onValueChange={async (newRole) => {
                                                            try {
                                                                await updateParticipant(eventId, participant.id, { role: newRole }, authToken);
                                                                toast.success('Participant role updated');
                                                                loadData();
                                                            } catch (error) {
                                                                toast.error('Failed to update participant role');
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="guest">Guest</SelectItem>
                                                            <SelectItem value="moderator">Moderator</SelectItem>
                                                            <SelectItem value="co_host">Co-host</SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={async () => {
                                                            if (window.confirm('Are you sure you want to remove this participant?')) {
                                                                try {
                                                                    await removeParticipant(eventId, participant.id, 'Removed by host', authToken);
                                                                    toast.success('Participant removed');
                                                                    loadData();
                                                                } catch (error) {
                                                                    toast.error('Failed to remove participant');
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Permissions Display */}
                                    <div className="mt-3 pt-3 border-t">
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(participant.permissions).map(([key, permission]) => {
                                                if (typeof permission === 'object' && permission.enabled) {
                                                    return (
                                                        <Badge key={key} variant="outline" className="text-xs">
                                                            {key}
                                                        </Badge>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {participants.length === 0 && !isLoading && (
                            <div className="text-center py-8 text-gray-500">
                                <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No participants yet</p>
                                <p className="text-sm">Invite guests to see them here</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Main Event Details Page Component
export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('photos');
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [shareSheetOpen, setShareSheetOpen] = useState(false);
    const [defaultAlbumId, setDefaultAlbumId] = useState<string | null>(null);
    const [albums, setAlbums] = useState<any[]>([]);
    const [albumsLoaded, setAlbumsLoaded] = useState(false);

    const isSharedAccess = searchParams.get('via') === 'share';
    const shareToken = searchParams.get('token');
    const showWelcome = searchParams.get('welcome') === 'true';
    const isReturning = searchParams.get('returning') === 'true';
    const status = searchParams.get('status');

    // Authentication
    const [authToken, setAuthToken] = useState<string>('');
    const [sharePermissions, setSharePermissions] = useState(null);
    const [isSharedUser, setIsSharedUser] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || '';
        setAuthToken(token);
    }, []);

    // Add this function inside your component
    const validateShareAccess = async () => {
        if (!isSharedAccess || !shareToken) return;

        try {
            const tokenInfo = await getTokenInfo(shareToken);
            setSharePermissions(tokenInfo.token.permissions);
            setIsSharedUser(true);

            // Store sharing context in localStorage for consistent experience
            localStorage.setItem('shareContext', JSON.stringify({
                token: shareToken,
                permissions: tokenInfo.token.permissions,
                eventId: eventId
            }));
        } catch (error) {
            console.error('Invalid share token:', error);
            // Redirect to join page if token is invalid
            router.push(`/join/${shareToken}`);
        }
    };

    // Call this in useEffect
    useEffect(() => {
        validateShareAccess();
    }, [isSharedAccess, shareToken]);

    // Add an album update function that can be passed to AlbumManagement
    const updateAlbumsList = (newAlbum: any) => {
        console.log(`EventDetailsPage: Updating albums list with new album: ${newAlbum.id}`, newAlbum);

        setAlbums(prevAlbums => {
            // If it's a default album, remove any existing default album
            if (newAlbum.isDefault) {
                const updatedAlbums = [newAlbum, ...prevAlbums.filter(album => !album.isDefault && album.id !== newAlbum.id)];
                console.log(`Updated albums list (default album case): ${updatedAlbums.length} albums`);
                return updatedAlbums;
            }
            // Otherwise, just add it to the top of the list
            const updatedAlbums = [newAlbum, ...prevAlbums.filter(album => album.id !== newAlbum.id)];
            console.log(`Updated albums list: ${updatedAlbums.length} albums`);
            return updatedAlbums;
        });

        // If this is a default album, update the defaultAlbumId
        if (newAlbum.isDefault) {
            console.log(`Setting default album ID to: ${newAlbum.id}`);
            setDefaultAlbumId(newAlbum.id);
        }

        // Ensure we mark albums as loaded
        setAlbumsLoaded(true);
    };

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const token = localStorage.getItem('authToken') || '';
                console.log(`Loading event data for ID: ${eventId}`);

                // Verify token presence
                if (!token) {
                    console.error('No auth token available');
                    toast.error("Authentication required. Please log in to view events.");
                    router.push('/login');
                    return;
                }

                console.log('Attempting to fetch event details from API...');
                const eventData = await getEventById(eventId, token);

                if (eventData) {
                    console.log('Event data fetched successfully:', eventData.name);
                    setEvent(eventData);
                } else {
                    console.error('No event data returned from API');
                    toast.error("Event not found. It may have been deleted or you don't have permission to view it.");
                }
            } catch (error) {
                console.error('Error loading event:', error);

                // More informative error messages based on error type
                if (error instanceof Error) {
                    if (error.message.includes('Network Error') || error.message.includes('connect')) {
                        toast.error(
                            "Network error: Cannot connect to the server. The API server might be down or not running.",
                            { duration: 8000 }
                        );
                    } else if (error.message.includes('401') || error.message.includes('403') ||
                        error.message.includes('Authentication')) {
                        toast.error("Authentication error. Please log in again.", { duration: 5000 });
                        router.push('/login');
                    } else if (error.message.includes('404') || error.message.includes('not found')) {
                        toast.error("Event not found. It may have been deleted or is not accessible.", { duration: 5000 });
                    } else {
                        toast.error(`Error: ${error.message}`, { duration: 5000 });
                    }
                } else {
                    toast.error("Failed to load event details. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadEvent();
    }, [eventId, router]);

    // Load albums when the component mounts or eventId changes
    useEffect(() => {
        const loadAlbums = async () => {
            try {
                setIsLoading(true);
                await refreshAlbums();
            } catch (error) {
                console.error('Error loading albums:', error);
                toast.error("Failed to load albums. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        // Reset state when eventId changes
        setAlbumsLoaded(false);
        setAlbums([]);
        setDefaultAlbumId(null);

        // Always load albums on mount or when eventId changes
        loadAlbums();

    }, [eventId]);

    // Function to manually refresh albums
    const refreshAlbums = async () => {
        console.log(`Manually refreshing albums for event ${eventId}`);
        try {
            if (!eventId) {
                console.error('No eventId provided for refreshAlbums');
                return [];
            }

            const token = localStorage.getItem('authToken') || '';
            if (!token) {
                console.error('No auth token available for refreshAlbums');
                toast.error("Authentication required. Please log in again.");
                router.push('/login');
                return [];
            }

            // First try using the fixed fetchEventAlbums function
            let fetchedAlbums = await fetchEventAlbums(eventId, token);
            console.log(`Fetched ${fetchedAlbums.length} albums in refresh using API`);

            // Sort albums - default album first, then by creation date
            fetchedAlbums.sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            // Find the default album
            const defaultAlbum = fetchedAlbums.find(album => album.isDefault);
            if (defaultAlbum) {
                console.log(`Setting default album to: ${defaultAlbum.id}`);
                setDefaultAlbumId(defaultAlbum.id);
            } else if (fetchedAlbums.length > 0) {
                console.log(`No default album found, using first album: ${fetchedAlbums[0].id}`);
                setDefaultAlbumId(fetchedAlbums[0].id);
            } else {
                console.log('No albums found in refresh, clearing defaultAlbumId');
                setDefaultAlbumId(null);
            }

            setAlbums(fetchedAlbums);
            setAlbumsLoaded(true);

            return fetchedAlbums;
        } catch (error) {
            console.error('Error refreshing albums:', error);

            if (error instanceof Error) {
                toast.error(error.message || "Failed to refresh albums. Please try again.");
            } else {
                toast.error("Failed to refresh albums. Please try again.");
            }
            return [];
        }
    };

    // Quick Share Function
    const quickShare = async () => {
        try {
            if (!authToken) {
                toast.error('Authentication required');
                return;
            }

            // Create a quick share token
            const tokenData = {
                name: 'Quick Share Link',
                tokenType: 'invite' as const,
                permissions: {
                    view: true,
                    upload: true,
                    download: false,
                    share: false,
                    comment: true
                }
            };

            const shareToken = await createShareToken(eventId, tokenData, authToken);
            const shareUrl = `${window.location.origin}/join/${shareToken.token}`;

            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard!');
        } catch (error) {
            console.error('Error creating quick share:', error);
            toast.error('Failed to create share link');
        }
    };

    if (isLoading) {
        return (
            <div className="w-full">
                <Skeleton className="h-64 w-full" />
                <div className="container mx-auto px-4">
                    <Skeleton className="h-8 w-2/3 mt-6 mb-2" />
                    <Skeleton className="h-6 w-1/2 mb-6" />
                    <Skeleton className="h-10 w-full mb-6" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-32 rounded-lg" />
                        <Skeleton className="h-32 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                <p className="text-gray-500 mb-6">
                    The event you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => router.push('/events')}>Back to Events</Button>
            </div>
        );
    }

    return (
        <div className="w-full pb-16 sm:pb-20">
            {/* Sticky Header */}
            <EventHeaderDetails event={event} />

            {/* Cover Image Section */}
            <EventCoverSection event={event} />

            <div className="mx-auto px-2 py-4 sm:px-2 sm:py-2">
                {/* Event Info Section */}
                {/* <SharedWelcomeBanner
                    event={event}
                    status={status}
                    isReturning={isReturning}
                    onDismiss={() => {
                        const newUrl = window.location.pathname + window.location.search.replace('&welcome=true', '').replace('welcome=true&', '').replace('welcome=true', '');
                        window.history.replaceState({}, '', newUrl);
                    }}
                /> */}
                <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        {new Date(event.date).toLocaleDateString()}
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                        <UsersIcon className="h-4 w-4 mr-1.5" />
                        {event.stats?.participants?.total || 0} participants
                    </div>

                    {event.location?.name && (
                        <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-1.5" />
                            {event.location.name}
                        </div>
                    )}
                </div>

                {event.description && (
                    <p className="text-gray-700 mb-4 sm:mb-6">{event.description}</p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    {/* QR Code Dialog */}
                    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <QrCodeIcon className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">QR Code</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share Event</DialogTitle>
                                <DialogDescription>
                                    Scan this QR code or share the link to invite others
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center py-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border">
                                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                                        <span className="text-gray-400">QR Code would appear here</span>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium mb-1">{event.name}</p>
                                    <p className="text-xs text-gray-600">
                                        Share this QR code for quick access
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={quickShare} className="w-full">
                                    <ShareIcon className="h-4 w-4 mr-2" />
                                    Copy Share Link
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Quick Share Button */}
                    <Button variant="outline" size="sm" onClick={quickShare}>
                        <ShareIcon className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Quick Share</span>
                    </Button>

                    {/* Advanced Share Sheet */}
                    <Sheet open={shareSheetOpen} onOpenChange={setShareSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                                <SettingsIcon className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Manage Sharing</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>Share & Invite Management</SheetTitle>
                                <SheetDescription>
                                    Manage event access, create share links, and invite guests
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6">
                                <ShareManagement
                                    eventId={eventId}
                                    event={event}
                                    authToken={authToken}
                                    onClose={() => setShareSheetOpen(false)}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Tabs Section */}
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                        setActiveTab(value);
                    }}
                    className="w-full"
                >
                    <TabsList className="w-full mb-6">
                        <TabsTrigger value="photos" className="flex-1">
                            <CameraIcon className="h-4 w-4 mr-2" />
                            Photos
                        </TabsTrigger>
                        <TabsTrigger value="albums" className="flex-1">
                            <FolderIcon className="h-4 w-4 mr-2" />
                            Albums ({albums.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="photos">
                        <PhotoGallery
                            eventId={eventId}
                            albumId={null}
                            canUpload={true}
                        />
                    </TabsContent>

                    <TabsContent value="albums">
                        <AlbumManagement
                            eventId={eventId}
                            initialAlbums={albums}
                            onAlbumCreated={updateAlbumsList}
                            onRefresh={refreshAlbums}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}