'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardDrive, CheckCircle, AlertCircle, Crown, Calendar, ArrowRight } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { toast } from 'sonner';
import {
  formatStorageSize,
  calculateStoragePercentage,
  formatPrice,
  getStorageStatusColor
} from '@/lib/subscription-utils';
import { getSafeSubscriptionProperty, getSafeUsageProperty } from '@/lib/store';

/**
 * Component for displaying subscription and storage usage information
 */
export function SubscriptionAndStorage() {
  const {
    subscription,
    usage,
    availablePlans,
    isLoadingSubscription,
    isLoadingUsage,
    isLoadingPlans,
    isUpgradingSubscription,
    fetchSubscription,
    fetchUsage,
    fetchAvailablePlans,
    upgradeSubscription,
    hydrated,
    isAuthenticated
  } = useStore();

  // Initialize component
  useEffect(() => {
    // Only fetch subscription and usage data when hydrated and authenticated
    if (hydrated && isAuthenticated) {
      if (!subscription) fetchSubscription();
      if (!usage) fetchUsage();
    }

    // Fetch available plans once on initial load
    if (hydrated && (!Array.isArray(availablePlans) || availablePlans.length === 0) && !fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchAvailablePlans();
    }
  }, [hydrated, isAuthenticated, subscription, usage, availablePlans, fetchSubscription, fetchUsage, fetchAvailablePlans]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string | null>(null);
  const fetchInitiated = useRef(false);

  const handleUpgradeSubscription = async (planId: string) => {
    if (!isAuthenticated) {
      return; // Should not happen as button would be disabled
    }

    try {
      setSelectedPlanForUpgrade(planId);
      const result = await upgradeSubscription(planId);
      if (result.success) {
        toast.success(result.message || "Successfully upgraded your subscription!");

        // Redirect if specified
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upgrade subscription");
    } finally {
      setSelectedPlanForUpgrade(null);
    }
  };

  // Get storage values for the progress bar
  const storageUsed = getSafeUsageProperty(usage, ['totals', 'storage'], 0);
  const maxStorage = getSafeSubscriptionProperty(subscription, ['limits', 'maxStorage'], 1000);

  // Show a loading state
  if ((isLoadingSubscription || isLoadingUsage) && hydrated && isAuthenticated) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Storage & Subscription
          </CardTitle>
          <CardDescription>Loading your subscription and storage information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="animate-pulse bg-muted h-24 w-full rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show unauthenticated state
  if (!isAuthenticated && hydrated) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Storage & Subscription
          </CardTitle>
          <CardDescription>Login to view your subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              You need to log in to view your subscription and storage information.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we have subscription and usage data, show them
  if (subscription && usage && hydrated && isAuthenticated) {
    console.log('Calculating storage with real data:', {
      subscription,
      usage,
      usageTotals: usage.totals,
      storageValue: usage.totals?.storage,
      subscriptionLimits: subscription.limits,
      maxStorageValue: subscription.limits?.maxStorage
    });

    const storagePercentage = calculateStoragePercentage(subscription, usage);
    console.log('Storage percentage calculated:', storagePercentage);
    const statusColor = getStorageStatusColor(storagePercentage);

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Crown className="h-5 w-5 mr-2 text-amber-500" />
            Your {getSafeSubscriptionProperty(subscription, ['planName'], 'Free')} Plan
          </CardTitle>
          <CardDescription>
            {getSafeSubscriptionProperty(subscription, ['status'], 'active') === 'active' ? 'Active subscription' : 'Subscription ends soon'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex justify-between mb-1">
              <span className="font-medium">Storage Usage</span>
              <span className={statusColor}>
                {formatStorageSize(getSafeUsageProperty(usage, ['totals', 'storage'], 0))} of {formatStorageSize(getSafeSubscriptionProperty(subscription, ['limits', 'maxStorage'], 1000))}
              </span>
            </div>
            <ProgressBar value={storagePercentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {storagePercentage >= 90
                ? 'You\'re running low on storage space!'
                : storagePercentage >= 70
                  ? 'Your storage is filling up'
                  : 'You have plenty of storage available'}
            </p>
          </div>

          {/* Plan Features */}
          <div className="space-y-1">
            <p className="font-medium mb-2">Your Plan Features:</p>
            <ul className="space-y-1">
              {/* Storage limits */}
              <li className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                <span>Up to {formatStorageSize(getSafeSubscriptionProperty(subscription, ['limits', 'maxStorage'], 1000))} storage</span>
              </li>

              {/* Event limits */}
              <li className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                <span>Up to {getSafeSubscriptionProperty(subscription, ['limits', 'maxEvents'], 3)} events</span>
              </li>

              {/* Photos per event */}
              <li className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                <span>Up to {getSafeSubscriptionProperty(subscription, ['limits', 'maxPhotosPerEvent'], 50)} photos per event</span>
              </li>

              {/* Max photo size */}
              <li className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                <span>Max photo size: {formatStorageSize(getSafeSubscriptionProperty(subscription, ['limits', 'maxPhotoSize'], 5))}</span>
              </li>

              {/* Features from limits.features array */}
              {Array.isArray(getSafeSubscriptionProperty(subscription, ['limits', 'features'], [])) &&
                getSafeSubscriptionProperty(subscription, ['limits', 'features'], []).map((feature: string, i: number) => (
                  <li key={`limit-feature-${i}`} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))
              }

              {/* Features from top-level features array */}
              {Array.isArray(getSafeSubscriptionProperty(subscription, ['features'], [])) &&
                getSafeSubscriptionProperty(subscription, ['features'], []).map((feature: string, i: number) => (
                  <li key={`feature-${i}`} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))
              }

              {/* Dynamic limits from subscription.limits object */}
              {Object.entries(getSafeSubscriptionProperty(subscription, ['limits'], {})).map(([key, value], i) => {
                // Skip already displayed standard limits and the features array
                if (['maxStorage', 'maxEvents', 'maxPhotosPerEvent', 'maxPhotoSize', 'features'].includes(key)) {
                  return null;
                }

                // Format the key for display (convert camelCase to Title Case With Spaces)
                const formattedKey = key
                  .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                  .replace(/^./, str => str.toUpperCase()); // Capitalize first letter

                return (
                  <li key={`dynamic-limit-${i}`} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span>{formattedKey}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
                  </li>
                );
              }).filter(Boolean)}
            </ul>
          </div>

          {/* Subscription Period */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>
                {getSafeSubscriptionProperty(subscription, ['cancelAtPeriodEnd'], false)
                  ? `Your plan ends on ${formatDate(getSafeSubscriptionProperty(subscription, ['currentPeriodEnd'], ''))}`
                  : `Your plan renews on ${formatDate(getSafeSubscriptionProperty(subscription, ['currentPeriodEnd'], ''))}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm">Manage Subscription</Button>
              {getSafeSubscriptionProperty(subscription, ['canUpgrade'], false) !== false && (
                <Button
                  size="sm"
                  onClick={() => {
                    const nextPlanId = getSafeSubscriptionProperty(subscription, ['nextPlanId'], '');
                    nextPlanId && handleUpgradeSubscription(nextPlanId);
                  }}
                  disabled={!getSafeSubscriptionProperty(subscription, ['nextPlanId'], '') ||
                    selectedPlanForUpgrade === getSafeSubscriptionProperty(subscription, ['nextPlanId'], '')}
                  className="gap-1"
                >
                  {selectedPlanForUpgrade === getSafeSubscriptionProperty(subscription, ['nextPlanId'], '') ? 'Upgrading...' : 'Upgrade Plan'}
                  {selectedPlanForUpgrade !== getSafeSubscriptionProperty(subscription, ['nextPlanId'], '') && <ArrowRight className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default placeholder when no data is available yet but user is authenticated
  if (hydrated && isAuthenticated) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Storage & Subscription
          </CardTitle>
          <CardDescription>Unable to load your subscription data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
            <p className="text-muted-foreground mb-4">
              We couldn't load your subscription or usage information. This could be due to:
            </p>
            <ul className="text-left text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Your subscription hasn't been initialized yet</li>
              <li>• There was an issue communicating with our servers</li>
              <li>• Your session may have expired</li>
            </ul>
            <Button
              onClick={() => {
                fetchSubscription();
                fetchUsage();
                toast.info("Refreshing data...");
              }}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Completely default placeholder when not authenticated and no data
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <HardDrive className="h-5 w-5 mr-2" />
          Storage & Subscription
        </CardTitle>
        <CardDescription>Your storage and subscription information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-muted-foreground">
            No subscription information available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Shows subscription plan options when user clicks "Upgrade Plan"
 */
export function SubscriptionPlanSelector() {
  const {
    availablePlans,
    isLoadingPlans,
    isUpgradingSubscription,
    upgradeSubscription,
    fetchAvailablePlans,
    isAuthenticated,
    hydrated
  } = useStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const fetchInitiated = useRef(false);

  useEffect(() => {
    // Only fetch plans if they're not already loaded and we haven't already fetched
    if (hydrated && (!Array.isArray(availablePlans) || availablePlans.length === 0) && !fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchAvailablePlans();
    }
  }, [hydrated, availablePlans, fetchAvailablePlans]);

  const handleUpgrade = async () => {
    if (!selectedPlanId || !isAuthenticated) return;

    try {
      const result = await upgradeSubscription(selectedPlanId);
      if (result.success) {
        toast.success(result.message || "Successfully upgraded your subscription!");

        // Redirect if specified
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upgrade subscription");
    }
  };

  const handleRefreshPlans = () => {
    // Only fetch if not currently loading
    if (!isLoadingPlans) {
      fetchAvailablePlans();
    }
  };

  if (isLoadingPlans) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Choose Your Plan</CardTitle>
          <CardDescription>Loading available subscription plans...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6 shadow-sm">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
                  <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
                  <div className="h-px bg-muted my-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!availablePlans || !Array.isArray(availablePlans) || availablePlans.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Choose Your Plan</CardTitle>
          <CardDescription>No subscription plans available</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-6">We couldn't find any subscription plans at this time.</p>
          <Button onClick={handleRefreshPlans} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Choose Your Plan</CardTitle>
        <CardDescription>Select the subscription plan that fits your needs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 relative">
          {Array.isArray(availablePlans) ? availablePlans.map((plan) => {
            // Skip invalid plans
            if (!plan || !plan.id) return null;

            return (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 cursor-pointer transition-all shadow-sm hover:shadow-md ${selectedPlanId === plan.id
                    ? 'border-primary ring-1 ring-primary bg-primary/5'
                    : plan.isFeatured ? 'border-primary/20' : ''
                  }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {plan.isFeatured && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-lg">
                    Popular
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-4 pb-3 border-b">
                  <div className="font-medium text-xl mb-1">{plan.name || 'Unnamed Plan'}</div>
                  {plan.description && (
                    <div className="text-sm text-muted-foreground">{plan.description}</div>
                  )}
                  <div className="mt-3 mb-1">
                    <span className="text-3xl font-bold">
                      {typeof plan.price === 'number'
                        ? formatPrice(plan.price, plan.currency)
                        : formatPrice(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/{plan.billingCycle || plan.interval || 'month'}</span>
                  </div>

                  <div className="pt-4 mt-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the div's onClick
                        handleUpgrade();
                      }}
                      disabled={selectedPlanId !== plan.id || !isAuthenticated || isUpgradingSubscription}
                      className="w-full"
                      variant={selectedPlanId === plan.id ? "default" : "outline"}
                    >
                      {isUpgradingSubscription && selectedPlanId === plan.id ? 'Upgrading...' : 'Select Plan'}
                    </Button>
                  </div>
                </div>

                {/* Key Features */}
                <div className="space-y-3">
                  {/* Storage & Events - Most important limits */}
                  <div className="space-y-2">
                    {plan.limits?.maxStorage && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                        <span>{formatStorageSize(plan.limits.maxStorage)} storage</span>
                      </div>
                    )}

                    {plan.limits?.maxEvents && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                        <span>Up to {plan.limits.maxEvents} events</span>
                      </div>
                    )}

                    {plan.limits?.maxPhotosPerEvent && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                        <span>Up to {plan.limits.maxPhotosPerEvent} photos/event</span>
                      </div>
                    )}
                  </div>

                  {/* Main Features */}
                  <div className="space-y-2">
                    {/* Combined features from both sources */}
                    {(() => {
                      // Collect all features from both sources
                      const limitFeatures = plan.limits?.features || [];
                      const planFeatures = Array.isArray(plan.features) ? plan.features : [];
                      const allFeatures = [...new Set([...limitFeatures, ...planFeatures])];

                      return allFeatures.length > 0 ? (
                        allFeatures.slice(0, 4).map((feature, i) => (
                          <div key={`feature-${i}`} className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                          <span className="text-sm">Basic features</span>
                        </div>
                      );
                    })()}

                    {/* Show feature count if more than 4 */}
                    {(() => {
                      const limitFeatures = plan.limits?.features || [];
                      const planFeatures = Array.isArray(plan.features) ? plan.features : [];
                      const allFeatures = [...new Set([...limitFeatures, ...planFeatures])];

                      if (allFeatures.length > 4) {
                        return (
                          <div className="text-sm text-muted-foreground mt-1">
                            + {allFeatures.length - 4} more features
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>


              </div>
            );
          }) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">No subscription plans available.</p>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 rounded-md text-sm mt-4">
            You need to be logged in to upgrade your subscription plan.
          </div>
        )}

      </CardContent>
    </Card>
  );
}
