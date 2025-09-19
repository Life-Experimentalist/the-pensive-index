/**
 * Utility functions for user role management and authorization
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { type User } from '@clerk/nextjs/server';

export type UserRole = 'ProjectAdmin' | 'FandomAdmin' | 'User';

/**
 * Extract user role from Clerk user metadata
 */
export function getUserRole(user: any): UserRole {
  return (user?.publicMetadata?.role as UserRole) || 'User';
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: any): boolean {
  const role = getUserRole(user);
  return role === 'ProjectAdmin' || role === 'FandomAdmin';
}

/**
 * Check if user has project admin privileges
 */
export function isProjectAdmin(user: any): boolean {
  const role = getUserRole(user);
  return role === 'ProjectAdmin';
}

/**
 * Check if user has fandom admin privileges
 */
export function isFandomAdmin(user: any): boolean {
  const role = getUserRole(user);
  return role === 'FandomAdmin';
}

/**
 * Get user display name with role badge
 */
export function getUserDisplayInfo(user: any) {
  const role = getUserRole(user);
  const displayName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User';

  return {
    name: displayName,
    role,
    isAdmin: isAdmin(user),
    isProjectAdmin: isProjectAdmin(user),
    isFandomAdmin: isFandomAdmin(user),
  };
}
