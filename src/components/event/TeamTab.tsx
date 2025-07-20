import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Plus,
  Link,
  Copy,
  MoreHorizontal,
  UserCheck,
  UserX,
  Trash2,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Upload,
  Download,
  MessageSquare,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateCoHostInvite,
  getCoHostInvite,
  deactivateCoHostInvite,
  getEventCoHosts,
  manageCoHost,
  getCoHostInviteLink,
  validateCoHostInvite,
  type CoHostInvite,
  type CoHostData,
  type CoHost
} from '@/services/apis/cohost.api';

interface TeamTabProps {
  eventId: string;
  authToken: string;
  isEventCreator: boolean;
}

const TeamTab: React.FC<TeamTabProps> = ({ eventId, authToken, isEventCreator }) => {
  const [coHostInvite, setCoHostInvite] = useState<CoHostInvite | null>(null);
  const [coHostData, setCoHostData] = useState<CoHostData | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isLoadingCoHosts, setIsLoadingCoHosts] = useState(true);
  const [inviteSettings, setInviteSettings] = useState({
    expiresInHours: 24,
    maxUses: 10
  });

  // Load co-host data
  useEffect(() => {
    loadCoHostData();
  }, [eventId, authToken]);

  const loadCoHostData = async () => {
    try {
      setIsLoadingCoHosts(true);

      // Load co-hosts and invite details in parallel
      const [coHostsResponse, inviteResponse] = await Promise.allSettled([
        getEventCoHosts(eventId, authToken),
        getCoHostInvite(eventId, authToken)
      ]);

      // Handle co-hosts data
      if (coHostsResponse.status === 'fulfilled' && coHostsResponse.value.status) {
        setCoHostData(coHostsResponse.value.data);
      }

      // Handle invite data
      if (inviteResponse.status === 'fulfilled' && inviteResponse.value.status) {
        setCoHostInvite(inviteResponse.value.data);
      }
    } catch (error) {
      console.error('Error loading co-host data:', error);
      toast.error('Failed to load co-host data');
    } finally {
      setIsLoadingCoHosts(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setIsGeneratingInvite(true);

      const response = await generateCoHostInvite(
        eventId,
        inviteSettings.expiresInHours,
        inviteSettings.maxUses,
        authToken
      );

      if (response.status && response.data) {
        setCoHostInvite(response.data);
        toast.success('Co-host invite generated successfully!');
      }
    } catch (error) {
      console.error('Error generating co-host invite:', error);
      toast.error('Failed to generate co-host invite');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleDeactivateInvite = async () => {
    try {
      const response = await deactivateCoHostInvite(eventId, authToken);

      if (response.status) {
        setCoHostInvite(null);
        toast.success('Co-host invite deactivated successfully!');
      }
    } catch (error) {
      console.error('Error deactivating co-host invite:', error);
      toast.error('Failed to deactivate co-host invite');
    }
  };

  const handleCopyInviteLink = () => {
    if (coHostInvite) {
      navigator.clipboard.writeText(coHostInvite.invite_link);
      toast.success('Invite link copied to clipboard!');
    }
  };

  const handleManageCoHost = async (userId: string, action: 'approve' | 'reject' | 'remove') => {
    try {
      const response = await manageCoHost(eventId, userId, action, authToken);

      if (response.status) {
        toast.success(`Co-host ${action}d successfully!`);
        // Reload co-host data
        await loadCoHostData();
      }
    } catch (error) {
      console.error(`Error ${action}ing co-host:`, error);
      toast.error(`Failed to ${action} co-host`);
    }
  };

  const getStatusBadge = (status: CoHost['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'removed':
        return <Badge className="bg-gray-100 text-gray-800"><Trash2 className="w-3 h-3 mr-1" />Removed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPermissionIcons = (permissions: CoHost['permissions']) => {
    const icons = [];
    if (permissions.manage_content) icons.push(<Upload key="content" className="w-4 h-4" title="Manage Content" />);
    if (permissions.manage_guests) icons.push(<Users key="guests" className="w-4 h-4" title="Manage Guests" />);
    if (permissions.manage_settings) icons.push(<Settings key="settings" className="w-4 h-4" title="Manage Settings" />);
    if (permissions.approve_content) icons.push(<Shield key="approve" className="w-4 h-4" title="Approve Content" />);

    return (
      <div className="flex gap-1 text-muted-foreground">
        {icons.length > 0 ? icons : <span className="text-xs">No permissions</span>}
      </div>
    );
  };

  const inviteValidation = validateCoHostInvite(coHostInvite);

  return (
    <div className="space-y-6">
      {/* Co-host Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="w-5 h-5" />
            Co-host Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!coHostInvite || !inviteValidation.isValid ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a secure invite link that others can use to request co-host access to your event.
              </p>

              {!inviteValidation.isValid && coHostInvite && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Current invite is {inviteValidation.reason}
                    </span>
                  </div>
                </div>
              )}


              <Button
                onClick={handleGenerateInvite}
                disabled={isGeneratingInvite || !isEventCreator}
                className="w-full"
              >
                {isGeneratingInvite ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Generate Invite Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">Active Invite Link</span>
                  {/* <Badge className="bg-green-100 text-green-800">
                    {coHostInvite.used_count}/{coHostInvite.max_uses} uses
                  </Badge> */}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={coHostInvite.invite_link}
                    readOnly
                    className="text-xs bg-white"
                  />
                  <Button size="sm" onClick={handleCopyInviteLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInviteLink}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Co-hosts Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Event Co-hosts
            </div>
            {coHostData && (
              <Badge variant="secondary">
                {coHostData.summary.approved} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCoHosts ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : !coHostData || Object.values(coHostData.co_hosts_by_status).every(arr => arr.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No co-hosts found</p>
              <p className="text-xs">Generate an invite link to add co-hosts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Event Creator */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {/* {coHostData.event_creator.name.charAt(0).toUpperCase()} */}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{coHostData.event_creator.name}</div>
                      <div className="text-xs text-muted-foreground">{coHostData.event_creator.email}</div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Event Creator</Badge>
                </div>
              </div>

              {/* Co-hosts Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Invited By</TableHead>
                      {isEventCreator && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Approved Co-hosts */}
                    {coHostData.co_hosts_by_status.approved.map((coHost) => (
                      <TableRow key={coHost.user_id._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                              {coHost.user_id.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{coHost.user_id.name}</div>
                              <div className="text-xs text-muted-foreground">{coHost.user_id.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(coHost.status)}</TableCell>
                        <TableCell>{getPermissionIcons(coHost.permissions)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coHost.invited_by.name}
                        </TableCell>
                        {isEventCreator && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleManageCoHost(coHost.user_id._id, 'remove')}
                                  className="text-red-600"
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}

                    {/* Pending Co-hosts */}
                    {coHostData.co_hosts_by_status.pending.map((coHost) => (
                      <TableRow key={coHost.user_id._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                              {/* {coHost.user_id.name.charAt(0).toUpperCase()} */}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{coHost.user_id.name}</div>
                              <div className="text-xs text-muted-foreground">{coHost.user_id.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(coHost.status)}</TableCell>
                        <TableCell>{getPermissionIcons(coHost.permissions)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coHost.invited_by.name}
                        </TableCell>
                        {isEventCreator && (
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManageCoHost(coHost.user_id._id, 'reject')}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}

                    {/* Rejected Co-hosts (if any, show collapsed) */}
                    {coHostData.co_hosts_by_status.rejected.length > 0 && (
                      coHostData.co_hosts_by_status.rejected.map((coHost) => (
                        <TableRow key={coHost.user_id._id} className="opacity-60">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                                {coHost.user_id.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{coHost.user_id.name}</div>
                                <div className="text-xs text-muted-foreground">{coHost.user_id.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(coHost.status)}</TableCell>
                          <TableCell>{getPermissionIcons(coHost.permissions)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {coHost.invited_by.name}
                          </TableCell>
                          {isEventCreator && (
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManageCoHost(coHost.user_id._id, 'approve')}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{coHostData.summary.approved}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{coHostData.summary.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{coHostData.summary.rejected}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{coHostData.summary.removed}</div>
                  <div className="text-xs text-muted-foreground">Removed</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Co-host Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Co-host Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Approved co-hosts can:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload and manage content</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Approve uploaded content</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>View guest list (if permitted)</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Modify event settings (if permitted)</span>
              </div>
            </div>
            <div className="text-xs mt-3 p-3 bg-muted rounded-lg">
              <strong>Note:</strong> Co-hosts cannot delete the event, remove the event creator, or manage other co-hosts unless given specific permissions.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTab;