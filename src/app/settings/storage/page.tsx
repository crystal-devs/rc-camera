'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionAndStorage, SubscriptionPlanSelector } from '@/components/subscription/SubscriptionAndStorage';
import { useStore } from '@/lib/store';
import { LoginPrompt } from '../components/login-prompt';

export default function StorageSettingsPage() {
    const router = useRouter();
    const { hydrated, isAuthenticated } = useStore();

    return (
        <div className="container max-w-4xl mx-auto px-4 py-8">
            {/* Header with improved navigation accessibility */}
            <div className="flex items-center mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="mr-4 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="Go back to settings"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <HardDrive className="h-6 w-6" aria-hidden="true" />
                        Storage & Subscription
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your plan, storage limits, and subscription details.
                    </p>
                </div>
            </div>

            {/* Auth Guard */}
            {hydrated && !isAuthenticated ? (
                <LoginPrompt />
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <section aria-labelledby="current-plan-heading">
                        <h2 id="current-plan-heading" className="sr-only">Current Plan Status</h2>
                        <SubscriptionAndStorage />
                    </section>

                    <section aria-labelledby="available-plans-heading">
                        <h2 id="available-plans-heading" className="text-xl font-semibold mb-4 px-1">Available Plans</h2>
                        <SubscriptionPlanSelector />
                    </section>
                </div>
            )}
        </div>
    );
}
