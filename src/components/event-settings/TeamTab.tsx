import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Trash2,
  Crown,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  Check,
  Copy,
  UserPlus,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getEventCoHosts,
  manageCoHost,
  createCoHostInvite,
  getCoHostInviteDetails,
  type CoHostData
} from '@/services/apis/cohost.api';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface TeamTabProps {
  eventId: string;
  authToken: string;
  isEventCreator: boolean;
}

const TeamTab: React.FC<TeamTabProps> = ({ eventId, authToken, isEventCreator }) => {
  const [coHostData, setCoHostData] = useState<CoHostData | null>(null);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [isLoadingCoHosts, setIsLoadingCoHosts] = useState(true);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState('');

  // Load data on mount
  useEffect(() => {
    loadCoHostData();
    loadInviteDetails();
  }, [eventId, authToken]);

  const loadCoHostData = async () => {
    try {
      setIsLoadingCoHosts(true);
      const response = await getEventCoHosts(eventId, authToken);

      if (response.status) {
        setCoHostData(response.data);
      } else {
        toast.error('Failed to load team members');
      }
    } catch (error: any) {
      console.error('Error loading co-host data:', error);
      if (error.response?.status === 403) {
        toast.error('You don\'t have permission to view team members');
      } else {
        toast.error('Failed to load team members');
      }
    } finally {
      setIsLoadingCoHosts(false);
    }
  };

  const loadInviteDetails = async () => {
    try {
      setIsLoadingInvite(true);
      const response = await getCoHostInviteDetails(eventId, authToken);

      if (response.status && response.data?.has_invites) {
        // Get the first active invitation
        const activeInvite = response.data.invitations?.[0];
        setInviteDetails(activeInvite);
      } else {
        setInviteDetails(null);
      }
    } catch (error: any) {
      console.error('Error loading invite details:', error);
      setInviteDetails(null);
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      setIsCreatingInvite(true);
      const response = await createCoHostInvite(
        eventId,
        {
          maxUses: 10,
          expiresInHours: 168 // 7 days
        },
        authToken
      );

      if (response.status) {
        toast.success('Co-host invite created successfully!');
        await loadInviteDetails(); // Reload invite details
      } else {
        toast.error(response.message || 'Failed to create invite');
      }
    } catch (error: any) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create co-host invite');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRemoveCoHost = async (userId: string, userName: string) => {
    try {
      setRemovingUserId(userId);
      const response = await manageCoHost(eventId, userId, 'remove', authToken);

      if (response.status) {
        toast.success(`${userName} removed successfully! They can rejoin using the invite link.`);
        await loadCoHostData();
      } else {
        toast.error(response.message || 'Failed to remove co-host');
      }
    } catch (error: any) {
      console.error('Error removing co-host:', error);
      toast.error('Failed to remove co-host');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleBlockCoHost = async (userId: string, userName: string) => {
    try {
      setRemovingUserId(userId);
      const response = await manageCoHost(eventId, userId, 'block', authToken);

      if (response.status) {
        toast.success(`${userName} blocked successfully! They cannot rejoin via invite link.`);
        await loadCoHostData();
      } else {
        toast.error(response.message || 'Failed to block co-host');
      }
    } catch (error: any) {
      console.error('Error blocking co-host:', error);
      toast.error('Failed to block co-host');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleUnblockCoHost = async (userId: string, userName: string) => {
    try {
      setRemovingUserId(userId);
      const response = await manageCoHost(eventId, userId, 'unblock', authToken);

      if (response.status) {
        toast.success(`${userName} unblocked and restored as co-host!`);
        await loadCoHostData();
      } else {
        toast.error(response.message || 'Failed to unblock co-host');
      }
    } catch (error: any) {
      console.error('Error unblocking co-host:', error);
      toast.error('Failed to unblock co-host');
    } finally {
      setRemovingUserId(null);
    }
  };

  const getRoleBadge = (isCreator: boolean, status?: string) => {
    if (isCreator) {
      return <Badge variant="secondary" className="text-xs"><Crown className="w-3 h-3 mr-1" />Creator</Badge>;
    }
    if (status === 'blocked') {
      return <Badge variant="outline" className="text-xs text-destructive border-destructive/20"><UserX className="w-3 h-3 mr-1" />Blocked</Badge>;
    }
    return <Badge variant="outline" className="text-xs"><UserCheck className="w-3 h-3 mr-1" />Co-host</Badge>;
  };

  const getAllTeamMembers = () => {
    if (!coHostData) return [];

    const members = [];

    // Add creator first - assuming it's from your user context
    // You may need to adjust this based on how you get creator info
    members.push({
      id: coHostData.event_creator,
      name: 'Event Creator', // You may need to fetch creator details separately
      email: '', // You may need to fetch creator details separately
      isCreator: true,
      status: 'creator'
    });

    // Add co-hosts
    if (coHostData.co_hosts) {
      coHostData.co_hosts.forEach(coHost => {
        members.push({
          id: coHost.user_id,
          name: coHost.user_info.name,
          email: coHost.user_info.email,
          isCreator: false,
          status: coHost.status
        });
      });
    }

    return members;
  };

  const getCoHostInviteUrl = () => {
    if (!inviteDetails?.invite_link) return '';
    return inviteDetails.invite_link;
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      toast.success("Link copied!");
      setTimeout(() => setCopiedLink(''), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const teamMembers = getAllTeamMembers();

  return (
    <div className="space-y-12">
      {/* Co-host Invitation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            Invite Co-hosts
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Invite trusted friends to help manage your event.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Co-host invitation link</Label>
              <Badge variant="secondary" className="text-xs">
                Team Access
              </Badge>
            </div>

            {inviteDetails ? (
              <div className="flex gap-2">
                <Input
                  value={getCoHostInviteUrl()}
                  readOnly
                  className="font-mono text-sm bg-muted/50 h-11"
                />
                <Button
                  onClick={() => copyToClipboard(getCoHostInviteUrl(), 'cohost')}
                  variant="outline"
                  size="sm"
                  className="px-3 h-11"
                >
                  {copiedLink === 'cohost' ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 h-11 bg-muted/30 border rounded-md flex items-center px-3 text-sm text-muted-foreground">
                  No active invite link
                </div>
                <Button
                  onClick={handleCreateInvite}
                  disabled={isCreatingInvite}
                  size="sm"
                  className="px-3 h-11"
                >
                  {isCreatingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Co-hosts can manage the event, approve photos, and invite team members
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border"></div>

      {/* Team Members Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            Team Members
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage your event team and member permissions.
          </p>
        </div>

        <div className="lg:col-span-2">
          {isLoadingCoHosts ? (
            <div className="flex items-center justify-center py-12 border rounded-lg bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading team members...</span>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card">
              <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-base font-medium text-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share the invitation link above to add co-hosts
              </p>
            </div>
          ) : (
            <div className="border rounded-lg bg-card overflow-hidden">
              <div className="p-4 border-b bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Team Members</span>
                  <Badge variant="secondary" className="text-xs">
                    {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    {isEventCreator && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-foreground text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground">{member.name}</div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getRoleBadge(member.isCreator, member.status)}
                      </TableCell>

                      {isEventCreator && (
                        <TableCell className="text-right">
                          {member.isCreator ? (
                            <span className="text-xs text-muted-foreground">Event Owner</span>
                          ) : member.status === 'blocked' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-sm"
                                  disabled={removingUserId === member.id}
                                >
                                  {removingUserId === member.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Shield className="w-4 h-4 mr-1" />
                                  )}
                                  Unblock
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unblock Co-host</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to unblock <strong>{member.name}</strong>?
                                    They will be restored as a co-host and can use the invite link again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleUnblockCoHost(member.id, member.name)}
                                    className="bg-primary hover:bg-primary/90"
                                  >
                                    Unblock Co-host
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-sm"
                                    disabled={removingUserId === member.id}
                                  >
                                    {removingUserId === member.id ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4 mr-1" />
                                    )}
                                    Remove
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Co-host</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{member.name}</strong> as a co-host?
                                      They will lose co-host access but can rejoin using the invite link.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveCoHost(member.id, member.name)}
                                    >
                                      Remove Co-host
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-sm text-destructive hover:text-destructive"
                                    disabled={removingUserId === member.id}
                                  >
                                    <UserX className="w-4 h-4 mr-1" />
                                    Block
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Block Co-host</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to block <strong>{member.name}</strong>?
                                      They will lose co-host access and cannot rejoin using the invite link until unblocked.
                                      <br /><br />
                                      <strong>Use this option if you don't want them to rejoin.</strong>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleBlockCoHost(member.id, member.name)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Block Co-host
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamTab;