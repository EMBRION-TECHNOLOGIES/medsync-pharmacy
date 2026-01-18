'use client';

import { useMemo } from 'react';
import { usePharmacyStaff, useLocations } from '@/features/pharmacy/hooks';
import { useOrg } from '@/store/useOrg';
import { CreateUserDialog } from '@/components/staff/CreateUserDialog';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  MapPin, 
  Crown, 
  Shield, 
  UserCheck, 
  User,
  Mail,
  Calendar,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/hooks';

const roleConfig = {
  PHARMACY_OWNER: {
    label: 'Pharmacy Owner',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Crown,
    description: 'Full system access across all locations',
    scope: 'org',
  },
  SUPERINTENDENT_PHARMACIST: {
    label: 'Superintendent Pharmacist',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Shield,
    description: 'Regulatory oversight across all locations',
    scope: 'org',
  },
  SUPERVISING_PHARMACIST: {
    label: 'Supervising Pharmacist',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: UserCheck,
    description: 'Location supervisor with operational access',
    scope: 'location',
  },
  STAFF: {
    label: 'Staff',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: User,
    description: 'Basic operational access',
    scope: 'location',
  },
};

interface StaffMember {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  roleType?: string;
  locationId?: string | null;
  locationName?: string;
  location?: { id: string; name: string };
  user?: { firstName?: string; lastName?: string; email?: string };
  createdAt?: string;
  acceptedAt?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function StaffCard({ member, isCurrentUser }: { member: StaffMember; isCurrentUser: boolean }) {
  const roleType = (member.roleType || member.role || 'STAFF') as keyof typeof roleConfig;
  const config = roleConfig[roleType] || roleConfig.STAFF;
  const Icon = config.icon;
  
  const name = member.name || 
    `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || 
    member.email?.split('@')[0] || 
    'Unknown';
  const email = member.email || member.user?.email || '';
  const joinDate = member.createdAt || member.acceptedAt;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
        <AvatarFallback className={config.color}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium truncate">
            {name}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">(You)</span>
            )}
          </h4>
          <Badge variant="outline" className={`${config.color} text-xs`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3" />
            {email}
          </span>
          {joinDate && (
            <span className="hidden sm:flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(joinDate), 'MMM dd, yyyy')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { pharmacyId, locationId, locationName } = useOrg();
  const { data: staff, isLoading: staffLoading } = usePharmacyStaff(pharmacyId);
  const { data: locations, isLoading: locationsLoading } = useLocations(pharmacyId);
  const { user } = useAuth();

  const isLoading = staffLoading || locationsLoading;
  
  // Filter by selected location if one is selected
  const isFilteredByLocation = !!locationId;

  // Group staff by role scope and location
  const groupedStaff = useMemo(() => {
    if (!staff) return { orgWide: [], byLocation: {}, filteredStaff: [] };

    const orgWide: StaffMember[] = [];
    const byLocation: Record<string, StaffMember[]> = {};
    let filteredStaff: StaffMember[] = [];

    // Add current user to org-wide if they're the owner and not in staff list
    if (user && !staff.find((m: StaffMember) => m.userId === user.id || m.id === user.id)) {
      if (user.role === 'PHARMACY_OWNER') {
        const ownerMember = {
          id: user.id,
          userId: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0],
          email: user.email,
          roleType: 'PHARMACY_OWNER',
          createdAt: new Date().toISOString(),
        };
        orgWide.push(ownerMember);
        // Owner is always visible regardless of location filter
        if (isFilteredByLocation) {
          filteredStaff.push(ownerMember);
        }
      }
    }

    staff.forEach((member: StaffMember) => {
      const roleType = member.roleType || member.role;
      const isOrgScoped = roleType === 'PHARMACY_OWNER' || roleType === 'SUPERINTENDENT_PHARMACIST';

      if (isOrgScoped || !member.locationId) {
        orgWide.push(member);
        // Org-scoped staff are always visible
        if (isFilteredByLocation) {
          filteredStaff.push(member);
        }
      } else {
        const locId = member.locationId;
        if (!byLocation[locId]) {
          byLocation[locId] = [];
        }
        byLocation[locId].push(member);
        
        // Add to filtered list if matches selected location
        if (isFilteredByLocation && locId === locationId) {
          filteredStaff.push(member);
        }
      }
    });

    // Sort org-wide by role hierarchy
    const roleOrder = ['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST', 'STAFF'];
    orgWide.sort((a, b) => {
      const aOrder = roleOrder.indexOf(a.roleType || a.role || 'STAFF');
      const bOrder = roleOrder.indexOf(b.roleType || b.role || 'STAFF');
      return aOrder - bOrder;
    });

    // Sort each location's staff by role
    Object.keys(byLocation).forEach(locId => {
      byLocation[locId].sort((a, b) => {
        const aOrder = roleOrder.indexOf(a.roleType || a.role || 'STAFF');
        const bOrder = roleOrder.indexOf(b.roleType || b.role || 'STAFF');
        return aOrder - bOrder;
      });
    });

    // Sort filtered staff by role
    filteredStaff.sort((a, b) => {
      const aOrder = roleOrder.indexOf(a.roleType || a.role || 'STAFF');
      const bOrder = roleOrder.indexOf(b.roleType || b.role || 'STAFF');
      return aOrder - bOrder;
    });

    return { orgWide, byLocation, filteredStaff };
  }, [staff, user, isFilteredByLocation, locationId]);

  // Get location name by ID
  const getLocationName = (locationId: string) => {
    const location = locations?.find((l: { id: string; name: string }) => l.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const totalStaff = (staff?.length || 0) + (groupedStaff.orgWide.length > (staff?.filter((m: StaffMember) => 
    m.roleType === 'PHARMACY_OWNER' || m.roleType === 'SUPERINTENDENT_PHARMACIST' || !m.locationId
  ).length || 0) ? 1 : 0);

  const locationCount = Object.keys(groupedStaff.byLocation).length;

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER', 'SUPERINTENDENT_PHARMACIST', 'SUPERVISING_PHARMACIST']}>
      <div className="space-y-6 px-4 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Staff</h1>
              {isFilteredByLocation && locationName && (
                <Badge variant="outline" className="text-xs">
                  {locationName}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {isFilteredByLocation 
                ? `Staff assigned to ${locationName} (plus org-wide roles)`
                : `Manage your pharmacy team across ${locationCount > 0 ? `${locationCount + 1} locations` : 'all locations'}`
              }
            </p>
          </div>
          {pharmacyId && <CreateUserDialog pharmacyId={pharmacyId} />}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {isFilteredByLocation ? groupedStaff.filteredStaff.length : (staff?.length || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isFilteredByLocation ? 'Visible Staff' : 'Total Staff'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groupedStaff.orgWide.length}</p>
                  <p className="text-xs text-muted-foreground">Org-Wide</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {isFilteredByLocation ? 1 : locationCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isFilteredByLocation ? 'Selected Location' : 'Locations with Staff'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <UserCheck className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {isFilteredByLocation 
                      ? groupedStaff.filteredStaff.filter((m: StaffMember) => m.roleType === 'SUPERVISING_PHARMACIST').length
                      : (staff?.filter((m: StaffMember) => m.roleType === 'SUPERVISING_PHARMACIST').length || 0)
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Supervisors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : isFilteredByLocation ? (
          /* Filtered View - Show staff for selected location */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                {locationName}
              </CardTitle>
              <CardDescription>
                Staff assigned to this location plus organization-wide roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedStaff.filteredStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No staff assigned to this location
                </p>
              ) : (
                groupedStaff.filteredStaff.map((member) => (
                  <StaffCard 
                    key={member.id} 
                    member={member} 
                    isCurrentUser={member.userId === user?.id || member.id === user?.id}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Staff</TabsTrigger>
              <TabsTrigger value="by-location">By Location</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {/* Organization-Wide Staff */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Organization-Wide
                  </CardTitle>
                  <CardDescription>
                    Staff with access across all locations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedStaff.orgWide.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No organization-wide staff
                    </p>
                  ) : (
                    groupedStaff.orgWide.map((member) => (
                      <StaffCard 
                        key={member.id} 
                        member={member} 
                        isCurrentUser={member.userId === user?.id || member.id === user?.id}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Location-Specific Staff */}
              {Object.entries(groupedStaff.byLocation).map(([locationId, members]) => (
                <Card key={locationId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      {getLocationName(locationId)}
                    </CardTitle>
                    <CardDescription>
                      {members.length} staff member{members.length !== 1 ? 's' : ''} assigned
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {members.map((member) => (
                      <StaffCard 
                        key={member.id} 
                        member={member} 
                        isCurrentUser={member.userId === user?.id || member.id === user?.id}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}

              {Object.keys(groupedStaff.byLocation).length === 0 && groupedStaff.orgWide.length > 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No location-specific staff yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add locations and assign supervising pharmacists to manage them
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="by-location" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Org-Wide Card */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        All Locations
                      </CardTitle>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {groupedStaff.orgWide.length} staff
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {groupedStaff.orgWide.slice(0, 4).map((member) => {
                        const roleType = (member.roleType || member.role || 'STAFF') as keyof typeof roleConfig;
                        const config = roleConfig[roleType] || roleConfig.STAFF;
                        const name = member.name || 
                          `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || 
                          'Unknown';
                        return (
                          <div key={member.id} className="flex items-center gap-2 text-sm">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`${config.color} text-xs`}>
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate flex-1">{name}</span>
                            <Badge variant="outline" className={`${config.color} text-xs`}>
                              {config.label.split(' ')[0]}
                            </Badge>
                          </div>
                        );
                      })}
                      {groupedStaff.orgWide.length > 4 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{groupedStaff.orgWide.length - 4} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Location Cards */}
                {locations?.map((location: { id: string; name: string }) => {
                  const locationStaff = groupedStaff.byLocation[location.id] || [];
                  return (
                    <Card key={location.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-green-600" />
                            {location.name}
                          </CardTitle>
                          <Badge variant="outline" className={locationStaff.length > 0 ? 'bg-green-50 text-green-700' : ''}>
                            {locationStaff.length} staff
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {locationStaff.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No staff assigned
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {locationStaff.slice(0, 4).map((member) => {
                              const roleType = (member.roleType || member.role || 'STAFF') as keyof typeof roleConfig;
                              const config = roleConfig[roleType] || roleConfig.STAFF;
                              const name = member.name || 
                                `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || 
                                'Unknown';
                              return (
                                <div key={member.id} className="flex items-center gap-2 text-sm">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className={`${config.color} text-xs`}>
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate flex-1">{name}</span>
                                  <Badge variant="outline" className={`${config.color} text-xs`}>
                                    {config.label.split(' ')[0]}
                                  </Badge>
                                </div>
                              );
                            })}
                            {locationStaff.length > 4 && (
                              <p className="text-xs text-muted-foreground text-center pt-1">
                                +{locationStaff.length - 4} more
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Role Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Role Hierarchy</CardTitle>
            <CardDescription>Understanding staff roles and their access levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(roleConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {config.scope === 'org' ? 'All Locations' : 'Single Location'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
