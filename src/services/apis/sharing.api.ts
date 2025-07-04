// services/apis/sharing.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { ShareToken, SharePermissions, ShareTokenType, EventAccessLevel } from '@/types/sharing';
import { nanoid } from 'nanoid';

/**
 * Generate a secure share token client-side
 * This is a fallback for development/testing until the backend is ready
 */
const generateClientSideToken = (
  type: ShareTokenType,
  eventId: string,
  albumId: string | undefined,
  permissions: SharePermissions,
  expiresAt?: Date
): ShareToken => {
  const token = nanoid(16); // Generate a secure random token
  
  return {
    id: nanoid(10),
    token,
    eventId,
    albumId,
    permissions,
    createdAt: new Date(),
    expiresAt,
    createdById: 'client-generated',
    usageCount: 0
  };
};

// Store client-side tokens until backend is ready
const clientTokenStore: Record<string, ShareToken> = {};

// Create a new share token
export const createShareToken = async (
  type: ShareTokenType,
  eventId: string,
  albumId: string | undefined,
  permissions: SharePermissions,
  expiresAt?: Date,
  password?: string,
  authToken?: string
): Promise<ShareToken> => {
  try {
    // First try the backend endpoint
    try {
      // Try three possible API endpoints that might be implemented on the backend
      const endpoints = [
        `${API_BASE_URL}/event/${eventId}/share`,    // New API endpoint (preferred)
        `${API_BASE_URL}/share/create`,              // Alternative 
        `${API_BASE_URL}/events/${eventId}/share`    // Legacy endpoint
      ];
      
      let response;
      let lastError;
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to create token at endpoint: ${endpoint}`);
          console.log('Request payload:', {
            type,
            eventId,
            albumId,
            permissions,
            expiresAt,
            hasPassword: !!password
          });
          
          // Format the data to be more compatible with different backend expectations
          const requestData = {
            type,
            eventId,
            albumId: albumId || null,
            permissions: {
              view: permissions.canView,
              upload: permissions.canUpload,
              download: permissions.canDownload,
              share: false // Default to false since not in your type
            },
            // Also include flattened permissions to support different backend formats
            view_permission: permissions.canView,
            upload_permission: permissions.canUpload,
            download_permission: permissions.canDownload,
            share_permission: false,
            expiresAt,
            password, // Will be hashed on server
            event_id: eventId, // Alternative format
            album_id: albumId || null // Alternative format
          };
          
          response = await axios.post(
            endpoint,
            requestData,
            {
              headers: authToken ? {
                Authorization: `Bearer ${authToken}`,
              } : undefined,
              timeout: 5000 // 5 second timeout
            }
          );
          
          console.log(`Response from ${endpoint}:`, response.data);
          
          if (response.data && (response.data.status === true || response.data.success)) {
            console.log('Successfully created token via backend API!');
            return response.data.data as ShareToken;
          }
          
          console.log('Backend returned success=false. Response:', response.data);
          break; // If we get a response but it's invalid, don't try other endpoints
        } catch (endpointError) {
          lastError = endpointError;
          if (endpointError instanceof Error) {
            console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
          }
          // Check for axios error structure
          const axiosError = endpointError as any;
          if (axiosError.response) {
            console.log('Status code:', axiosError.response.status);
            console.log('Response data:', axiosError.response.data);
          }
        }
      }
      
      console.warn('All backend share API endpoints failed, using client-side fallback', lastError);
      // Continue to fallback if backend fails
    } catch (apiError) {
      console.warn('Backend share API not available, using client-side fallback', apiError);
      // Continue to fallback if backend fails
    }
    
    // Comment this to force backend usage - only uncomment for development without backend
    
    console.log('WARNING: Share token creation failed on backend.');
    console.log('To store tokens in the database, make sure your backend implements one of these endpoints:');
    console.log(`- POST ${API_BASE_URL}/event/${eventId}/share`);
    console.log(`- POST ${API_BASE_URL}/share/create`);
    console.log(`- POST ${API_BASE_URL}/events/${eventId}/share`);
    
    // If you want to enable client-side fallback for development, uncomment this:
    /*
    const clientToken = generateClientSideToken(
      type, eventId, albumId, permissions, expiresAt
    );
    
    // Store it in memory for validation later
    clientTokenStore[clientToken.token] = clientToken;
    
    return clientToken;
    */
    
    // Otherwise, throw an error
    throw new Error('Unable to create share token - backend API unavailable');
  } catch (error) {
    console.error('Error creating share token:', error);
    throw error;
  }
};

// Get share token by token string
export const getShareTokenInfo = async (
  token: string
): Promise<ShareToken> => {
  try {
    // Check client-side store first (fallback)
    if (clientTokenStore[token]) {
      return clientTokenStore[token];
    }
    
    // Try the backend with multiple possible endpoints
    const endpoints = [
      `${API_BASE_URL}/share/${token}`,
      `${API_BASE_URL}/share/token/${token}`,
      `${API_BASE_URL}/event/share/${token}`
    ];
    
    let lastError;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to get share token info from: ${endpoint}`);
        const response = await axios.get(endpoint, { timeout: 5000 });
    
        if (response.data && (response.data.status === true || response.data.success)) {
          console.log('Successfully retrieved token info from backend');
          return response.data.data as ShareToken;
        }
      } catch (apiError) {
        console.warn(`Endpoint ${endpoint} failed:`, apiError);
        lastError = apiError;
      }
    }
    
    console.warn('All backend share token API endpoints failed', lastError);
    
    // If we reach here and don't have a token in client store, it's invalid
    throw new Error('Invalid or expired share token');
  } catch (error) {
    console.error('Error retrieving share token info:', error);
    throw error;
  }
};

// Validate a share token with optional password
export const validateShareToken = async (
  token: string,
  password?: string
): Promise<{
  valid: boolean;
  shareToken?: ShareToken;
  error?: string;
}> => {
  try {
    console.log(`Validating token: ${token}`);
    console.log(`Client token store has ${Object.keys(clientTokenStore).length} tokens`);
    
    // First check client-side store (fallback)
    if (clientTokenStore[token]) {
      console.log('Found token in client-side store!', clientTokenStore[token]);
      
      // Simple password check for client-side tokens
      if (clientTokenStore[token].password && clientTokenStore[token].password !== password) {
        console.log('Password check failed');
        return {
          valid: false,
          error: 'Invalid password'
        };
      }
      
      // Check if expired
      if (clientTokenStore[token].expiresAt && new Date() > clientTokenStore[token].expiresAt) {
        console.log('Token expired');
        return {
          valid: false,
          error: 'Share link has expired'
        };
      }
      
      // Update usage count
      clientTokenStore[token].usageCount += 1;
      console.log('Token validated successfully from client store');
      
      return {
        valid: true,
        shareToken: clientTokenStore[token]
      };
    } else {
      console.log('Token not found in client-side store');
    }
    
    // Try multiple backend endpoints
    const endpoints = [
      `${API_BASE_URL}/share/validate`,
      `${API_BASE_URL}/share/token/validate`,
      `${API_BASE_URL}/event/share/validate`
    ];
    
    let lastError;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to validate token at: ${endpoint}`);
        console.log('Request payload:', { token, hasPassword: !!password });
        
        const response = await axios.post(endpoint, {
          token,
          password,
        }, { timeout: 5000 });
    
        console.log(`Response from ${endpoint}:`, response.data);
        
        if (response.data && (response.data.status === true || response.data.success)) {
          console.log('Successfully validated token via backend');
          return {
            valid: true,
            shareToken: response.data.data as ShareToken,
          };
        }
        
        console.log('Backend returned invalid token response:', response.data);
        return {
          valid: false,
          error: response.data?.message || 'Invalid token',
        };
      } catch (apiError) {
        console.warn(`Validation endpoint ${endpoint} failed:`, apiError);
        const axiosError = apiError as any;
        if (axiosError.response) {
          console.log('Status code:', axiosError.response.status);
          console.log('Response data:', axiosError.response.data);
        }
        lastError = apiError;
      }
    }
    
    console.warn('All backend validate API endpoints failed', lastError);
    
    // If backend API fails and token is not in client store, it's invalid
    return {
      valid: false,
      error: 'Unable to validate share token'
    };
  } catch (error) {
    console.error('Error validating share token:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate token',
    };
  }
};

// Get all share tokens for an event
export const getEventShareTokens = async (
  eventId: string,
  authToken: string
): Promise<ShareToken[]> => {
  try {
    // Try the backend first
    try {
      const response = await axios.get(`${API_BASE_URL}/event/${eventId}/shares`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
  
      if (response.data && response.data.status === true) {
        return response.data.data as ShareToken[];
      }
    } catch (apiError) {
      console.warn('Backend event shares API not available', apiError);
      // Fall back to client-side store
    }
    
    // Fallback: Return any client-side tokens for this event
    return Object.values(clientTokenStore).filter(token => token.eventId === eventId);
  } catch (error) {
    console.error('Error fetching event share tokens:', error);
    return [];
  }
};

// Revoke a share token
export const revokeShareToken = async (
  tokenId: string,
  authToken: string
): Promise<boolean> => {
  try {
    // Check if it's in our client-side store first
    const clientTokens = Object.values(clientTokenStore);
    const clientToken = clientTokens.find(token => token.id === tokenId);
    
    if (clientToken) {
      // Remove from client store
      delete clientTokenStore[clientToken.token];
      return true;
    }
    
    // Try the backend
    try {
      const response = await axios.delete(`${API_BASE_URL}/share/${tokenId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
  
      return response.data && response.data.status === true;
    } catch (apiError) {
      console.warn('Backend revoke API not available', apiError);
      return false;
    }
  } catch (error) {
    console.error('Error revoking share token:', error);
    return false;
  }
};

// Update the event access level
export const updateEventAccess = async (
  eventId: string,
  accessLevel: EventAccessLevel,
  allowGuestUploads: boolean,
  requireApproval: boolean,
  authToken: string
): Promise<boolean> => {
  try {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/event/${eventId}`,
        {
          access: {
            level: accessLevel,
            allowGuestUploads,
            requireApproval,
          }
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
  
      return response.data && response.data.status === true;
    } catch (apiError) {
      console.warn('Backend event access update API not available', apiError);
      
      // For testing/dev, we'll just return true
      return true;
    }
  } catch (error) {
    console.error('Error updating event access:', error);
    return false;
  }
};

// Get event by share token (for guest access)
export const getEventByShareToken = async (
  token: string,
  password?: string
): Promise<any> => {
  try {
    // First validate the token
    const validation = await validateShareToken(token, password);
    
    if (!validation.valid || !validation.shareToken) {
      throw new Error(validation.error || 'Invalid share token');
    }
    
    const shareToken = validation.shareToken;
    
    // Try multiple endpoints for guest access
    const endpoints = [
      `${API_BASE_URL}/event/${shareToken.eventId}/guest?token=${token}`,
      `${API_BASE_URL}/event/guest/${shareToken.eventId}?token=${token}`,
      `${API_BASE_URL}/share/${token}/content`
    ];
    
    let lastError;
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to access event with share token via: ${endpoint}`);
        const response = await axios.get(endpoint, { timeout: 8000 });
        
        if (response.data && (response.data.status === true || response.data.success)) {
          console.log('Successfully retrieved event with share token');
          return response.data.data;
        }
      } catch (apiError) {
        console.warn(`Guest access endpoint ${endpoint} failed:`, apiError);
        lastError = apiError;
      }
    }
    
    console.warn('All guest access endpoints failed', lastError);
    
    // Fallback: Try to get the event using the normal API without auth
    // This is just for development/testing
    try {
      console.log('Attempting fallback guest access...');
      const fallbackResponse = await axios.get(
        `${API_BASE_URL}/event/${shareToken.eventId}`
      );
      
      if (fallbackResponse.data) {
        console.log('Fallback guest access succeeded');
        return fallbackResponse.data.data;
      }
    } catch (fallbackError) {
      console.error('Fallback guest access failed:', fallbackError);
    }
    
    throw new Error('Unable to access event');
  } catch (error) {
    console.error('Error accessing event with share token:', error);
    throw error;
  }
};
