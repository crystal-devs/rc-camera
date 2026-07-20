// components/event-settings/InvitationManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { 
  sendInvitations, 
  getInvitations, 
  InvitationResponse 
} from '@/services/apis/events.api';
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
        toast.success(`Access granted to ${emailList.length} guest(s)!`);
        setEmails('');
        setMessage('');
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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'accepted':
        return {
          icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-900',
          label: 'Accepted'
        };
      case 'declined':
        return {
          icon: <XCircle className="w-4 h-4 text-red-500" />,
          badgeClass: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900',
          label: 'Declined'
        };
      case 'pending':
      default:
        return {
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-900',
          label: 'Pending'
        };
    }
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      
      {/* ── Add Guests Section ────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/20 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Invite New Guests</h4>
        </div>
        
        <div className="space-y-4">
          <div className="group relative rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:focus-within:ring-indigo-500/50 transition-all shadow-sm">
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Paste email addresses here (comma or newline separated)..."
              rows={3}
              className="w-full bg-transparent p-4 text-[14px] outline-none resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 disabled:opacity-50"
              disabled={isSending}
            />
            {emails.trim() && (
              <div className="absolute bottom-3 right-3 animate-in fade-in zoom-in-95">
                <button
                  onClick={handleSendInvitations}
                  disabled={isSending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-[13px] shadow disabled:opacity-50 transition-colors"
                >
                  {isSending ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSending ? 'Sending...' : 'Grant Access'}
                </button>
              </div>
            )}
          </div>
          <div className="text-[12px] flex items-center gap-2 text-zinc-500 dark:text-zinc-500 font-medium">
             <ChevronRight className="w-3.5 h-3.5" /> This directly whitelists the email. Guests must sign in with this exact email to gain access.
          </div>
        </div>
      </div>

      {/* ── Active Invitations List ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" />
            <h4 className="text-[14px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-300">Whitelist Access Roster</h4>
          </div>
          <div className="flex h-6 items-center rounded-full bg-zinc-100 px-2.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {invitations.length} Total
          </div>
        </div>

        <div className="rounded-2xl ring-1 ring-inset ring-zinc-200/60 dark:ring-zinc-800/60 overflow-hidden bg-white/50 dark:bg-zinc-900/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              <Clock className="w-5 h-5 animate-spin mr-3" />
              <span className="text-[13px] font-medium">Fetching roster...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-300 mb-1">Your roster is empty</p>
              <p className="text-[13px] text-zinc-500">Paste some emails above to start granting secure access.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {invitations.map((inv, idx) => {
                const status = getStatusDisplay(inv.status);
                return (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-zinc-700 ring-1 ring-zinc-200 dark:ring-zinc-700/50 transition-colors">
                        {status.icon}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{inv.email}</p>
                        <p className="text-[12px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                          Added {new Date(inv.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset ${status.badgeClass}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};