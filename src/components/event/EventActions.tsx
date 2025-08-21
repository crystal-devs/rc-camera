import React from 'react';
import {
    QrCodeIcon,
    ShareIcon,
    SettingsIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

interface EventActionsProps {
    eventId: string;
    accessCode?: string; // Keep for backward compatibility, but now optional
    name: string;
    qrDialogOpen: boolean;
    setQrDialogOpen: (open: boolean) => void;
    copyShareLink: () => void;
    invitedGuests?: string[]; // Add support for invited guests
}

const EventActions: React.FC<EventActionsProps> = ({
    eventId,
    accessCode,
    name,
    qrDialogOpen,
    setQrDialogOpen,
    copyShareLink,
    invitedGuests,
}) => {
    const router = useRouter();
    const { fetchUsage } = useStore();

    return (
        <div className="flex flex-wrap gap-2">
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <QrCodeIcon className="h-4 w-4 mr-2" />
                        QR Code
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Event</DialogTitle>
                        <DialogDescription>
                            Scan this QR code to join the event and view photos
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center py-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            {/* <QRCode value={getShareUrl()} size={200} /> */}
                        </div>

                        <div className="mt-4 text-center">
                            <p className="text-sm font-medium mb-1">{name}</p>
                            {invitedGuests && invitedGuests.length > 0 ? (
                                <p className="text-xs text-gray-500">
                                    Invited Guests: {invitedGuests.length} {invitedGuests.length === 1 ? 'person' : 'people'}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500">Share this QR code with your guests</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="w-full sm:w-auto" onClick={copyShareLink}>
                            <ShareIcon className="h-4 w-4 mr-2" />
                            Copy Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={copyShareLink}>
                <ShareIcon className="h-4 w-4 mr-2" />
                Share Link
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/events/${eventId}/settings`)}>
                        Edit Event
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/events/${eventId}/guests`)}>
                        Manage Guests
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={async () => {
                            if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                                try {
                                    const authToken = localStorage.getItem('rc-token');
                                    if (!authToken) {
                                        toast.error("You need to be logged in to delete this event");
                                        return;
                                    }
                                    
                                    // Import the deleteEvent function from the API
                                    const { deleteEvent } = await import('@/services/apis/events.api');
                                    
                                    // Call the API to delete the event
                                    await deleteEvent(eventId, authToken);
                                    
                                    // Refresh usage data
                                    fetchUsage();
                                    
                                    router.push('/events');
                                    toast.success("The event has been permanently removed.");
                                } catch (error) {
                                    console.error('Error deleting event:', error);
                                    toast.error("Failed to delete the event. Please try again.");
                                }
                            }
                        }}
                    >
                        Delete Event
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default EventActions;