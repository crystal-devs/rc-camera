import React, { useState, useEffect } from 'react';

import { toast } from 'sonner';
import {
    UsersIcon, LinkIcon, MailIcon, UserPlusIcon, EyeIcon, ShareIcon, RefreshCcwIcon, XIcon, CheckIcon, CopyIcon, ShieldIcon, UserCheckIcon, TrashIcon
} from 'lucide-react';
import {
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
