// services/apis/guest-claim.api.ts
import { API_BASE_URL } from "@/lib/api-config";
import axios from "axios";

export interface ClaimableSummary {
    hasClaimableContent: boolean;
    totalSessions: number;
    totalMedia: number;
    sessions: Array<{
        sessionId: string;
        mediaCount: number;
        uploadedAt: string;
    }>;
}

export interface ClaimResult {
    sessionsClaimed: number;
    mediaMigrated: number;
    mediaUpdated: number;
    totalProcessed: number;
}

/**
 * Get claimable content summary for the authenticated user
 */
export const getClaimableSummary = async (
    eventId: string,
    authToken: string
): Promise<{ status: boolean; data: ClaimableSummary; message: string }> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/guest-sessions/claimable/${eventId}`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            withCredentials: true, // ← Enable sending cookies
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching claimable summary:', error);
        throw error;
    }
};

/**
 * Claim guest content for the authenticated user
 */
export const claimGuestContent = async (
    eventId: string,
    authToken: string,
    sessionIds?: string[] // This parameter is now ignored - backend reads from cookie
): Promise<{ status: boolean; data: ClaimResult; message: string }> => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/guest-sessions/claim/${eventId}`,
            {}, // Empty body - session ID comes from cookie
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                withCredentials: true, // ← Enable sending cookies
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error claiming guest content:', error);
        throw error;
    }
};