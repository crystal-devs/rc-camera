// components/event-settings/InvitationManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Users, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sendInvitations, getInvitations, InvitationResponse } from '@/services/apis/events.api';
import { useStore } from '@/lib/store';
import { useToken } from '@/hooks/useToken';

interface InvitationManagerProps {
  eventId: string;
  isVisible: boolean;
}

interface Invitation {
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  sent_at: string;
  expires_at: string;
}

export const InvitationManager: React.FC<InvitationManagerProps> = ({
  eventId,
  isVisible
}) => {
  const [emails, setEmails] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const authToken = useStore(state => state.userData ? useToken() : null);

  // Load existing invitations when component becomes visible
  useEffect(() => {
    if (isVisible && eventId && authToken) {
      loadInvitations();
    }
  }, [isVisible, eventId, authToken]);

  const loadInvitations = async () => {
    if (!authToken) return;

    try {
      setIsLoading(true);
      const response = await getInvitations(eventId, authToken);

      if (response.status && response.data?.invitations) {
        setInvitations(response.data.invitations);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!emails.trim() || !authToken) return;

    // Parse emails (comma or newline separated)
    const emailList = emails
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emailList.length === 0) {
      toast.error('Please enter valid email addresses');
      return;
    }

    try {
      setIsSending(true);

      const invitationData = {
        emails: emailList,
        role: 'guest' as const,
        message: message.trim() || undefined
      };

      const response = await sendInvitations(eventId, invitationData, authToken);

      if (response.status) {
        toast.success(`Invitations sent to ${emailList.length} guest(s)!`);
        setEmails('');
        setMessage('');

        // Reload invitations
        await loadInvitations();
      } else {
        toast.error(response.message || 'Failed to send invitations');
      }
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast.error(error.message || 'Failed to send invitations');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      {/* Send Invitations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Email addresses *</Label>
            <Textarea
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses (one per line or comma-separated)&#10;john@example.com&#10;jane@example.com"
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter multiple emails separated by commas or new lines
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Join me at my event! I'd love to see your photos there."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/200 characters
            </p>
          </div>

          <Button
            onClick={handleSendInvitations}
            disabled={!emails.trim() || isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invitations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Invitation Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invitation Status
            {invitations.length > 0 && (
              <Badge variant="secondary">{invitations.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invitations sent yet</p>
              <p className="text-sm">Send your first invitations above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(invitation.status)}
                    <div>
                      <p className="font-medium text-sm">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Sent {new Date(invitation.sent_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invitation.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};