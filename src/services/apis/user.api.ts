import axios from 'axios';
import { UserSubscription, UserUsage, SubscriptionPlan } from '@/lib/store';
import { API_BASE_URL } from '@/lib/api-config';

// API endpoints
const USER_PROFILE_URL = `${API_BASE_URL}/user/profile`;
const USER_SUBSCRIPTION_URL = `${API_BASE_URL}/user/subscription`;
const USER_USAGE_URL = `${API_BASE_URL}/user/usage`;

// Multiple possible endpoints for subscription plans (in order of preference)
const SUBSCRIPTION_PLANS_URLS = [
  `${API_BASE_URL}/subscription/plans`, // Direct route without 'user'
  `${API_BASE_URL}/user/subscription/plans`, // Original route
  `${API_BASE_URL}/user/subscription/plans`, // Plural 'subscriptions'
];

const SUBSCRIPTION_UPGRADE_URL = `${API_BASE_URL}/user/subscription/upgrade`;

/**
 * Fetch the current user's profile data
 */
export const fetchUserProfile = async () => {
  try {
    const { data } = await axios.get(USER_PROFILE_URL);
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Fetch the current user's subscription details
 */
export const fetchUserSubscription = async (): Promise<UserSubscription> => {
  try {
    const { data } = await axios.get(USER_SUBSCRIPTION_URL);
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Fetch the current user's storage usage statistics
 */
export const fetchUserUsage = async (): Promise<UserUsage> => {
  try {
    const { data } = await axios.get(USER_USAGE_URL);
    return data;
  } catch (error) {
    console.error('Error fetching usage data:', error);
    throw error;
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (preferences: {
  emailNotifications?: boolean;
  defaultEventPrivacy?: string;
}) => {
  try {
    const { data } = await axios.patch(USER_PROFILE_URL, { preferences });
    return data;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

/**
 * Fetch available subscription plans
 * Tries multiple endpoint variations to handle different route configurations
 */
export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  let lastError;
  
  // Try each possible URL in order until one works
  for (const url of SUBSCRIPTION_PLANS_URLS) {
    try {
      console.log(`Attempting to fetch subscription plans from: ${url}`);
      const { data } = await axios.get(url);
      console.log(`Successfully fetched subscription plans from: ${url}`);
      return data;
    } catch (error: any) {
      console.log(`Failed to fetch from ${url}:`, error?.response?.status || error?.message || 'Unknown error');
      lastError = error;
      // Continue to next URL
    }
  }
  
  // If we get here, all URLs failed
  console.error('Error fetching subscription plans from all endpoints:', lastError);
  throw lastError;
};

/**
 * Upgrade the user's subscription plan
 */
export const upgradeSubscription = async (planId: string): Promise<{success: boolean; message: string; redirectUrl?: string}> => {
  try {
    const { data } = await axios.post(SUBSCRIPTION_UPGRADE_URL, { planId });
    return data;
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    throw error;
  }
};
