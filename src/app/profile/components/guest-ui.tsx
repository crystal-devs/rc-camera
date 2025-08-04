import React from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogIn, Settings } from 'lucide-react'
import { Calendar } from 'lucide-react'
import { SectionCard } from '@/components/layout/section-card'
import { ActionItem } from './action-item'

export const GuestUI = () => {
    const router = useRouter();
    return (
        <>
            {/* Guest sections */}
            <Card className="p-6 text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-semibold mb-4">Welcome to Rose Click!</h2>
                <p className="text-muted-foreground mb-6">
                  Login to create events, upload photos, and access your personal profile.
                </p>
                <div className="flex flex-col space-y-3">
                  <Button
                    onClick={() => {
                      localStorage.setItem('redirectAfterLogin', window.location.pathname);
                      router.push('/login');
                    }}
                    className="gap-2 mx-auto"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/events')}
                    className="gap-2 mx-auto"
                  >
                    <Calendar className="h-4 w-4" />
                    Browse Events
                  </Button>
                </div>
              </div>
            </Card>

            {/* Public settings access */}
            <SectionCard title="Settings" icon={<Settings className="h-5 w-5" />}>
              <div className="space-y-2">
                <ActionItem
                  label="App Settings"
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => router.push('/settings')}
                  highlight={true}
                />
              </div>
            </SectionCard>
          </>
    )
}
