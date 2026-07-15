import type { UserProfile } from '../types';
import type { FacilityRole, FacilityUserAccess } from './types';

const READ_ONLY_USER_EMAILS = new Set([
  'ikh831@dongyang.ac.kr',
  'seakim@dongyang.ac.kr',
]);

export const isReadOnlyFacilityUser = (user: Pick<UserProfile, 'email'>): boolean =>
  READ_ONLY_USER_EMAILS.has(user.email.toLowerCase());

export const mapUserProfileToFacilityRole = (user: UserProfile): FacilityRole => {
  if (isReadOnlyFacilityUser(user)) return 'user';
  if (user.role === '팀장') return 'admin';
  return 'staff';
};

export const createDefaultUserAccess = (
  users: UserProfile[],
  now = new Date().toISOString(),
): FacilityUserAccess[] => users.map((user) => ({
  userId: user.id,
  role: mapUserProfileToFacilityRole(user),
  active: true,
  updatedAt: now,
}));

export const reconcileUserAccess = (
  users: UserProfile[],
  savedAccess: FacilityUserAccess[],
  now = new Date().toISOString(),
): FacilityUserAccess[] => {
  const savedByUser = new Map(savedAccess.map((item) => [item.userId, item]));
  return users.map((user) => {
    const saved = savedByUser.get(user.id);
    const defaultRole = mapUserProfileToFacilityRole(user);
    return {
      userId: user.id,
      role: isReadOnlyFacilityUser(user) ? 'user' : saved?.role === 'admin' ? 'admin' : defaultRole,
      active: true,
      updatedAt: saved?.updatedAt || now,
    };
  });
};

export const getEffectiveFacilityRole = (
  accessList: FacilityUserAccess[],
  user: UserProfile,
): FacilityRole => {
  if (isReadOnlyFacilityUser(user)) return 'user';
  const access = accessList.find((item) => item.userId === user.id);
  return access?.role === 'admin' ? 'admin' : mapUserProfileToFacilityRole(user);
};

export const updateUserAccessRole = (
  accessList: FacilityUserAccess[],
  userId: string,
  role: FacilityRole,
  now = new Date().toISOString(),
): FacilityUserAccess[] => accessList.map((item) => item.userId === userId ? {
  ...item,
  role: role === 'admin' ? 'admin' : role === 'user' ? 'user' : 'staff',
  active: true,
  updatedAt: now,
} : item);

export const updateUserAccessActive = (
  accessList: FacilityUserAccess[],
  userId: string,
  active: boolean,
  now = new Date().toISOString(),
): FacilityUserAccess[] => accessList.map((item) => item.userId === userId ? { ...item, active, updatedAt: now } : item);
