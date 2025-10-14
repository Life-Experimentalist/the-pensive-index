/**
 * D1 Database Configuration for Local Development
 *
 * This file configures Next.js to use Cloudflare D1 (local) during development
 * instead of better-sqlite3. This ensures development-production parity.
 *
 * How it works:
 * 1. Uses wrangler's getPlatformProxy() to access local D1
 * 2. Provides the D1 instance to the database manager
 * 3. Falls back to better-sqlite3 if wrangler is not available
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { getPlatformProxy } from 'wrangler';

let d1Instance: D1Database | null = null;
let isInitialized = false;

/**
 * Get the local D1 database instance
 *
 * This initializes the wrangler platform proxy and returns the D1 database.
 * The instance is cached for the lifetime of the Node.js process.
 */
export async function getLocalD1(): Promise<D1Database> {
  if (!isInitialized) {
    try {
      console.log('🔌 Initializing Cloudflare D1 local database...');
      const { env, dispose } = await getPlatformProxy<Env>();

      if (!env.DB) {
        throw new Error('D1 database not found in wrangler environment');
      }

      d1Instance = env.DB;
      isInitialized = true;

      console.log('✅ D1 local database connected');

      // Cleanup on process exit
      process.on('exit', () => {
        dispose();
      });
    } catch (error) {
      console.error('❌ Failed to initialize D1 local database:', error);
      throw error;
    }
  }

  if (!d1Instance) {
    throw new Error('D1 database instance is null');
  }

  return d1Instance;
}

/**
 * Get D1 database configuration for the database manager
 *
 * This returns a configuration object that can be used with
 * the DatabaseManager.initialize() method.
 */
export async function getD1Config() {
  const d1 = await getLocalD1();

  return {
    type: 'cloudflare-d1' as const,
    d1Database: d1,
  };
}

/**
 * Environment type for Cloudflare Workers
 */
interface Env {
  DB: D1Database;
  CACHE?: KVNamespace;
}
