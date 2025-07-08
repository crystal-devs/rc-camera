# Invited Guests Feature Implementation Guide

This guide explains how the invited guests feature works in the application, which replaced the old access code system.

## Overview

The invited guests feature allows event owners to restrict event access to specific people. Instead of using generic access codes, this system:

1. Allows specifying a list of invited guests (by email or username)
2. Requires those guests to be logged in to access the event
3. Validates if the current user is on the guest list before granting access

## Key Components

### Event Access Levels

Events now have three access levels:

- `PUBLIC`: Anyone can view the event
- `LINK_ONLY`: Anyone with the share link can view the event
- `INVITED_ONLY`: Only people on the guest list can view the event

These levels are defined in the `EventAccessLevel` enum in `src/types/sharing.ts`.

### Event Type Updates

The `Event` type in `src/types/events.ts` has been updated with:

```typescript
invitedGuests?: string[]; // List of emails or usernames that can access the event
access?: {
  level: EventAccessLevel; // PUBLIC, LINK_ONLY, or INVITED_ONLY
  allowGuestUploads: boolean;
  requireApproval: boolean;
}
```

### Share Token Updates

The `ShareToken` type in `src/types/sharing.ts` has been updated with:

```typescript
invitedGuests?: string[]; // List of emails or usernames that can access the event
accessMode: 'public' | 'invited_only'; // Whether the token is open to anyone or restricted
```

## User Flow

1. **Creating an Event**:
   - User creates/edits an event and sets access level to "Invited Only"
   - User enters invited guests as comma-separated emails or usernames
   - System saves the guest list with the event

2. **Sharing an Event**:
   - System generates a share token that includes the invited guests list
   - Owner shares the link with guests

3. **Accessing an Event**:
   - Guest opens the share link
   - System validates the token and checks if the user is logged in
   - If it's an invited-only event, system checks if the user's email/username is on the guest list
   - If authorized, user sees the event; if not, user is directed to the "Not Invited" page

## API Integration

### Backend Endpoints

The system tries multiple endpoint formats to accommodate different backend implementations:

- Share Token Creation: 
  - `/share/event/:eventId/share`
  - `/share/create`
  - `/share/events/:eventId/share`

- Token Validation:
  - `/share/validate`
  - `/share/token/validate`
  - `/share/event/share/validate`

- Guest Access:
  - `/share/shared/:token`
  - `/share/:token_id/guests/check?token=:token`
  - `/share/:token/content`

All API requests include the user identifier for guest validation.

### Client-side Fallback

For development and testing, there's a client-side fallback that:

- Generates share tokens locally
- Stores them in memory
- Validates guests against the in-memory store

## UI Components

### Event Form

- Updated to include invited guests field when "Invited Only" is selected
- Validates that invited guests are provided for invited-only events

### Guest Management

- New component to manage event access settings and guest list
- Available at `/events/[eventId]/guests`

### Not Invited Page

- Shown when a user tries to access an event but isn't on the guest list
- Located at `/join/not-invited`

## Testing

To test the invited guests feature:

1. Create an event with "Invited Only" access and add your email to the guest list
2. Copy the share link
3. Open the link in an incognito window (not logged in) - should prompt for login
4. Log in with an account that matches a guest email - should show the event
5. Log in with an account not on the guest list - should show "Not Invited" page

## Future Improvements

- Add email validation for invited guests
- Implement auto-complete/suggestions for usernames
- Add ability to send email invitations directly from the app
- Create a proper guest management UI with add/remove functionality
