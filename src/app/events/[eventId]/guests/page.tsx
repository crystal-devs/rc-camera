// app/events/[eventId]/guests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  ArrowLeftIcon, 
  UserPlusIcon, 
  CopyIcon, 
  MailIcon, 
  QrCodeIcon,
  UserIcon, 
  CheckCircleIcon, 
  ClockIcon,
  MoreHorizontalIcon,
  SearchIcon,
  XIcon,
  SaveIcon,
  ChevronDownIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import QRCode from 'qrcode.react';
import { db } from '@/lib/db';
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid';

interface Event {
  id: string;
  name: string;
  description?: string;
  date: Date;
  endDate?: Date;
  location?: string;
  coverImage?: string;
  createdAt: Date;
  createdById: number;
  accessType: 'public' | 'restricted';
  accessCode?: string;
  template?: string;
  isActive: boolean;
}

interface EventAccess {
  id: string;
  eventId: string;
  userId: number;
  accessType: 'owner' | 'contributor' | 'viewer';
  invitedBy?: number;
  invitedAt?: Date;
  joinedAt?: Date;
  email?: string;
  name?: string;
  status?: 'invited' | 'joined' | 'declined';
}

interface GuestInvite {
  email: string;
  name?: string;
  accessType: 'contributor' | 'viewer';
}

interface PageProps {
  params: {
    eventId: string;
  };
}

export default function GuestManagementPage({ params }: PageProps) {
  // Use React.use to unwrap params
  const { eventId } = use(params);
  
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<EventAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'contributors' | 'viewers'>('all');
  
  // New invite form state
  const [newInvites, setNewInvites] = useState<GuestInvite[]>([
    { email: '', accessType: 'contributor' }
  ]);
  
  // User ID would come from auth in a real app
  const userId = 1;
  
  useEffect(() => {
    const loadEventAndGuests = async () => {
      try {
        // Load event details
        const eventData = await db.events.get(eventId);
        if (!eventData) {
          toast({
            title: "Event Not Found",
            description: "The event you're looking for doesn't exist.",
            variant: "destructive"
          });
          router.push('/events');
          return;
        }
        
        setEvent(eventData);
        
        // Load guests (event access records)
        const guestList = await db.eventAccess
          .where('eventId')
          .equals(eventId)
          .toArray();
        
        // In a real app, you'd fetch user details for each guest
        // Here we'll simulate it with some mock data
        const enhancedGuests = guestList.map(guest => {
          if (guest.userId === userId) {
            // This is the current user/owner
            return {
              ...guest,
              name: 'You (Owner)',
              email: 'you@example.com',
              status: 'joined'
            };
          } else if (guest.userId === 2) {
            return {
              ...guest,
              name: 'John Smith',
              email: 'john@example.com',
              status: 'joined'
            };
          } else if (guest.userId === 3) {
            return {
              ...guest,
              name: 'Sarah Johnson',
              email: 'sarah@example.com',
              status: 'invited'
            };
          } else {
            return {
              ...guest,
              name: `Guest ${guest.userId}`,
              email: `guest${guest.userId}@example.com`,
              status: Math.random() > 0.5 ? 'joined' : 'invited'
            };
          }
        });
        
        setGuests(enhancedGuests);
      } catch (error) {
        console.error('Error loading event and guests:', error);
        toast({
          title: "Error",
          description: "Failed to load guest data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEventAndGuests();
  }, [eventId, router, toast, userId]);
  
  const filteredGuests = guests.filter(guest => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (guest.name && guest.name.toLowerCase().includes(query)) ||
        (guest.email && guest.email.toLowerCase().includes(query))
      );
    }
    
    // Filter by tab
    if (activeTab === 'contributors') {
      return guest.accessType === 'contributor' || guest.accessType === 'owner';
    } else if (activeTab === 'viewers') {
      return guest.accessType === 'viewer';
    }
    
    return true;
  });
  
  const getShareUrl = () => {
    // In a real app, this would be a proper URL with your domain
    return `${window.location.origin}/join?event=${eventId}&code=${event?.accessCode || ''}`;
  };
  
  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    toast({
      title: "Link Copied!",
      description: "Share link copied to clipboard",
    });
  };
  
  const addInviteField = () => {
    setNewInvites([...newInvites, { email: '', accessType: 'contributor' }]);
  };
  
  const removeInviteField = (index: number) => {
    if (newInvites.length <= 1) return;
    setNewInvites(newInvites.filter((_, i) => i !== index));
  };
  
  const updateInviteField = (index: number, field: keyof GuestInvite, value: any) => {
    const updatedInvites = [...newInvites];
    updatedInvites[index] = { ...updatedInvites[index], [field]: value };
    setNewInvites(updatedInvites);
  };
  
  const sendInvitations = async () => {
    // Validate emails
    const validInvites = newInvites.filter(invite => invite.email.trim() !== '');
    
    if (validInvites.length === 0) {
      toast({
        title: "No Valid Emails",
        description: "Please enter at least one valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // In a real app, you'd send emails here
      
      // Create event access records for each invite
      const newGuests = await Promise.all(
        validInvites.map(async (invite) => {
          // In a real app, you'd check if the user exists by email
          // For now, we'll generate a random user ID
          const guestUserId = Math.floor(Math.random() * 1000) + 10; // Random ID that's not the owner
          
          const accessRecord: EventAccess = {
            id: uuidv4(),
            eventId,
            userId: guestUserId,
            accessType: invite.accessType,
            invitedBy: userId,
            invitedAt: new Date(),
            email: invite.email,
            name: invite.name || invite.email.split('@')[0],
            status: 'invited'
          };
          
          await db.eventAccess.add(accessRecord);
          return accessRecord;
        })
      );
      
      // Update state with new guests
      setGuests([...guests, ...newGuests]);
      
      // Reset form and close dialog
      setNewInvites([{ email: '', accessType: 'contributor' }]);
      setInviteDialogOpen(false);
      
      toast({
        title: "Invitations Sent",
        description: `Sent ${validInvites.length} invitation${validInvites.length > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const removeGuest = async (guestId: string) => {
    try {
      const guest = guests.find(g => g.id === guestId);
      
      if (!guest || guest.accessType === 'owner') {
        return; // Can't remove the owner
      }
      
      // Delete event access record
      await db.eventAccess.delete(guestId);
      
      // Update state
      setGuests(guests.filter(g => g.id !== guestId));
      
      toast({
        title: "Guest Removed",
        description: `${guest.name || guest.email} has been removed from the event.`,
      });
    } catch (error) {
      console.error('Error removing guest:', error);
      toast({
        title: "Error",
        description: "Failed to remove guest. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const changeGuestAccess = async (guestId: string, newAccessType: 'contributor' | 'viewer') => {
    try {
      const guest = guests.find(g => g.id === guestId);
      
      if (!guest || guest.accessType === 'owner') {
        return; // Can't change the owner's access
      }
      
      // Update event access record
      await db.eventAccess.update(guestId, {
        accessType: newAccessType
      });
      
      // Update state
      setGuests(guests.map(g => 
        g.id === guestId 
          ? { ...g, accessType: newAccessType } 
          : g
      ));
      
      toast({
        title: "Access Updated",
        description: `${guest.name || guest.email}'s access level has been updated.`,
      });
    } catch (error) {
      console.error('Error changing guest access:', error);
      toast({
        title: "Error",
        description: "Failed to update guest access. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const resendInvitation = async (guestId: string) => {
    try {
      const guest = guests.find(g => g.id === guestId);
      
      if (!guest) return;
      
      // In a real app, you'd send another email here
      
      // Update invited timestamp
      await db.eventAccess.update(guestId, {
        invitedAt: new Date()
      });
      
      // Update state
      setGuests(guests.map(g => 
        g.id === guestId 
          ? { ...g, invitedAt: new Date() } 
          : g
      ));
      
      toast({
        title: "Invitation Resent",
        description: `Invitation has been resent to ${guest.name || guest.email}.`,
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Skeleton className="h-8 w-40 mr-4" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full mt-6 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="text-gray-500 mb-6">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push('/events')}>Back to Events</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push(`/events/${eventId}`)}
            className="mr-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="text-gray-500">Guest Management</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
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
                  <p className="text-sm font-medium mb-1">{event.name}</p>
                  <p className="text-xs text-gray-500">Access Code: {event.accessCode}</p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" className="w-full sm:w-auto" onClick={copyShareLink}>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Invite Guests
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite People to {event.name}</DialogTitle>
                <DialogDescription>
                  Invite guests to view or contribute photos to this event
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {newInvites.map((invite, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`email-${index}`} className="sr-only">Email</Label>
                      <Input
                        id={`email-${index}`}
                        placeholder="Email address"
                        type="email"
                        value={invite.email}
                        onChange={(e) => updateInviteField(index, 'email', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`access-${index}`} className="sr-only">Access</Label>
                      <Select
                        value={invite.accessType}
                        onValueChange={(value: 'contributor' | 'viewer') => 
                          updateInviteField(index, 'accessType', value)
                        }
                      >
                        <SelectTrigger className="w-[140px]" id={`access-${index}`}>
                          <SelectValue placeholder="Access level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contributor">Can Upload</SelectItem>
                          <SelectItem value="viewer">View Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInviteField(index)}
                      disabled={newInvites.length <= 1}
                      className="mt-1"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addInviteField}
                >
                  Add Another Email
                </Button>
              </div>
              
              <DialogFooter className="sm:justify-between">
                <div className="hidden sm:block text-sm text-gray-500">
                  {/* Will send {newInvites.filter(i => i.email.trim() !== '').length} invitation(s) */}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendInvitations}
                    disabled={!newInvites.some(i => i.email.trim() !== '')}
                  >
                    Send Invites
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Share</CardTitle>
            <CardDescription>
              Share this event with anyone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Invite Link</Label>
                <div className="flex">
                  <Input
                    readOnly
                    value={getShareUrl()}
                    className="rounded-r-none font-mono text-xs"
                  />
                  <Button
                    className="rounded-l-none px-3"
                    variant="secondary"
                    onClick={copyShareLink}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label>Access Code</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-lg px-3 py-1 font-mono">
                    {event.accessCode}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyShareLink}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-gray-500">
              Anyone with this link and code can view this event
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Access Permissions</CardTitle>
            <CardDescription>
              Control what guests can do
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Who can upload photos?</Label>
                <RadioGroup defaultValue={event.accessType}>
                  <div className="flex items-start space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="public" id="public" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="public">Anyone with the link</Label>
                      <p className="text-sm text-gray-500">
                        All guests can upload photos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="restricted" id="restricted" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="restricted">Only invited people</Label>
                      <p className="text-sm text-gray-500">
                        Only specific people can upload
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => router.push(`/events/${eventId}/edit`)}
            >
              More Settings
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Guest Stats</CardTitle>
            <CardDescription>
              Overview of invited guests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {guests.length}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total Guests
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {guests.filter(g => g.status === 'joined').length}
                  </div>
                  <div className="text-sm text-gray-500">
                    Joined
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="text-sm font-medium mb-2">Access Types:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Owners:</span>
                    <span>{guests.filter(g => g.accessType === 'owner').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contributors:</span>
                    <span>{guests.filter(g => g.accessType === 'contributor').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Viewers:</span>
                    <span>{guests.filter(g => g.accessType === 'viewer').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span>{guests.filter(g => g.status === 'invited').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-gray-500">
              Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={(value: 'all' | 'contributors' | 'viewers') => setActiveTab(value)}>
            <TabsList>
              <TabsTrigger value="all">All Guests</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="viewers">Viewers</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">Guest</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Invited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchQuery 
                      ? 'No guests match your search' 
                      : 'No guests in this category'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div>{guest.name}</div>
                          <div className="text-xs text-gray-500">{guest.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {guest.accessType === 'owner' ? (
                        <Badge>Owner</Badge>
                      ) : guest.accessType === 'contributor' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                          Can Upload
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                          View Only
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {guest.status === 'joined' ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">Joined</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">Pending</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">
                      {guest.invitedAt 
                        ? format(new Date(guest.invitedAt), 'MMM d, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {guest.accessType !== 'owner' && (
                            <>
                              {guest.accessType === 'contributor' ? (
                                <DropdownMenuItem onClick={() => changeGuestAccess(guest.id, 'viewer')}>
                                  Change to View Only
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => changeGuestAccess(guest.id, 'contributor')}>
                                  Allow to Upload Photos
                                </DropdownMenuItem>
                              )}
                              
                              {guest.status === 'invited' && (
                                <DropdownMenuItem onClick={() => resendInvitation(guest.id)}>
                                  Resend Invitation
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => removeGuest(guest.id)}
                              >
                                Remove Guest
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {guest.accessType === 'owner' && (
                            <DropdownMenuItem disabled>
                              Event Owner
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
      
      <div className="mt-8 mb-4">
        <h2 className="text-xl font-bold mb-2">Bulk Actions</h2>
        <p className="text-gray-500 mb-4">Options for inviting multiple guests at once</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Send personalized email invitations to multiple people at once
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setInviteDialogOpen(true)}
              >
                <MailIcon className="h-4 w-4 mr-2" />
                Invite via Email
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">QR Code Poster</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Generate a printable QR code poster to display at your event
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Generate QR Poster
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Import guests from your contacts or a CSV file
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                <ChevronDownIcon className="h-4 w-4 mr-2" />
                Import Guests
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}