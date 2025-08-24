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
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getEventCoHosts,
  manageCoHost,
  type CoHostData
} from '@/services/apis/cohost.api';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { EventFormData } from '@/types/events';

interface TeamTabProps {
  eventId: string;
  authToken: string;
  isEventCreator: boolean;
  formData: EventFormData;
}

const TeamTab: React.FC<TeamTabProps> = ({ eventId, authToken, isEventCreator, formData }) => {
  const [coHostData, setCoHostData] = useState<CoHostData | null>(null);
  const [isLoadingCoHosts, setIsLoadingCoHosts] = useState(true);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState('');

  // Load co-host data
  useEffect(() => {
    loadCoHostData();
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

      if (error.response?.status === 404) {
        toast.error('Team endpoint not found');
      } else if (error.response?.status === 403) {
        toast.error('You don\'t have permission to view team members');
      } else {
        toast.error('Failed to load team members');
      }
    } finally {
      setIsLoadingCoHosts(false);
    }
  };

  const handleRemoveCoHost = async (userId: string, userName: string) => {
    try {
      setRemovingUserId(userId);

      const response = await manageCoHost(eventId, userId, 'remove', authToken);

      if (response.status) {
        toast.success(`${userName} removed successfully! They can rejoin using the invite link.`);
        await loadCoHostData(); // Reload data
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
        await loadCoHostData(); // Reload data
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
        await loadCoHostData(); // Reload data
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
      return <Badge variant="outline" className="text-xs text-red-600 border-red-200"><UserX className="w-3 h-3 mr-1" />Blocked</Badge>;
    }
    return <Badge variant="outline" className="text-xs"><UserCheck className="w-3 h-3 mr-1" />Co-host</Badge>;
  };

  // Get all team members (creator + approved co-hosts + blocked co-hosts for creator to manage)
  const getAllTeamMembers = () => {
    if (!coHostData) return [];

    const members = [];

    // Add creator first
    if (coHostData.event_creator) {
      members.push({
        id: coHostData.event_creator._id,
        name: coHostData.event_creator.name,
        email: coHostData.event_creator.email,
        isCreator: true,
        status: 'creator'
      });
    }

    // Add approved co-hosts
    if (coHostData.co_hosts_by_status?.approved) {
      coHostData.co_hosts_by_status.approved.forEach(coHost => {
        members.push({
          id: coHost.user_id._id,
          name: coHost.user_id.name,
          email: coHost.user_id.email,
          isCreator: false,
          status: 'approved'
        });
      });
    }

    // Add blocked co-hosts (only visible to creator for management)
    if (isEventCreator && coHostData.co_hosts_by_status?.blocked) {
      coHostData.co_hosts_by_status?.blocked.forEach(coHost => {
        members.push({
          id: coHost.user_id._id,
          name: coHost.user_id.name,
          email: coHost.user_id.email,
          isCreator: false,
          status: 'blocked'
        });
      });
    }

    return members;
  };

  const getCoHostInviteUrl = () => {
    if (!formData.co_host_invite_token.token) return '';
    return `${window.location.origin}/join-cohost/${formData.co_host_invite_token.token}`;
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
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Invite Co-hosts
          </h3>
          <p className="text-sm text-gray-600">
            Share this link to invite trusted friends to help manage your event and approve photos.
          </p>
        </div>

        {/* Right Column - Invite Link */}
        <div className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Co-host invitation link</Label>
              <Badge variant="secondary" className="text-xs">
                Team Access
              </Badge>
            </div>
            <div className="flex gap-2">
              <Input
                value={getCoHostInviteUrl()}
                readOnly
                className="font-mono text-sm bg-gray-50 h-11"
              />
              <Button
                onClick={() => copyToClipboard(getCoHostInviteUrl(), 'cohost')}
                variant="outline"
                size="sm"
                className="px-3 h-11"
              >
                {copiedLink === 'cohost' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Co-hosts can help manage the event, approve photos, and invite other team members
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Team Members Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Left Column - Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Team Members
          </h3>
          <p className="text-sm text-gray-600">
            Manage your event team. Remove or block members as needed to keep your event secure.
          </p>
        </div>

        {/* Right Column - Team Table */}
        <div className="lg:col-span-2">
          {isLoadingCoHosts ? (
            <div className="flex items-center justify-center py-12 border rounded-lg bg-gray-50">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading team members...</span>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Users className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="text-base font-medium text-gray-600">No team members yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Share the invitation link above to add co-hosts
              </p>
            </div>
          ) : (
            <div className="border rounded-lg bg-white">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Team Members</span>
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
                          <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getRoleBadge(member.isCreator, member.status)}
                      </TableCell>

                      {isEventCreator && (
                        <TableCell className="text-right">
                          {member.isCreator ? (
                            <span className="text-xs text-gray-500">Event Owner</span>
                          ) : member.status === 'blocked' ? (
                            // Blocked co-host - show unblock option
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
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Unblock Co-host
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            // Active co-host - show remove and block options
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
                                    className="text-sm text-red-600 hover:text-red-700"
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
                                      className="bg-red-600 hover:bg-red-700"
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