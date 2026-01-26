import { UserSubscription, UserUsage, getSafeSubscriptionProperty, getSafeUsageProperty } from './store';

// These helper functions are no longer needed since we're using getSafeSubscriptionProperty 
// and getSafeUsageProperty directly from the store

/**
 * Format storage size from Bytes to appropriate unit (MB or GB)
 * @param sizeInBytes Size in bytes (or MB if small value provided for legacy support)
 * @returns Formatted string with unit
 */
export const formatStorageSize = (sizeInBytes: number): string => {
  // Check if the value is likely bytes (large number) or MB (small number, legacy)
  // 10000 MB is ~10GB. If it's smaller than that, we assume it's legacy MB.
  // Unless it's 0, which works for both.

  let bytes = sizeInBytes;

  // Heuristic: If value is small (< 100000) and not 0, assume it's MB and convert to Bytes for standard processing
  // But wait, 0 is ambiguous. 
  // Let's assume the NEW system uses bytes (huge numbers).
  // 1 GB = 1073741824 bytes.
  // 500 MB = 524288000 bytes.

  // If we receive "500" (meaning MB), treating it as bytes would be 500 bytes (tiny).
  // If we receive "524288000" (meaning bytes), treating it as MB would be massive.

  // So:
  if (sizeInBytes > 0 && sizeInBytes < 100000) {
    // Assume legacy MB input, convert to Bytes
    bytes = sizeInBytes * 1024 * 1024;
  }

  if (bytes === 0) return "0 MB";

  const gigabytes = bytes / (1024 * 1024 * 1024);
  if (gigabytes >= 1) {
    return `${gigabytes.toFixed(1)} GB`;
  }

  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
};

/**
 * Format price with correct currency symbol and decimals
 * @param price Price value 
 * @param currency Currency code (default: USD)
 * @returns Formatted price string with currency symbol
 */
export const formatPrice = (price: number, currency = 'USD'): string => {
  // Handle Stripe-style prices (in cents)
  const actualPrice = price > 1000 && Number.isInteger(price) ? price / 100 : price;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(actualPrice);
  } catch (error) {
    // Fallback if currency formatting fails
    return `${currency} ${actualPrice.toFixed(2)}`;
  }
};

/**
 * Calculate storage percentage with proper error handling
 * @param subscription Subscription object
 * @param usage Usage object
 * @returns Percentage of storage used (0-100)
 */
export const calculateStoragePercentage = (
  subscription: UserSubscription | null,
  usage: UserUsage | null
): number => {
  console.log('Calculating storage percentage with:', { subscription, usage });

  // Get storage values using the safe accessor functions
  const maxStorage = getSafeSubscriptionProperty(subscription, ['limits', 'maxStorage'], 1000);
  const usedStorage = getSafeUsageProperty(usage, ['totals', 'storage'], 0);

  console.log('Storage values:', { maxStorage, usedStorage });

  // Validate values before calculation
  if (!maxStorage || maxStorage <= 0) {
    console.warn('Invalid maxStorage value:', maxStorage);
    return 0;
  }

  if (typeof usedStorage !== 'number') {
    console.warn('Invalid usedStorage type:', typeof usedStorage, usedStorage);
    return 0;
  }

  // Ensure both values are numbers
  const usedStorageNum = Number(usedStorage);
  const maxStorageNum = Number(maxStorage);

  if (isNaN(usedStorageNum) || isNaN(maxStorageNum)) {
    console.warn('Storage values are not valid numbers:', { usedStorage, maxStorage });
    return 0;
  }

  // Calculate percentage and cap at 100%
  const percentage = Math.min(Math.round((usedStorageNum / maxStorageNum) * 100), 100);
  console.log('Calculated percentage:', percentage);

  return percentage;
};

/**
 * Get the color for storage status based on percentage used
 * @param percentage Percentage of storage used
 * @returns CSS class name for text color
 */
export const getStorageStatusColor = (percentage: number): string => {
  if (percentage > 90) return 'text-red-500';
  if (percentage > 70) return 'text-amber-500';
  return 'text-green-500';
};
