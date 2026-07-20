// services/apis/sub-events.api.ts
//
// Sub-events ("functions") — the multi-function structure for Indian events
// (haldi / sangeet / wedding / reception). Media links to a function via
// media.sub_event_id; null means the whole-event gallery. See docs/ROADMAP.md
// Phase 1.

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

export interface SubEvent {
  _id: string;
  name: string;
  /** ISO date string, or null when the host hasn't set one */
  date: string | null;
  /** Display order in the function timeline (server sorts by this) */
  order: number;
}

export interface SubEventInput {
  name?: string;
  date?: string | null;
  order?: number;
}

const authHeaders = (authToken: string) => ({
  headers: { Authorization: `Bearer ${authToken}` },
  timeout: 15000,
});

/** Functions for an event, in timeline order (server-sorted). */
export const getSubEvents = async (eventId: string, authToken: string): Promise<SubEvent[]> => {
  const res = await axios.get(
    `${API_BASE_URL}/event/${eventId}/sub-events`,
    authHeaders(authToken)
  );
  return (res.data?.data ?? []) as SubEvent[];
};

/** Create a function. Hosts only (server-gated by event.update). */
export const createSubEvent = async (
  eventId: string,
  input: SubEventInput,
  authToken: string
): Promise<SubEvent> => {
  const res = await axios.post(
    `${API_BASE_URL}/event/${eventId}/sub-events`,
    input,
    authHeaders(authToken)
  );
  return res.data?.data as SubEvent;
};

/** Rename / re-date / reorder a function. */
export const updateSubEvent = async (
  eventId: string,
  subEventId: string,
  input: SubEventInput,
  authToken: string
): Promise<SubEvent> => {
  const res = await axios.patch(
    `${API_BASE_URL}/event/${eventId}/sub-events/${subEventId}`,
    input,
    authHeaders(authToken)
  );
  return res.data?.data as SubEvent;
};

/**
 * Delete a function. Photos tagged to it are not deleted — the server re-tags
 * them to the whole-event gallery.
 */
export const deleteSubEvent = async (
  eventId: string,
  subEventId: string,
  authToken: string
): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/event/${eventId}/sub-events/${subEventId}`,
    authHeaders(authToken)
  );
};
