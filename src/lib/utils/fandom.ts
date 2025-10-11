/**
 * Fandom Utility Functions
 *
 * Shared utilities for fandom data fetching and manipulation
 * Consolidates duplicate functions across the application
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { FandomModel } from '@/lib/database/models';
import type { Fandom } from '@/lib/database/schema';

/**
 * Get active fandoms with optional limit
 *
 * Consolidates:
 * - app/page.tsx: getFandomsData() - fetches top 6 for homepage
 * - app/fandom/page.tsx: getAllFandoms() - fetches all for library
 *
 * @param limit - Optional limit on number of fandoms (undefined = all)
 * @returns Array of active fandoms
 *
 * @example
 * // Homepage: Get top 6 featured fandoms
 * const featured = await getFandoms(6);
 *
 * @example
 * // Library: Get all fandoms
 * const all = await getFandoms();
 */
export async function getFandoms(limit?: number): Promise<Fandom[]> {
  try {
    console.log(
      `[Fandom Utils] Fetching fandoms${
        limit ? ` (limit: ${limit})` : ' (all)'
      }...`
    );
    const startTime = Date.now();

    const fandoms = await FandomModel.getAllActive();
    const result = limit ? fandoms.slice(0, limit) : fandoms;

    const fetchTime = Date.now() - startTime;
    console.log(
      `[Fandom Utils] Fetched ${result.length} fandoms in ${fetchTime}ms`
    );

    return result;
  } catch (error) {
    console.error('[Fandom Utils] Failed to fetch fandoms:', error);
    return [];
  }
}
