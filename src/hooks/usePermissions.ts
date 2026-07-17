import { useMemo } from 'react';
import type { UserProfile, UserRole } from '../types/user';
import { useAuth } from './useAuth';

export function hasRole(user: UserProfile | null | undefined, roles: UserRole[]) {
  return Boolean(user?.roleKey && roles.includes(user.roleKey));
}

export function getPermissions(user: UserProfile | null | undefined) {
  const isAdmin = hasRole(user, ['admin']);
  return {
    canAccessAdmin: isAdmin || hasRole(user, ['curator', 'moderator']),
    canReviewContributions: isAdmin || hasRole(user, ['curator']),
    canModerateComments: isAdmin || hasRole(user, ['moderator']),
    canViewAudit: isAdmin,
    canManageRoles: isAdmin,
    canViewModerationHistory: isAdmin || hasRole(user, ['curator', 'moderator']),
    canPublishOfficialUpdate: isAdmin || hasRole(user, ['verified_organization', 'moderator']),
  };
}

export function usePermissions(userOverride?: UserProfile | null) {
  const auth = useAuth();
  const user = userOverride === undefined ? auth.user : userOverride;
  return useMemo(() => getPermissions(user), [user]);
}
