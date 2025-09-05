import { SectionCard } from '@/components/layout/section-card'
import { Bell, Download, HardDrive, Image, LogIn, LogOut, Settings, Share, Shield, User } from 'lucide-react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ActionItem } from './action-item'

export const GeneralProfileSettings = () => {
    const router = useRouter();
    return (
        <SectionCard title="Settings" icon={<Settings className="h-5 w-5" />}>
            <div className="space-y-2">
                <ActionItem
                    label="App Settings"
                    icon={<Settings className="h-4 w-4" />}
                    onClick={() => router.push('/settings')}
                    highlight={true}
                />
                <ActionItem
                    label="Account Settings"
                    icon={<User className="h-4 w-4" />}
                    onClick={() => router.push('/settings/account')}
                />
                <ActionItem
                    label="Privacy & Security"
                    icon={<Shield className="h-4 w-4" />}
                    onClick={() => router.push('/settings/privacy')}
                />
                <ActionItem
                    label="Notifications"
                    icon={<Bell className="h-4 w-4" />}
                    onClick={() => router.push('/settings/notifications')}
                />
                <ActionItem
                    label="Download my data"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => router.push('/settings/download')}
                />
            </div>
        </SectionCard>
    )
}
