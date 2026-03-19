// components/event-settings/SharingTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe, Users, Check, Copy, MessageCircle, Lock,
  Eye, EyeOff, Tv2, LinkIcon, Upload, X, TriangleAlert,
  PowerOff, Power, Camera, ArrowRight, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EventFormData } from '@/types/events';
import { InvitationManager } from './InvitationManager';

interface SharingTabProps {
  formData: EventFormData;
  onInputChange: (field: string, value: any) => void;
  eventId?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useClipboard() {
  const [copied, setCopied] = useState('');
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success('Link copied!');
      setTimeout(() => setCopied(''), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };
  return { copied, copy };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shareOnWhatsApp(url: string, eventTitle?: string) {
  const text = encodeURIComponent(
    `Hey! 📸 Join and share your photos from *${eventTitle || 'our event'}*:\n${url}\n\nFree, no app needed!`
  );
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const waUrl = isMobile
    ? `whatsapp://send?text=${text}`
    : `https://web.whatsapp.com/send?text=${text}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ModeCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}

function ModeCard({ selected, onClick, icon, title, subtitle, badge }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col w-full text-left rounded-2xl p-5 transition-all duration-300 outline-none
        ${selected
          ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-900/10 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-white/20'
          : 'bg-white/60 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 hover:shadow-md'
        }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300
          ${selected
            ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700'
          }`}>
          {icon}
        </div>
        <div className={`flex items-center justify-center w-5 h-5 rounded-full ring-1 transition-all
          ${selected
            ? 'bg-emerald-500 ring-emerald-500 scale-100'
            : 'ring-zinc-300 dark:ring-zinc-700 scale-95 group-hover:ring-zinc-400'
          }`}>
          {selected && <Check className="w-3 H-3 text-white" strokeWidth={3} />}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-[15px] tracking-tight">{title}</span>
          {badge && (
            <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${selected ? 'bg-zinc-800 text-zinc-300 dark:bg-zinc-200 dark:text-zinc-600' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
              {badge}
            </span>
          )}
        </div>
        <p className={`text-[13px] leading-relaxed ${selected ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {subtitle}
        </p>
      </div>
    </button>
  );
}

interface LinkRowProps {
  label: string;
  url: string;
  copyKey: string;
  copied: string;
  onCopy: (url: string, key: string) => void;
  onWhatsApp?: () => void;
  badge?: React.ReactNode;
  hint?: string;
  isWall?: boolean;
}

function LinkRow({ label, url, copyKey, copied, onCopy, onWhatsApp, badge, hint, isWall }: LinkRowProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ring-1 ring-inset ${isWall ? 'bg-indigo-50/50 ring-indigo-100 dark:bg-indigo-950/20 dark:ring-indigo-900/30' : 'bg-white/60 dark:bg-zinc-900/40 ring-zinc-200 dark:ring-zinc-800'}`}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold tracking-tight ${isWall ? 'text-indigo-950 dark:text-indigo-200' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</span>
            {badge}
          </div>
          <div className="relative group">
            <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors ${isWall ? 'text-indigo-400' : 'text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-300'}`}>
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              readOnly
              value={url}
              onFocus={e => e.target.select()}
              className={`w-full h-11 pl-10 pr-4 text-[13px] font-mono rounded-xl border-none ring-1 outline-none transition-all
                ${isWall 
                  ? 'bg-white/80 ring-indigo-200 text-indigo-900 focus:ring-indigo-400 focus:bg-white dark:bg-indigo-950/40 dark:ring-indigo-800 dark:text-indigo-300 dark:focus:ring-indigo-600' 
                  : 'bg-zinc-50/50 ring-zinc-200 text-zinc-600 focus:ring-zinc-400 focus:bg-white dark:bg-black/20 dark:ring-zinc-800/80 dark:text-zinc-400 dark:focus:ring-zinc-700 dark:focus:bg-black/40'}`}
            />
          </div>
        </div>
        
        <div className="flex gap-2 isolate pt-2 sm:pt-0">
          <Button 
            type="button" 
            variant="ghost"
            onClick={() => onCopy(url, copyKey)} 
            className={`h-11 px-4 rounded-xl ring-1 transition-all shadow-sm
              ${copied === copyKey 
                ? 'bg-emerald-50 ring-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:ring-emerald-900 dark:text-emerald-500' 
                : isWall 
                  ? 'bg-white ring-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:bg-indigo-950 dark:ring-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900' 
                  : 'bg-white ring-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
          >
            {copied === copyKey ? (
              <><Check className="w-4 h-4 mr-2" /> Copied</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" /> Copy link</>
            )}
          </Button>
          {onWhatsApp && (
            <Button 
              type="button" 
              onClick={onWhatsApp} 
              className="h-11 px-4 rounded-xl text-white shadow-sm ring-1 ring-emerald-600/50 bg-[#25D366] hover:bg-[#1ebe5d] hover:shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">WhatsApp</span>
            </Button>
          )}
        </div>
      </div>
      {hint && (
        <p className={`mt-3 text-[12px] flex items-center gap-1.5 ${isWall ? 'text-indigo-600/80 dark:text-indigo-400/80' : 'text-zinc-500'}`}>
          <ShieldCheck className="w-3.5 h-3.5 opacity-80" /> {hint}
        </p>
      )}
    </div>
  );
}

interface InlineToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
}

function InlineToggle({ checked, onChange, icon, title, description, danger }: InlineToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`group relative w-full flex items-center justify-between p-4 rounded-2xl outline-none transition-all duration-300
        ${checked
          ? danger 
            ? 'bg-red-50/50 ring-1 ring-red-200 dark:bg-red-950/20 dark:ring-red-900/30' 
            : 'bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-800'
          : 'bg-white/60 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 hover:shadow-sm'
        }`}
    >
      <div className="flex items-center gap-4 text-left">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors
          ${checked 
            ? danger ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900' 
            : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-[14px] font-semibold tracking-tight ${checked ? (danger ? 'text-red-900 dark:text-red-300' : 'text-zinc-900 dark:text-white') : 'text-zinc-800 dark:text-zinc-200'}`}>
            {title}
          </p>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {description}
          </p>
        </div>
      </div>
      
      {/* iOS-style pill toggle */}
      <div className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${checked ? (danger ? 'bg-red-500' : 'bg-zinc-900 dark:bg-zinc-200') : 'bg-zinc-200 dark:bg-zinc-700'}`}
      >
        <span className="sr-only">Toggle {title}</span>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
    </button>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[16px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SharingTab: React.FC<SharingTabProps> = ({ formData, onInputChange, eventId }) => {
  const { copied, copy } = useClipboard();
  const [showPin, setShowPin] = useState(false);
  const [pinExpanded, setPinExpanded] = useState(!!formData.share_settings?.password);
  const [pendingMode, setPendingMode] = useState<'anyone_with_link' | 'invited_only' | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const effectiveMode: 'anyone_with_link' | 'invited_only' =
    formData.visibility === 'private' ? 'anyone_with_link' : formData.visibility as any;

  const isEventLive = formData.share_settings?.is_active !== false;
  const uploadsEnabled = (formData.permissions as any)?.can_upload !== false;
  const maxPerGuest = (formData.permissions as any)?.max_photos_per_guest || 0;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseShareUrl = formData.share_token ? `${origin}/join/${formData.share_token}` : '';
  const shareUrl = pinExpanded && formData.share_settings?.password
    ? `${baseShareUrl}?pin=${encodeURIComponent(formData.share_settings.password)}`
    : baseShareUrl;
  const wallUrl = formData.share_token ? `${origin}/wall/${formData.share_token}` : '';

  const handleModeClick = (mode: 'anyone_with_link' | 'invited_only') => {
    if (mode === effectiveMode) return;
    if (effectiveMode === 'anyone_with_link' && mode === 'invited_only') {
      setPendingMode(mode);
    } else {
      onInputChange('visibility', mode);
    }
  };

  const confirmModeSwitch = () => {
    if (pendingMode) {
      onInputChange('visibility', pendingMode);
      setPendingMode(null);
    }
  };

  const handleLiveToggle = (val: boolean) => {
    if (!val) {
      setShowCloseConfirm(true);
    } else {
      onInputChange('share_settings.is_active', true);
    }
  };

  const confirmClose = () => {
    onInputChange('share_settings.is_active', false);
    setShowCloseConfirm(false);
  };

  return (
    <div className="max-w-3xl space-y-12 pb-16">
      
      {/* ── Event Closed Banner ────────────────────────────────────────────── */}
      {!isEventLive && (
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-xl dark:bg-black">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-start gap-4 z-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 shrink-0">
              <PowerOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">This event is currently closed</p>
              <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed max-w-sm">Guests currently see an "Event has ended" screen. Reopen to restore full access and uploading.</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => onInputChange('share_settings.is_active', true)}
            className="z-10 h-11 px-6 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium active:scale-95 transition-transform"
          >
            Reopen Event
          </Button>
        </div>
      )}

      {/* ── Section 1: Access Mode ─────────────────────────────────────────── */}
      <section>
        <SectionHeading 
          title="Access Mode" 
          description="Choose how guests can enter your event. You can lock it down to an invite list at any time."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModeCard
            selected={effectiveMode === 'anyone_with_link'}
            onClick={() => handleModeClick('anyone_with_link')}
            icon={<Globe className="w-5 h-5" />}
            title="Open Access"
            subtitle="Anyone with the link can join instantly. Great for weddings and parties."
            badge="Default"
          />
          <ModeCard
            selected={effectiveMode === 'invited_only'}
            onClick={() => handleModeClick('invited_only')}
            icon={<Users className="w-5 h-5" />}
            title="Invite Only"
            subtitle="Only specific guests can access. They must log in with their email to enter."
            badge="Maximum Privacy"
          />
        </div>

        {/* Warning Callout for Open->Protected */}
        {pendingMode === 'invited_only' && (
          <div className="mt-4 overflow-hidden relative p-5 rounded-2xl ring-1 ring-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:ring-amber-900/40 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full shrink-0">
                  <TriangleAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-amber-900 dark:text-amber-300">Lock out existing link-joiners?</h4>
                  <p className="text-[13px] text-amber-700 dark:text-amber-400/80 mt-1 leading-relaxed">
                    By switching to Invite Only, anyone who joined via the standard open link will lose access immediately, unless their email is explicitly added to the whitelist.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setPendingMode(null)}
                  className="h-10 px-4 rounded-xl border-amber-200 text-amber-700 bg-white hover:bg-amber-50 dark:bg-transparent dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30">
                  Cancel
                </Button>
                <Button type="button" onClick={confirmModeSwitch}
                  className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm border-none shadow-amber-600/20 hover:shadow-amber-600/40 transition-all">
                  Switch to Protected
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2: Link Sharing (If Open) ─────────────────────────────── */}
      {effectiveMode === 'anyone_with_link' && (
        <section className="space-y-4 animate-in fade-in duration-500">
          <SectionHeading 
            title="Guest Link & Security" 
            description="Share this link with your guests. Optionally add a PIN layer."
          />

          <LinkRow
            label="Guest Link"
            url={shareUrl}
            copyKey="join"
            copied={copied}
            onCopy={copy}
            onWhatsApp={() => shareOnWhatsApp(shareUrl, formData.title)}
            badge={
               <Badge variant="outline" className={`font-mono text-[10px] ${pinExpanded ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white dark:bg-zinc-800 text-zinc-600 border-zinc-200 dark:border-zinc-700'}`}>
                 {pinExpanded ? '🔐 PIN Embedded' : '🔓 Unsecured'}
               </Badge>
            }
            hint={pinExpanded ? "Guests who open this link automatically skip the PIN entry." : "Copy and paste this link anywhere to invite guests."}
          />

          <div className="pt-2">
            <InlineToggle
              checked={pinExpanded}
              onChange={(val) => {
                if (val) {
                  setPinExpanded(true);
                } else {
                  onInputChange('share_settings.password', null);
                  setPinExpanded(false);
                }
              }}
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Require a PIN to enter"
              description="A 4+ character password adds a simple layer of security. Embedded automatically into copied links."
            />
          </div>

          {pinExpanded && (
            <div className="px-5 py-4 mt-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800/80 animate-in slide-in-from-top-2 duration-300">
              <Label htmlFor="pin-input" className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">Custom Event PIN code</Label>
              <div className="relative max-w-sm">
                <input
                  id="pin-input"
                  type={showPin ? 'text' : 'password'}
                  value={formData.share_settings?.password || ''}
                  onChange={(e) => onInputChange('share_settings.password', e.target.value || null)}
                  placeholder="e.g. bloom25"
                  autoComplete="new-password"
                  className="w-full h-11 px-4 pr-12 text-[14px] font-mono tracking-wide bg-white dark:bg-zinc-900 border-none ring-1 ring-zinc-300 dark:ring-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all shadow-sm"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-lg"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Section 3: Invited List (If Protected) ────────────────────────── */}
      {effectiveMode === 'invited_only' && eventId && (
        <section className="animate-in fade-in duration-500">
          <SectionHeading 
            title="Guest Invitations" 
            description="Manage your exclusive guest list. Only people added here can view or upload memories."
          />
          <InvitationManager eventId={eventId} isVisible={true} />
        </section>
      )}

      {/* ── Section 4: Live Photowall ────────────────────────────────────── */}
      {formData.share_token && effectiveMode !== ('private' as any) && (
        <section>
          <SectionHeading 
            title="Live Display" 
            description="The 'Live Photowall' creates a dynamic fullscreen slideshow of guest uploads. Perfect for casting via Apple TV or Chromecast."
          />
          <LinkRow
            isWall
            label="Photowall Link"
            url={wallUrl}
            copyKey="wall"
            copied={copied}
            onCopy={copy}
            onWhatsApp={() => shareOnWhatsApp(wallUrl, formData.title)}
            badge={<Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border-none font-semibold text-[10px]">✨ Auto-Updates</Badge>}
            hint="Open this on a large projector, TV or tablet."
          />
        </section>
      )}

      {/* ── Section 5: Experience Controls ───────────────────────────────── */}
      <section>
        <SectionHeading 
          title="Content Controls" 
          description="Manage the flow of incoming photos and videos from guests."
        />
        
        <div className="space-y-4">
          <InlineToggle
            checked={uploadsEnabled}
            onChange={(val) => onInputChange('permissions.can_upload', val)}
            icon={<Camera className="w-5 h-5" />}
            title={uploadsEnabled ? 'Uploads Acceptable' : 'Uploads Paused'}
            description={uploadsEnabled ? 'Guests can select and upload media.' : 'Lock uploads. Existing content remains unaffected.'}
          />

          {uploadsEnabled && (
            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800/80 animate-in slide-in-from-top-2 duration-300 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="max-photos" className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                    Per-Guest Upload Limit
                  </Label>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">Create a "disposable camera" aesthetic by capping submissions.</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                  <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
                    {maxPerGuest === 0 ? 'Unlimited' : `${maxPerGuest} cap`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative max-w-[140px]">
                  <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    id="max-photos"
                    type="number"
                    min="0"
                    max="500"
                    value={maxPerGuest}
                    onChange={(e) => onInputChange('permissions.max_photos_per_guest', parseInt(e.target.value) || 0)}
                    className="w-full h-11 pl-9 pr-3 text-[14px] font-medium bg-white dark:bg-zinc-900 border-none ring-1 ring-zinc-300 dark:ring-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all shadow-sm"
                  />
                </div>
                {maxPerGuest > 0 && (
                  <button type="button" onClick={() => onInputChange('permissions.max_photos_per_guest', 0)}
                    className="h-11 px-4 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2">
                    <X className="w-3.5 h-3.5" /> Remove cap
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 6: Danger Zone ───────────────────────────────────────── */}
      <section className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="mb-4">
          <h3 className="text-[16px] font-semibold tracking-tight text-red-600 dark:text-red-400">Danger Zone</h3>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">Actions that immediately affect all event guests.</p>
        </div>
        
        <div className="space-y-4">
          <InlineToggle
            danger
            checked={!isEventLive}
            onChange={(val) => handleLiveToggle(!val)}
            icon={<PowerOff className="w-5 h-5" />}
            title="Archived (Closed from Public)"
            description="Shuts down the event interface. Photos remain safely in your dashboard for download."
          />

          {showCloseConfirm && (
            <div className="p-5 rounded-2xl ring-1 ring-red-200 bg-red-50 dark:bg-red-950/20 dark:ring-red-900/40 animate-in fade-in slide-in-from-top-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-semibold text-red-900 dark:text-red-300">Confirm Event Closure</h4>
                  <p className="text-[13px] text-red-700 dark:text-red-400/80 mt-1 leading-relaxed">
                    This will instantly replace the event wall with a friendly "Event Ended" screen for all guests. You can still bulk-download photos, and you can undo this toggle later.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setShowCloseConfirm(false)}
                    className="h-10 px-4 rounded-xl border-red-200 text-red-700 bg-white hover:bg-red-50 dark:bg-transparent dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30">
                    Cancel
                  </Button>
                  <Button type="button" onClick={confirmClose}
                    className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm border-none shadow-red-600/20 hover:shadow-red-600/40 transition-all">
                    Archive Event
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};