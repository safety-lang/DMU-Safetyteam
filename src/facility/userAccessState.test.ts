import { DEFAULT_USERS } from '../initialData';
import {
  createDefaultUserAccess,
  getEffectiveFacilityRole,
  reconcileUserAccess,
  updateUserAccessRole,
} from './userAccessState';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const now = '2026-05-27T00:00:00Z';
const accessList = createDefaultUserAccess(DEFAULT_USERS, now);
const manager = DEFAULT_USERS.find((user) => user.role === '팀장');
const staff = DEFAULT_USERS.find((user) => user.role === '과장');
const readOnlyStaff = DEFAULT_USERS.find((user) => user.email === 'ikh831@dongyang.ac.kr');

assert(Boolean(manager && staff), 'default users should include manager and staff');
assert(accessList.length === DEFAULT_USERS.length, 'default access should include all users');
assert(manager ? getEffectiveFacilityRole(accessList, manager) === 'admin' : false, 'manager should be admin');
assert(staff ? getEffectiveFacilityRole(accessList, staff) === 'staff' : false, 'staff should be staff');
assert(readOnlyStaff ? getEffectiveFacilityRole(accessList, readOnlyStaff) === 'user' : false, 'selected staff should be read-only');

const promoted = staff ? updateUserAccessRole(accessList, staff.id, 'admin', now) : accessList;
assert(staff ? getEffectiveFacilityRole(promoted, staff) === 'admin' : false, 'admin checkbox should promote team member');

const demoted = staff ? updateUserAccessRole(promoted, staff.id, 'staff', now) : promoted;
assert(staff ? getEffectiveFacilityRole(demoted, staff) === 'staff' : false, 'unchecked admin should return to team member role');

const reconciled = reconcileUserAccess(DEFAULT_USERS, [{ userId: staff?.id || 'missing', role: 'user', active: false, updatedAt: now }], now);
assert(reconciled.length === DEFAULT_USERS.length, 'reconcile should restore missing users');
assert(reconciled.every((item) => item.active), 'facility team members should stay active');
assert(staff ? getEffectiveFacilityRole(reconciled, staff) === 'staff' : false, 'old non-admin roles should normalize to team member');

const readOnlyPromoted = readOnlyStaff ? updateUserAccessRole(accessList, readOnlyStaff.id, 'admin', now) : accessList;
assert(readOnlyStaff ? getEffectiveFacilityRole(readOnlyPromoted, readOnlyStaff) === 'user' : false, 'read-only staff should not become admin');

console.log('user access state tests passed');
