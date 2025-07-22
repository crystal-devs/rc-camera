// utils/redirects.ts

/**
 * Validates if a redirect URL is safe to use
 * Only allows relative URLs that match our guest page pattern
 */
export const isValidRedirectUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    if (!url.startsWith('/')) return false;
    const guestPagePattern = /^\/guest\/[a-zA-Z0-9_-]+(\?.*)?$/;
    return guestPagePattern.test(url);
  } catch {
    return false;
  }
};


/**
 * Stores redirect URL securely in localStorage
 */
export const storeRedirectUrl = (url: string): void => {
  if (isValidRedirectUrl(url)) {
    localStorage.setItem('redirectAfterLogin', url);
  }
};

/**
 * Retrieves and validates redirect URL from localStorage
 */
export const getRedirectUrl = (): string | null => {
  const storedUrl = localStorage.getItem('redirectAfterLogin');
  if (storedUrl && isValidRedirectUrl(storedUrl)) {
    return storedUrl;
  }
  // Clear invalid URL
  localStorage.removeItem('redirectAfterLogin');
  return null;
};

/**
 * Clears redirect URL from localStorage
 */
export const clearRedirectUrl = (): void => {
  localStorage.removeItem('redirectAfterLogin');
};

/**
 * Handles redirect after successful login
 */
export const handlePostLoginRedirect = (router: any, defaultPath = '/'): void => {
  const redirectUrl = getRedirectUrl();
  if (redirectUrl) {
    clearRedirectUrl();
    router.push(redirectUrl);
  } else {
    router.push(defaultPath);
  }
};