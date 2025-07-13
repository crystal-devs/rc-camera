import React, { useState, useEffect } from 'react';

import { toast } from 'sonner';
import {
    UsersIcon, LinkIcon, MailIcon, UserPlusIcon, EyeIcon, ShareIcon, RefreshCcwIcon, XIcon, CheckIcon, CopyIcon, ShieldIcon, UserCheckIcon, TrashIcon
} from 'lucide-react';
import {
    createShareToken,
    getEventShareTokens,
    inviteParticipants,
    getEventParticipants,
    updateParticipant,
    removeParticipant,
    ShareToken,
    Participant
} from '@/services/apis/sharing.api';

const ShareManagement = ({ eventId, event, authToken, onClose }: { eventId: string, event: any, authToken: string, onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState('tokens');
    const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
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
                name: email.split('@')[0],
                role: inviteData.role
            }));
            const result = await inviteParticipants(eventId, {
                participants,
                message: inviteData.message,
                sendImmediately: inviteData.sendImmediately,
                defaultRole: inviteData.role
            }, authToken);
            toast.success(`Successfully invited ${result.invited.length} participants`);
            setInviteData({
                emails: [''],
                message: '',
                role: 'guest',
                sendImmediately: true
            });
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

    return (
        <div className="space-y-6">
            {/* Header, Tabs, and all the rest of your ShareManagement JSX goes here */}
        </div>
    );
};

export default ShareManagement;
