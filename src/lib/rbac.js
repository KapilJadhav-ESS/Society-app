// Role-based access control. Every permission check in the UI and in the
// data API goes through `can(user, permission)`.
export const ROLES = {
  super_admin: 'Super Admin',
  chairman: 'Society Chairman',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  committee: 'Committee Member',
  facility_manager: 'Facility Manager',
  security: 'Security Guard',
  resident: 'Resident'
}

const A = ['super_admin', 'chairman', 'secretary']
const P = {
  'admin.view': [...A, 'treasurer', 'committee', 'facility_manager'],
  'announcement.publish': [...A, 'committee'],
  'emergency.alert': A,
  'billing.manage': ['super_admin', 'chairman', 'treasurer'],
  'payments.view_all': ['super_admin', 'chairman', 'treasurer', 'secretary'],
  'complaints.manage': [...A, 'committee', 'facility_manager'],
  'residents.manage': A,
  'visitors.gate': ['security', 'super_admin'],
  'visitors.logs': [...A, 'security', 'facility_manager'],
  'facilities.manage': [...A, 'facility_manager'],
  'polls.create': [...A, 'committee'],
  'events.create': Object.keys(ROLES).filter((r) => r !== 'security'),
  'moderation': [...A, 'committee'],
  'reports.view': [...A, 'treasurer', 'committee'],
  'resident.features': Object.keys(ROLES).filter((r) => !['security', 'facility_manager', 'super_admin'].includes(r))
}

export const can = (user, perm) => !!user && (P[perm] || []).includes(user.role)
export const isAdmin = (user) => can(user, 'admin.view')
export const roleLabel = (r) => ROLES[r] || r
