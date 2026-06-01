/**
 * System roles. Must match prisma/seed.ts (upsert by name).
 * - marketing: same team assignment model as sales (teamId on user); app access is Units (+ profile)
 *   only, with publish actions on units — no leads/dashboard/manager tabs.
 */
export const VALID_ROLE_NAMES = [
  'super_admin',
  'operation_manager',
  'sales_manager',
  'tech_lead',
  'sales',
  'marketing',
  'hr',
] as const;

export type ValidRoleName = (typeof VALID_ROLE_NAMES)[number];

/** Can create / full update / delete units (not marketing). */
export const UNIT_FULL_ACCESS_ROLES: readonly string[] = [
  'super_admin',
  'operation_manager',
  'sales_manager',
  'tech_lead',
  'sales',
];

/** Can set publish state and published URL (marketing + admins). */
export const UNIT_PUBLISH_ROLES: readonly string[] = [
  'marketing',
  'super_admin',
  'operation_manager',
];

/**
 * Campaigns UI, data batches, Excel batch import, and related APIs.
 * Excludes sales floor, marketing portal, and HR-only roles.
 */
export const CAMPAIGN_DATA_BATCH_ROLES_TUPLE: [string, ...string[]] = [
  'super_admin',
  'operation_manager',
  'sales_manager',
  'tech_lead',
];
