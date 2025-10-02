// app/events/[eventId]/guests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  UserPlusIcon,
  CopyIcon,
  QrCodeIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  MoreHorizontalIcon,
  SearchIcon,
  XIcon,
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  BarChart3Icon,
  UploadIcon,
  RefreshCwIcon,
  Trash2Icon,
  EyeIcon,
} from 'lucide-react';
import { getEventById } from '@/services/apis/events.api';
import { useAuthToken } from '@/hooks/use-auth';

// Participant hooks
import {
  useEventParticipants,
  useParticipantStats,
  useInviteParticipants,
  useUpdateParticipant,
  useRemoveParticipant,
  useBulkParticipantOperations,
  useFilteredParticipants,
} from '@/hooks/participants.hooks';
import type { InviteParticipantRequest, ParticipantFilters } from '@/services/apis/participants.api';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";

// Types
import { Event } from '@/types/events';

interface GuestInvite {
  email: string;
  name?: string;
  role: 'co_host' | 'viewer';
}

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function GuestManagementPage({ params }: PageProps) {
  const { eventId } = React.use(params);
  const router = useRouter();
  const authToken = useAuthToken();

  // Local state for UI
  const [event, setEvent] = useState<Event | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<ParticipantFilters>({
    role: 'all',
    status: 'all',
    sort_by: 'name',
    sort_order: 'asc',
    page: 1,
    limit: 50,
  });

  // Client-side filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'co_hosts' | 'viewers'>('all');

  // Invite form state
  const [newInvites, setNewInvites] = useState<GuestInvite[]>([
    { email: '', role: 'co_host' }
  ]);

  // Add a delayed check to avoid premature redirects
  useEffect(() => {
    const timer = setTimeout(() => {
      setTokenChecked(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // API hooks with current filters
  const currentFilters: ParticipantFilters = {
    ...filters,
    role: activeTab === 'all' ? 'all' : activeTab === 'co_hosts' ? 'co_host' : 'viewer',
  };

  const {
    participants,
    stats,
    isLoading: participantsLoading,
    error: participantsError,
    refetch: refetchParticipants,
  } = useFilteredParticipants(eventId, currentFilters, { search: searchQuery });

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useParticipantStats(eventId);

  const inviteParticipantsMutation = useInviteParticipants(eventId);
  const updateParticipantMutation = useUpdateParticipant(eventId);
  const removeParticipantMutation = useRemoveParticipant(eventId);
  const { bulkRemove } = useBulkParticipantOperations(eventId);

  // Load event data
  useEffect(() => {
    // Only proceed if either we have an authToken or the token check timeout has elapsed
    if (!authToken && !tokenChecked) {
      console.log('Waiting for auth token to load or timeout...');
      return;
    }

    const loadEvent = async () => {
      const token = authToken || localStorage.getItem('rc-token');

      // Only redirect if we've checked thoroughly for a token and still don't have one
      if (!token && tokenChecked) {
        console.log('No auth token found after timeout, redirecting to login...');
        toast.error("You need to be logged in to manage participants.");
        router.push('/login');
        return;
      }

      if (!token) return; // Don't proceed without token

      try {
        const eventData = await getEventById(eventId, token);
        if (!eventData) {
          toast.error("Event not found");
          router.push('/events');
          return;
        }
        setEvent(eventData);
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error("Failed to load event");
      } finally {
        setEventLoading(false);
      }
    };

    loadEvent();
  }, [eventId, authToken, router, tokenChecked]);

  // Handlers
  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof activeTab);
    setSelectedParticipants([]);
  };

  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSelectAll = () => {
    const allIds = participants?.map(p => p.participant_id) || [];
    setSelectedParticipants(
      selectedParticipants.length === allIds.length ? [] : allIds
    );
  };

  const handleInviteSubmit = async () => {
    const validInvites = newInvites.filter(invite => invite.email.trim() !== '');

    if (validInvites.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    const inviteRequests: InviteParticipantRequest[] = validInvites.map(invite => ({
      email: invite.email.trim(),
      name: invite.name?.trim(),
      role: invite.role,
      send_email: true,
    }));

    try {
      await inviteParticipantsMutation.mutateAsync(inviteRequests);
      setInviteDialogOpen(false);
      setNewInvites([{ email: '', role: 'co_host' }]);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeParticipantMutation.mutateAsync(participantId);
      setSelectedParticipants(prev => prev.filter(id => id !== participantId));
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateRole = async (participantId: string, role: 'co_host' | 'viewer') => {
    try {
      await updateParticipantMutation.mutateAsync({
        participantId,
        updates: { role }
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleBulkRemove = async () => {
    if (selectedParticipants.length === 0) return;

    try {
      await bulkRemove.mutateAsync(selectedParticipants);
      setSelectedParticipants([]);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getShareUrl = () => {
    return `${window.location.origin}/join?event=${eventId}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    toast.success("Share link copied to clipboard");
  };

  // Use stats from dedicated query or from participants query
  const currentStats = statsData || stats || {
    totalParticipants: 0,
    activeParticipants: 0,
    joinedParticipants: 0,
    pendingInvites: 0,
    creatorCount: 0,
    coHostCount: 0,
    viewerCount: 0,
    guestCount: 0,
    totalUploads: 0,
    totalDownloads: 0,
    totalViews: 0,
    averageEngagementScore: 0,
    participationRate: 0,
  };

  if (eventLoading || participantsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Skeleton className="h-8 w-40 mr-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <Button onClick={() => router.push('/events')}>Back to Events</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
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
            <p className="text-gray-500">Participant Management</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchParticipants();
              refetchStats();
            }}
            disabled={participantsLoading || statsLoading}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${(participantsLoading || statsLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" onClick={() => setQrDialogOpen(true)}>
            <QrCodeIcon className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {currentStats.joinedParticipants} joined, {currentStats.pendingInvites} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.participationRate}%</div>
            <Progress value={currentStats.participationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.totalUploads}</div>
            <p className="text-xs text-muted-foreground">
              {currentStats.totalViews} views, {currentStats.totalDownloads} downloads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Distribution</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Creators</span>
                <span>{currentStats.creatorCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Co-hosts</span>
                <span>{currentStats.coHostCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Viewers</span>
                <span>{currentStats.viewerCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All ({currentStats.totalParticipants})</TabsTrigger>
            <TabsTrigger value="co_hosts">Co-hosts ({currentStats.coHostCount})</TabsTrigger>
            <TabsTrigger value="viewers">Viewers ({currentStats.viewerCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedParticipants.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Actions ({selectedParticipants.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => bulkUpdateRole.mutate({
                    participantIds: selectedParticipants,
                    role: 'co_host'
                  })}
                >
                  Make Co-hosts
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => bulkUpdateRole.mutate({
                    participantIds: selectedParticipants,
                    role: 'viewer'
                  })}
                >
                  Make Viewers
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={handleBulkRemove}
                >
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  Remove Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedParticipants.length > 0 && selectedParticipants.length < (participants?.length || 0)
                      ? 'indeterminate'
                      : Boolean(participants && participants.length > 0 && selectedParticipants.length === participants.length)
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Participant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!participants || participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No participants match your search' : 'No participants yet'}
                </TableCell>
              </TableRow>
            ) : (
              participants.map((participant) => {
                const name = participant.user_info?.name || participant.guest_info?.name || 'Unknown';
                const email = participant.user_info?.email || participant.guest_info?.email || '';
                const profilePic = participant.user_info?.profile_pic;

                return (
                  <TableRow key={participant.participant_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedParticipants.includes(participant.participant_id)}
                        onCheckedChange={() => handleParticipantSelect(participant.participant_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 overflow-hidden">
                          {/* {profilePic ? (
                            <img 
                              src={profilePic} 
                              alt={name} 
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : ( */}
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          {/* )} */}
                        </div>
                        <div>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-gray-500">{email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.role === 'creator' ? (
                        <Badge>Creator</Badge>
                      ) : participant.role === 'co_host' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Co-host
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {participant.role === 'viewer' ? 'Viewer' : 'Guest'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {participant.status === 'active' ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : participant.status === 'pending' ? (
                        <div className="flex items-center text-yellow-600">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">Pending</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-600">
                          <span className="text-sm capitalize">{participant.status}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{participant.stats.uploads_count} uploads</div>
                        <div className="text-gray-500">
                          {participant.last_activity_at
                            ? format(new Date(participant.last_activity_at), 'MMM d')
                            : 'No activity'
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {participant.role !== 'creator' && (
                            <>
                              {participant.role === 'co_host' ? (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(participant.participant_id, 'viewer')}
                                >
                                  <EyeIcon className="h-4 w-4 mr-2" />
                                  Make Viewer
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(participant.participant_id, 'co_host')}
                                >
                                  <UploadIcon className="h-4 w-4 mr-2" />
                                  Make Co-host
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleRemoveParticipant(participant.participant_id)}
                              >
                                <Trash2Icon className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </>
                          )}

                          {participant.role === 'creator' && (
                            <DropdownMenuItem disabled>
                              Event Creator
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Participants to {event.name}</DialogTitle>
            <DialogDescription>
              Invite people to view or contribute photos to this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {newInvites.map((invite, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={invite.email}
                    onChange={(e) => {
                      const updated = [...newInvites];
                      updated[index] = { ...updated[index], email: e.target.value };
                      setNewInvites(updated);
                    }}
                  />
                </div>

                <Select
                  value={invite.role}
                  onValueChange={(value: 'co_host' | 'viewer') => {
                    const updated = [...newInvites];
                    updated[index] = { ...updated[index], role: value };
                    setNewInvites(updated);
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="co_host">Co-host</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (newInvites.length > 1) {
                      setNewInvites(newInvites.filter((_, i) => i !== index));
                    }
                  }}
                  disabled={newInvites.length <= 1}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setNewInvites([...newInvites, { email: '', role: 'co_host' }])}
            >
              Add Another Email
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteSubmit}
              disabled={!newInvites.some(i => i.email.trim() !== '') || inviteParticipantsMutation.isPending}
            >
              {inviteParticipantsMutation.isPending ? 'Sending...' : 'Send Invites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Event</DialogTitle>
            <DialogDescription>
              Share this link to invite people to join the event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Share Link</Label>
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

            <div className="text-center pt-4">
              <p className="text-sm font-medium mb-1">{event.name}</p>
              <p className="text-xs text-gray-500">
                {event?.access?.level === 'invited_only'
                  ? 'Invited participants only'
                  : 'Anyone with this link can join'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}