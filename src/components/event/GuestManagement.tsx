import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Event } from '@/types/events';
import { updateEvent } from '@/services/apis/events.api';
import { useAuthToken } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { EventAccessLevel } from '@/types/sharing';

interface GuestManagementProps {
  event: Event;
  onGuestsUpdated?: () => void;
}

export const GuestManagement = ({ event, onGuestsUpdated }: GuestManagementProps) => {
  const router = useRouter();
  const authToken = useAuthToken();
  
  const [accessLevel, setAccessLevel] = useState<EventAccessLevel>(
    event.access?.level === EventAccessLevel.INVITED_ONLY ? EventAccessLevel.INVITED_ONLY :
    event.access?.level === EventAccessLevel.LINK_ONLY ? EventAccessLevel.LINK_ONLY : EventAccessLevel.PUBLIC
  );
  
  const [invitedGuests, setInvitedGuests] = useState(
    event.invitedGuests ? event.invitedGuests.join(', ') : ''
  );
  
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    if (!authToken) {
      toast.error("You need to be logged in to update this event");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Process invited guests - convert comma-separated string to array and trim each entry
      const invitedGuestsList = accessLevel === EventAccessLevel.INVITED_ONLY && invitedGuests
        ? invitedGuests.split(',').map(guest => guest.trim()).filter(guest => guest.length > 0)
        : [];
      
      await updateEvent(
        event.id,
        {
          access: {
            level: accessLevel,
            allowGuestUploads: false,
            requireApproval: false
          },
          invitedGuests: invitedGuestsList
        },
        authToken
      );
      
      toast.success("Guest settings updated successfully");
      
      if (onGuestsUpdated) {
        onGuestsUpdated();
      }
      
      // Return to the event page
      router.push(`/events/${event.id}`);
      
    } catch (error) {
      console.error("Failed to update guest settings:", error);
      toast.error("Failed to update guest settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">Access Level</Label>
        <div className="mt-2 space-y-3">
          <Card className={`cursor-pointer border-2 ${accessLevel === EventAccessLevel.PUBLIC ? 'border-primary' : 'border-gray-200'}`}
                onClick={() => setAccessLevel(EventAccessLevel.PUBLIC)}>
            <CardContent className="flex items-center p-4">
              <div className={`w-4 h-4 rounded-full mr-3 ${accessLevel === EventAccessLevel.PUBLIC ? 'bg-primary' : 'bg-gray-200'}`} />
              <div>
                <h3 className="font-medium">Public</h3>
                <p className="text-sm text-gray-500">Anyone can view this event</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`cursor-pointer border-2 ${accessLevel === EventAccessLevel.LINK_ONLY ? 'border-primary' : 'border-gray-200'}`}
                onClick={() => setAccessLevel(EventAccessLevel.LINK_ONLY)}>
            <CardContent className="flex items-center p-4">
              <div className={`w-4 h-4 rounded-full mr-3 ${accessLevel === EventAccessLevel.LINK_ONLY ? 'bg-primary' : 'bg-gray-200'}`} />
              <div>
                <h3 className="font-medium">Link Only</h3>
                <p className="text-sm text-gray-500">Only people with the link can view</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`cursor-pointer border-2 ${accessLevel === EventAccessLevel.INVITED_ONLY ? 'border-primary' : 'border-gray-200'}`}
                onClick={() => setAccessLevel(EventAccessLevel.INVITED_ONLY)}>
            <CardContent className="flex items-center p-4">
              <div className={`w-4 h-4 rounded-full mr-3 ${accessLevel === EventAccessLevel.INVITED_ONLY ? 'bg-primary' : 'bg-gray-200'}`} />
              <div>
                <h3 className="font-medium">Invited Only</h3>
                <p className="text-sm text-gray-500">Only specific guests you invite can view</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {accessLevel === EventAccessLevel.INVITED_ONLY && (
        <div>
          <Label htmlFor="invited-guests" className="text-base">Invited Guests</Label>
          <p className="text-sm text-gray-500 mb-2">
            Enter email addresses or usernames, separated by commas
          </p>
          <Textarea
            id="invited-guests"
            value={invitedGuests}
            onChange={(e) => setInvitedGuests(e.target.value)}
            placeholder="guest@example.com, username2, etc."
            rows={5}
          />
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Only guests on this list will be able to view the event. 
              Make sure emails or usernames are correct.
            </p>
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`/events/${event.id}`)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
