/**
 * D1 Database Client for Development and Production
 *
 * This module provides a unified interface for accessing the database
 * using Cloudflare D1 in both local development and production.
 *
 * Architecture:
 * - Local Dev: Uses wrangler D1 local database (.wrangler/state/v3/d1)
 * - Production: Uses Cloudflare D1 remote database
 * - Migrations: Still use better-sqlite3 for file-based migration execution
 *
 * @package the-pensive-index
 * @version 2.0.0
 */

import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// Import all schemas
import { fandoms } from './fandom';
import { tags } from './tag';
import { tagClasses } from './tag-class';
import { plotBlocks } from './plot-block';
import { plotBlockConditions } from './plot-block-condition';
import { fandomTemplates } from './fandom-template';
import {
  fandomContentItems,
  fandomContentVersions,
  fandomContentApprovals,
  fandomImportExportSessions,
} from './fandom-content';
import {
  storySubmissions,
  submissionQueue,
  browserExtensionState,
  websiteExtractors,
  moderationActions,
  duplicateDetectionResults,
} from './submissions';
import {
  validationRules,
  ruleConditions,
  ruleActions,
  ruleTemplates,
  ruleTests,
  ruleVersions,
} from './validation-rules';

// Combine all schemas for Drizzle
const schema = {
  fandoms,
  tags,
  tagClasses,
  plotBlocks,
  plotBlockConditions,
  fandomTemplates,
  fandomContentItems,
  fandomContentVersions,
  fandomContentApprovals,
  fandomImportExportSessions,
  storySubmissions,
  submissionQueue,
  browserExtensionState,
  websiteExtractors,
  moderationActions,
  duplicateDetectionResults,
  validationRules,
  ruleConditions,
  ruleActions,
  ruleTemplates,
  ruleTests,
  ruleVersions,
};

/**
 * Get D1 database instance for local development
 *
 * This uses the getPlatformProxy API from wrangler to access
 * the local D1 database during development.
 */
async function getLocalD1() {
  const { getPlatformProxy } = await import('wrangler');
  const { env } = await getPlatformProxy();
  return env.DB as D1Database;
}

/**
 * Get the database client
 *
 * For Next.js App Router, this should be called within server components
 * or API routes where the platform context is available.
 *
 * @param platformEnv - Platform environment (from getRequestContext in Cloudflare Workers)
 * @returns Drizzle database instance configured for D1
 */
export async function getDatabase(platformEnv?: {
  DB: D1Database;
}): Promise<DrizzleD1Database<typeof schema>> {
  let d1Database: D1Database;

  if (platformEnv?.DB) {
    // Production: Use provided D1 database from platform context
    d1Database = platformEnv.DB;
  } else {
    // Development: Use wrangler's local D1
    d1Database = await getLocalD1();
  }

  return drizzle(d1Database, { schema });
}

/**
 * Cached database instance for development
 *
 * In development, we can reuse the same database connection
 * across requests for better performance.
 */
let cachedDb: DrizzleD1Database<typeof schema> | null = null;

/**
 * Get cached database instance (development only)
 *
 * This provides a singleton database connection for local development.
 * In production, always create a new instance per request.
 */
export async function getCachedDatabase(): Promise<
  DrizzleD1Database<typeof schema>
> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'getCachedDatabase should not be used in production. Use getDatabase() instead.'
    );
  }

  if (!cachedDb) {
    cachedDb = await getDatabase();
  }

  return cachedDb;
}

/**
 * Type-safe database client
 *
 * Export the type for use in application code
 */
export type Database = DrizzleD1Database<typeof schema>;

/**
 * Export schema for use with Drizzle queries
 */
export { schema };
export * from './fandom';
export * from './tag';
export * from './tag-class';
export * from './plot-block';
export * from './plot-block-condition';
export * from './fandom-template';
export * from './fandom-content';
export * from './submissions';
export * from './validation-rules';
