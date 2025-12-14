import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE_URL } from './api-config';
import { apiClient } from './api-client';
import { API_ROUTES } from './api-routes';

export interface UserData {
    id?: string;
    name: string;
    email: string;
    avatar?: string;
    provider?: string;
    country_code?: string;
    subscriptionId?: string;
    stripeCustomerId?: string;
    preferences?: {
        emailNotifications: boolean;
        defaultEventPrivacy: string;
    };
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string;
}

export interface SubscriptionPlan {
    // Core plan identifiers
    id: string;
    _id?: string;
    planId?: string;
    name: string;

    // Pricing information
    price: number;
    currency?: string;
    interval: string;
    billingCycle?: string;
    stripePriceId?: string | null;
    trialDays?: number;

    // Plan metadata
    description?: string;
    features: string[];
    isActive?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
    isPublic?: boolean;
    isDefault?: boolean;
    imageUrl?: string;
    color?: string;

    // Timestamps
    createdAt?: string;
    updatedAt?: string;

    // Technical identifiers
    slug?: string;
    type?: string;

    // Detailed limits
    limits?: {
        maxEvents?: number;
        maxPhotosPerEvent?: number;
        maxStorage?: number;
        maxPhotoSize?: number;
        maxUsers?: number;
        maxProjects?: number;
        maxTeamMembers?: number;
        maxIntegrations?: number;
        maxExports?: number;
        features?: string[];
        allowAiGeneration?: boolean;
        allowVideoUploads?: boolean;
        allowPremiumSupport?: boolean;
        allowCustomDomain?: boolean;
        allowAdvancedAnalytics?: boolean;
        [key: string]: any; // Allow any other limit properties
    };

    // Relations
    nextPlanId?: string;
    previousPlanId?: string;

    // Additional metadata
    metadata?: Record<string, any>;
    [key: string]: any; // Allow any other properties from the API
}

export interface UserSubscription {
    id: string;
    userId: string;
    planId: string;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    planName?: string; // Denormalized plan name for display
    limits: {
        maxEvents: number;
        maxPhotosPerEvent: number;
        maxStorage: number; // in MB
        maxPhotoSize: number; // in MB
        features: string[];
    };
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
    // Next plan recommended for upgrade
    nextPlanId?: string;
    nextPlanName?: string;
    canUpgrade: boolean;
}

export interface UserUsage {
    userId: string;
    date: string;
    metrics: {
        photosUploaded: number;
        storageUsed: number; // in MB
        eventsCreated: number;
        activeEvents: string[];
    };
    totals: {
        photos: number;
        storage: number; // in MB
        events: number;
    };
}

interface SettingsState {
    theme: 'light' | 'dark' | 'system';
    requireAuthForSettings: boolean;
    privateProfile: boolean;
    autoSave: boolean;
    isAuthenticated: boolean;
    userData: UserData | null;
    hydrated: boolean; // Track if the store has been hydrated from localStorage
    subscription: UserSubscription | null;
    usage: UserUsage | null;
    availablePlans: SubscriptionPlan[];
    isLoadingUserData: boolean;
    isLoadingSubscription: boolean;
    isLoadingUsage: boolean;
    isLoadingPlans: boolean;
    isUpgradingSubscription: boolean;
}

interface SettingsActions {
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setRequireAuthForSettings: (require: boolean) => void;
    setPrivateProfile: (isPrivate: boolean) => void;
    setAutoSave: (autoSave: boolean) => void;
    setUserData: (userData: UserData | null) => void;
    setAuthenticated: (isAuthenticated: boolean) => void;
    setHydrated: (hydrated: boolean) => void;
    setSubscription: (subscription: UserSubscription | null) => void;
    setUsage: (usage: UserUsage | null) => void;
    setAvailablePlans: (plans: SubscriptionPlan[]) => void;
    setLoadingUserData: (isLoading: boolean) => void;
    setLoadingSubscription: (isLoading: boolean) => void;
    setLoadingUsage: (isLoading: boolean) => void;
    setLoadingPlans: (isLoading: boolean) => void;
    setUpgradingSubscription: (isUpgrading: boolean) => void;
    fetchUserData: () => Promise<void>;
    fetchSubscription: () => Promise<void>;
    fetchUsage: () => Promise<void>;
    fetchAvailablePlans: () => Promise<void>;
    upgradeSubscription: (planId: string) => Promise<{ success: boolean; message: string; redirectUrl?: string }>;
    logout: () => void;
    login: (userData: Record<string, any>) => void;
}

// Helper function to safely access localStorage (avoids SSR issues)
const getLocalStorageValue = (key: string): string | null => {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
    }
    return null;
};


// Helper functions for safely accessing subscription and usage properties
export const getSafeSubscriptionProperty = <T>(
    subscription: UserSubscription | null,
    path: string[],
    defaultValue: T
): T => {
    if (!subscription) return defaultValue;

    let value: any = subscription;
    for (const key of path) {
        if (value === undefined || value === null) return defaultValue;
        value = value[key];
    }

    return value === undefined || value === null ? defaultValue : value;
};

export const getSafeUsageProperty = <T>(
    usage: UserUsage | null,
    path: string[],
    defaultValue: T
): T => {
    if (!usage) return defaultValue;

    let value: any = usage;
    for (const key of path) {
        if (value === undefined || value === null) return defaultValue;
        value = value[key];
    }

    return value === undefined || value === null ? defaultValue : value;
};


// Helper function to safely set localStorage values
const setLocalStorageValue = (key: string, value: string): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
    }
};

// Helper function to safely remove localStorage values
const removeLocalStorageValue = (key: string): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
    }
};

// API base URL - adjust this to your actual API endpoint

// Helper function to get auth token
export const getAuthToken = (): string | null => {
    const tokensStr = getLocalStorageValue('rc-tokens');
    if (!tokensStr) return null;

    try {
        const tokens = JSON.parse(tokensStr);
        return tokens.accessToken || null;
    } catch {
        return null;
    }
};

// Helper function to get user data from localStorage
const getUserDataFromStorage = (): UserData | null => {
    const userDataStr = getLocalStorageValue('userData');
    if (!userDataStr) return null;

    try {
        return JSON.parse(userDataStr);
    } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
        return null;
    }
};

// Create store with persist middleware to save state to localStorage
export const useStore = create<SettingsState & SettingsActions>()(
    persist(
        (set, get) => ({
            // Initial state
            theme: 'system',
            requireAuthForSettings: true,
            privateProfile: false,
            autoSave: true,
            isAuthenticated: false,
            userData: null,
            hydrated: false,
            subscription: null,
            usage: null,
            availablePlans: [],
            isLoadingUserData: false,
            isLoadingSubscription: false,
            isLoadingUsage: false,
            isLoadingPlans: false,
            isUpgradingSubscription: false,

            // Actions
            setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),
            setRequireAuthForSettings: (requireAuthForSettings: boolean) => set({ requireAuthForSettings }),
            setPrivateProfile: (privateProfile: boolean) => set({ privateProfile }),
            setAutoSave: (autoSave: boolean) => set({ autoSave }),
            setUserData: (userData: UserData | null) => {
                set({ userData });
                // Store user data in localStorage separately for auth checks
                if (userData) {
                    setLocalStorageValue('userData', JSON.stringify(userData));
                } else {
                    removeLocalStorageValue('userData');
                }
            },
            setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
            setHydrated: (hydrated: boolean) => set({ hydrated }),
            setSubscription: (subscription: UserSubscription | null) => set({ subscription }),
            setUsage: (usage: UserUsage | null) => set({ usage }),
            setAvailablePlans: (plans: SubscriptionPlan[]) => set({ availablePlans: plans }),
            setLoadingUserData: (isLoading: boolean) => set({ isLoadingUserData: isLoading }),
            setLoadingSubscription: (isLoading: boolean) => set({ isLoadingSubscription: isLoading }),
            setLoadingUsage: (isLoading: boolean) => set({ isLoadingUsage: isLoading }),
            setLoadingPlans: (isLoading: boolean) => set({ isLoadingPlans: isLoading }),
            setUpgradingSubscription: (isUpgrading: boolean) => set({ isUpgradingSubscription: isUpgrading }),

            fetchUserData: async () => {
                const state = get();
                if (!state.isAuthenticated) return;

                set({ isLoadingUserData: true });
                try {
                    // Use apiClient which handles Authorization header automatically
                    const response = await apiClient.get<UserData>(API_ROUTES.USERS.PROFILE);

                    if (response.status === 200 && response.data.status) {
                        const userData = response.data.data; // generic wrapper usually puts actual data in .data
                        console.log('User data fetched:', userData);

                        set({ userData });
                        setLocalStorageValue('userData', JSON.stringify(userData));
                    } else {
                        console.error('Failed to fetch user data:', response.data.message);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                } finally {
                    set({ isLoadingUserData: false });
                }
            },

            fetchSubscription: async () => {
                const state = get();
                if (!state.isAuthenticated) {
                    console.log('fetchSubscription: Not authenticated, skipping');
                    set({ subscription: null });
                    return;
                }

                set({ isLoadingSubscription: true });
                // Note: API_ROUTES.USERS.SUBSCRIPTION is '/user/subscription'
                const endpoint = API_ROUTES.USERS.SUBSCRIPTION;

                try {
                    const response = await apiClient.get<any>(endpoint);

                    if (response.status === 200) {
                        const responseData = response.data;

                        // Handle nested structure
                        let subscription = null;
                        if (responseData.status === true && responseData.data && typeof responseData.data === 'object') {
                            subscription = responseData.data;
                        } else {
                            subscription = responseData;
                        }

                        // Validate subscription object
                        if (subscription && (subscription.id || subscription._id)) {
                            // Ensure backward compatibility with MongoDB _id field
                            if (subscription._id && !subscription.id) {
                                subscription.id = subscription._id;
                            }

                            // Ensure limits object exists
                            if (!subscription.limits) {
                                subscription.limits = {
                                    maxEvents: 3,
                                    maxPhotosPerEvent: 50,
                                    maxStorage: 100,
                                    maxPhotoSize: 5,
                                    features: []
                                };
                            }

                            set({ subscription });
                        } else {
                            set({ subscription: null });
                        }
                    } else {
                        console.warn('Failed to fetch subscription', response.status);
                        set({ subscription: null });
                    }
                } catch (error) {
                    console.error('Error fetching subscription:', error);
                    set({ subscription: null });
                } finally {
                    set({ isLoadingSubscription: false });
                }
            },

            fetchUsage: async () => {
                const state = get();
                if (!state.isAuthenticated) {
                    console.log('fetchUsage: Not authenticated, skipping');
                    set({ usage: null });
                    return;
                }

                set({ isLoadingUsage: true });
                const endpoint = '/user/usage'; // Manually defined as it is missing in API_ROUTES for now

                try {
                    const response = await apiClient.get<any>(endpoint);

                    if (response.status === 200) {
                        const responseData = response.data;

                        // Handle nested structure
                        let usage = null;
                        if (responseData.status === true && responseData.data && typeof responseData.data === 'object') {
                            usage = responseData.data;
                        } else {
                            usage = responseData;
                        }

                        // Validate usage object
                        if (usage && (usage.userId || usage._id)) {
                            // Handle MongoDB _id if it exists
                            if (usage._id && !usage.userId) {
                                usage.userId = usage._id;
                            }

                            // Ensure metrics and totals objects exist
                            if (!usage.metrics) {
                                usage.metrics = {
                                    photosUploaded: 0,
                                    storageUsed: 0,
                                    eventsCreated: 0,
                                    activeEvents: []
                                };
                            }

                            if (!usage.totals) {
                                usage.totals = {
                                    photos: 0,
                                    storage: 0,
                                    events: 0
                                };
                            }

                            // Ensure storage is always a number
                            if (typeof usage.totals.storage !== 'number') {
                                usage.totals.storage = parseFloat(usage.totals.storage) || 0;
                            }

                            set({ usage });
                        } else {
                            // console.warn('fetchUsage: Invalid usage data format from API');
                            set({ usage: null });
                        }
                    } else {
                        // console.warn('Failed to fetch usage data', response.status);
                        set({ usage: null });
                    }
                } catch (error) {
                    console.error('Error in fetchUsage:', error);
                    set({ usage: null });
                } finally {
                    set({ isLoadingUsage: false });
                }
            },

            fetchAvailablePlans: async () => {
                set({ isLoadingPlans: true });

                const url = '/user/subscription/plans';
                try {
                    const response = await apiClient.get<any>(url);

                    if (response.status === 200) {
                        const responseData = response.data;
                        let plans;

                        // Handle {status: true, data: ...} pattern
                        if (responseData.status === true && responseData.data) {
                            plans = responseData.data;
                        } else {
                            plans = responseData;
                        }

                        if (!Array.isArray(plans)) {
                            plans = [];
                        }

                        // Process the plans to keep all properties but ensure consistent ID field
                        const processedPlans = plans.map((plan: any) => {
                            // Keep all original properties from the plan
                            const enrichedPlan = {
                                ...plan,
                                // Ensure we have consistent ID field
                                id: plan.id || plan._id || plan.planId || '',
                                // Ensure consistent interval/billing cycle naming
                                interval: plan.interval || plan.billingCycle || plan.billing_cycle || 'month',
                                // Ensure price exists
                                price: typeof plan.price !== 'undefined' ? plan.price : plan.amount || 0,
                                // Ensure features is an array
                                features: Array.isArray(plan.features) ? plan.features :
                                    (plan.limits && Array.isArray(plan.limits.features)) ? plan.limits.features : []
                            };
                            return enrichedPlan;
                        });

                        // Sort plans by sortOrder if available
                        const sortedPlans = processedPlans.sort((a: any, b: any) => {
                            if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
                                return a.sortOrder - b.sortOrder;
                            }
                            return 0;
                        });

                        // Store the plans with all their properties
                        console.log(`Successfully processed ${sortedPlans.length} subscription plans`);
                        set({ availablePlans: sortedPlans });
                    } else {
                        console.warn('Failed to fetch subscription plans:', response.status);
                        set({ availablePlans: [] });
                    }
                } catch (error) {
                    console.error('Error fetching subscription plans:', error);
                    set({ availablePlans: [] });
                } finally {
                    set({ isLoadingPlans: false });
                }
            },

            upgradeSubscription: async (planId: string) => {
                const state = get();
                if (!state.isAuthenticated) {
                    throw new Error('Must be authenticated to upgrade subscription');
                }

                set({ isUpgradingSubscription: true });
                try {
                    const response = await apiClient.post<any>('/user/subscription/upgrade', { planId });

                    if (response.status === 200) {
                        const responseData = response.data;

                        // Refresh subscription data after successful upgrade
                        await get().fetchSubscription();

                        const success = responseData.status !== false;
                        let message = 'Subscription upgraded successfully';
                        let redirectUrl;

                        if (responseData.message) {
                            message = responseData.message;
                        } else if (responseData.data && responseData.data.message) {
                            message = responseData.data.message;
                        }

                        if (responseData.data && (responseData.data as any).redirectUrl) {
                            redirectUrl = (responseData.data as any).redirectUrl;
                        } else if ((responseData as any).redirectUrl) {
                            redirectUrl = (responseData as any).redirectUrl;
                        } else if (responseData.data && typeof responseData.data === 'string' && responseData.data.includes('http')) {
                            // Fallback if data is just the url
                            redirectUrl = responseData.data;
                        }

                        console.log('Processed upgrade result:', { success, message, redirectUrl });
                        return { success, message, redirectUrl };
                    } else {
                        // Extract error message
                        const responseData = response.data;
                        let errorMsg = 'Failed to upgrade subscription';
                        if (responseData && responseData.message) errorMsg = responseData.message;
                        throw new Error(errorMsg);
                    }
                } catch (error: any) {
                    console.error('Error upgrading subscription:', error);
                    // Try to get message from error response
                    const errMsg = error.response?.data?.message || error.message || 'Upgrade failed';
                    throw new Error(errMsg);
                } finally {
                    set({ isUpgradingSubscription: false });
                }
            },

            logout: () => {
                // Clear auth token and user data from localStorage
                removeLocalStorageValue('rc-tokens');
                removeLocalStorageValue('userData');
                removeLocalStorageValue('event-app-storage');
                removeLocalStorageValue('app-settings');

                set({
                    isAuthenticated: false,
                    userData: null,
                    subscription: null,
                    usage: null
                });
            },

            login: (userData: Record<string, any>) => {
                console.log('Raw login userData:', userData);

                // Handle case where API returns {status: true, data: {user object}}
                const userDataToSet = userData.data || userData;
                console.log('User data to set after extraction:', userDataToSet);

                set({
                    isAuthenticated: true,
                    userData: userDataToSet
                });

                // Store user data in localStorage
                setLocalStorageValue('userData', JSON.stringify(userDataToSet));

                // Fetch additional data after login
                setTimeout(() => {
                    const state = get();
                    state.fetchSubscription();
                    state.fetchUsage();
                    state.fetchAvailablePlans();
                }, 0);
            },

        }),
        {
            name: 'app-settings',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHydrated(true);

                    // We DO NOT auto-authenticate here anymore. 
                    // AuthContext is the single source of truth and will initialize the store via authManager.
                }
            },
            partialize: (state) => ({
                theme: state.theme,
                requireAuthForSettings: state.requireAuthForSettings,
                privateProfile: state.privateProfile,
                autoSave: state.autoSave,
                // ❌ REMOVED: Don't persist subscription, usage, plans (fetch from API)
                // subscription: state.subscription,
                // usage: state.usage,
                // availablePlans: state.availablePlans,
            }),
        }
    )
);
