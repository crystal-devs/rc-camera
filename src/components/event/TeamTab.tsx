import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getEventCoHosts,
  manageCoHost,
  type CoHostData
} from '@/services/apis/cohost.api';

interface TeamTabProps {
  eventId: string;
  authToken: string;
  isEventCreator: boolean;
}

const TeamTab: React.FC<TeamTabProps> = ({ eventId, authToken, isEventCreator }) => {
  const [coHostData, setCoHostData] = useState<CoHostData | null>(null);
  const [isLoadingCoHosts, setIsLoadingCoHosts] = useState(true);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

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
      return <Badge className="bg-blue-100 text-blue-800"><Crown className="w-3 h-3 mr-1" />Creator</Badge>;
    }
    if (status === 'blocked') {
      return <Badge className="bg-red-100 text-red-800"><UserX className="w-3 h-3 mr-1" />Blocked</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Co-host</Badge>;
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

  const teamMembers = getAllTeamMembers();

  return (
    <div className="space-y-6">
      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </div>
            <Badge variant="secondary">
              {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCoHosts ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading team members...</span>
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team members found</p>
              <p className="text-xs">
                {coHostData ? 'No co-hosts have been added yet' : 'Failed to load team data'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email / Username</TableHead>
                    <TableHead>Role</TableHead>
                    {isEventCreator && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{member.name}</div>
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
                            // Blocked co-host - show unblock option
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-green-600 hover:text-green-700"
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
                                    className="bg-green-600 hover:bg-green-700"
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
                                    className="text-orange-600 hover:text-orange-700"
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
                                      className="bg-orange-600 hover:bg-orange-700"
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
                                    className="text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTab;