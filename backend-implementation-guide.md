# Backend Implementation Guide for Invited Guests Feature

This document outlines the necessary changes to implement the invited guests feature on the backend.

## Overview

We are replacing the access code system with a more sophisticated invited guests system that works like Google Photos and Docs. This allows event creators to specifically invite users by email/username, and only those users can access the event when authenticated.

## Schema Changes

### Event Model

Update your Event model to include:

```javascript
{
  // Existing fields...

  // New fields
  access_mode: {
    type: String,
    enum: ['public', 'link_only', 'invited_only'],
    default: 'public'
  },
  
  invited_guests: {
    type: [String],
    default: []
  },
  
  // You can deprecate these fields (but keep for backward compatibility)
  is_private: Boolean,
  access_code: String,
  
  // New access object structure
  access: {
    level: {
      type: String,
      enum: ['public', 'link_only', 'invited_only'],
      default: 'public'
    },
    allowGuestUploads: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  }
}
```

### ShareToken Model

Update your ShareToken model to include:

```javascript
{
  // Existing fields...
  token: String,
  eventId: String, // Reference to the Event
  
  // New fields
  accessMode: {
    type: String,
    enum: ['public', 'invited_only'],
    default: 'public'
  },
  
  invitedGuests: {
    type: [String],
    default: []
  },
  
  // You can remove or deprecate the password field
  // password: String, // Hashed password
}
```

## API Endpoints

### Create/Update Event

Modify your event creation and update endpoints to handle the new fields:

```javascript
// POST /api/event
// PATCH /api/event/:id
router.post('/event', authMiddleware, (req, res) => {
  // Extract new fields
  const { 
    title, 
    description, 
    start_date, 
    end_date, 
    location, 
    cover_image,
    access_mode,
    invited_guests,
    access
  } = req.body;
  
  // Create event with new fields
  const event = new Event({
    title,
    description,
    start_date,
    end_date,
    location,
    cover_image,
    access_mode,
    invited_guests,
    // Set access object based on provided values or defaults
    access: {
      level: access?.level || access_mode || 'public',
      allowGuestUploads: access?.allowGuestUploads || false,
      requireApproval: access?.requireApproval || false
    },
    // Legacy field mapping for backward compatibility
    is_private: access_mode === 'invited_only' || access?.level === 'invited_only'
  });
  
  // Save and respond...
});
```

### Create Share Token

Update the share token creation endpoint:

```javascript
// POST /api/event/:id/share
router.post('/event/:id/share', authMiddleware, (req, res) => {
  const { 
    type, 
    permissions,
    expiresAt,
    invitedGuests,
    accessMode
  } = req.body;
  
  // Create token with new fields
  const shareToken = new ShareToken({
    token: generateSecureToken(), // Your token generation function
    eventId: req.params.id,
    permissions,
    expiresAt,
    invitedGuests,
    accessMode,
    createdById: req.user.id
  });
  
  // Save and respond...
});
```

### Validate Share Token

Update the share token validation to check if the user is in the invited list:

```javascript
// POST /api/share/validate
router.post('/share/validate', async (req, res) => {
  const { token, userIdentifier } = req.body;
  
  try {
    const shareToken = await ShareToken.findOne({ token });
    
    if (!shareToken) {
      return res.status(404).json({ valid: false, error: 'Invalid token' });
    }
    
    // Check if token is expired
    if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
      return res.status(403).json({ valid: false, error: 'Token expired' });
    }
    
    // Check if this is an invited_only share and if the user is in the list
    if (shareToken.accessMode === 'invited_only') {
      if (!userIdentifier || !shareToken.invitedGuests.includes(userIdentifier)) {
        return res.status(403).json({ 
          valid: false, 
          error: 'You are not on the invited guests list for this event' 
        });
      }
    }
    
    // Token is valid
    shareToken.usageCount += 1;
    await shareToken.save();
    
    return res.json({
      valid: true,
      shareToken
    });
  } catch (err) {
    console.error('Error validating share token:', err);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
});
```

### Get Event By Share Token

Update how events are accessed by share token:

```javascript
// GET /api/event/:id/guest
router.get('/event/:id/guest', async (req, res) => {
  const { token, userIdentifier } = req.query;
  
  try {
    // Validate the token first
    const shareTokenResult = await validateShareToken(token, userIdentifier);
    
    if (!shareTokenResult.valid) {
      return res.status(403).json({ error: shareTokenResult.error });
    }
    
    // Get the event
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // If the event is invited_only, verify the user is in the list
    if (event.access_mode === 'invited_only' || event.access?.level === 'invited_only') {
      if (!userIdentifier || !event.invited_guests.includes(userIdentifier)) {
        return res.status(403).json({ 
          error: 'You are not on the invited guests list for this event' 
        });
      }
    }
    
    // Return the event data
    return res.json({
      status: true,
      data: event
    });
  } catch (err) {
    console.error('Error accessing event with share token:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
```

## Migration Considerations

1. **Data Migration**: You might need a script to convert existing events with `is_private: true` to use the new `access_mode: 'invited_only'` format.

2. **Backward Compatibility**: Keep supporting the old access code mechanism for a transition period.

3. **Phased Rollout**: Consider implementing the new system alongside the old one before fully replacing it.

## Security Considerations

1. **Email Validation**: Consider validating email formats for invited guests.

2. **Rate Limiting**: Add rate limiting for share token creation and validation to prevent abuse.

3. **Authentication**: Ensure robust authentication before checking if a user is in the invited list.

## Testing

1. Test creating events with invited guests
2. Test accessing events as:
   - An invited guest (should succeed)
   - A non-invited guest (should fail)
   - An anonymous user with a share link to an invited-only event (should require login)
3. Test modifying the invited guests list and verify access changes accordingly
