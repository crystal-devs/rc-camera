import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export interface FindMeResponse {
    status: boolean;
    code: number;
    message: string;
    data: {
        mediaIds: string[];
        count: number;
    };
}

/**
 * Find photos matching a selfie
 */
export const findMyPhotos = async (
    eventId: string,
    selfie: string,
    useLooseThreshold = false
): Promise<FindMeResponse> => {
    // selfie is expected to be a base64 string
    const response = await axios.post(`${API_BASE_URL}/ai/event/${eventId}/find-me`, {
        selfie,
        useLooseThreshold
    });
    return response.data;
};
