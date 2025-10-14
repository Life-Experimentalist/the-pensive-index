/**
 * This file contains fixes for database operations that need to be updated for
 * compatibility with the current version of Drizzle ORM.
 *
 * Use these functions instead of direct database operations when you need to
 * ensure backward compatibility.
 */

import { DatabaseConnection } from './index';
import { sql, SQLWrapper } from 'drizzle-orm';

/**
 * Execute a count query correctly with the current Drizzle ORM API
 */
export async function executeCountQuery(
  db: DatabaseConnection,
  query: SQLWrapper
): Promise<number> {
  try {
    // In newer Drizzle ORM versions, we need to use the raw API
    const result = await (db as any).run(query);
    const r: any = result;
    if (r && r[0] && typeof r[0].count !== 'undefined') {
      return Number(r[0].count);
    } else if (r && r[0] && Object.values(r[0]).length > 0) {
      // If count property doesn't exist, use the first value in the result
      return Number(Object.values(r[0])[0]);
    }
    return 0;
  } catch (error) {
    console.error('Count query execution error:', error);
    return 0;
  }
}

/**
 * Create a count SQL query that works with the current Drizzle ORM version
 */
export function createCountQuery(table: any): SQLWrapper {
  return sql`SELECT COUNT(*) as count FROM ${table}`;
}

/**
 * Execute a raw SQL query that works across Drizzle ORM versions
 */
export async function executeRawQuery<T = any>(
  db: DatabaseConnection,
  query: SQLWrapper
): Promise<T[]> {
  try {
    // @ts-ignore - Using run method that we know exists
    return await db.run(query);
  } catch (error) {
    console.error('Raw query execution error:', error);
    throw error;
  }
}

/**
 * Create a compatibility wrapper for select() operations
 * Handles the API changes between different versions of Drizzle ORM
 * In newer versions, select() doesn't accept arguments directly
 */
export function compatibleSelect(
  db: DatabaseConnection,
  fields: Record<string, any>,
  table: any
) {
  // Create the query using raw SQL instead of the select() API that changed
  const fieldSelections: string[] = [];

  // Build SQL field selections
  Object.entries(fields).forEach(([alias, field]) => {
    if (
      typeof field === 'object' &&
      field !== null &&
      '$type' in field &&
      field.$type === 'custom'
    ) {
      // For custom SQL fields
      fieldSelections.push(`${field.sql} AS ${alias}`);
    } else if (typeof field === 'object' && field !== null && 'name' in field) {
      // For table fields
      fieldSelections.push(`${field.name} AS ${alias}`);
    } else {
      // Default case
      fieldSelections.push(`${String(field)} AS ${alias}`);
    }
  });

  // Create the SQL query
  const fieldsSQL = fieldSelections.join(', ');
  const tableName = typeof table === 'string' ? table : table.name;

  return sql`SELECT ${sql.raw(fieldsSQL)} FROM ${sql.raw(tableName)}`;
}

/**
 * Access count property safely from query results
 * Handles different result formats between Drizzle ORM versions
 */
export function getCountValue(result: any): number {
  if (!result) return 0;

  const r: any = result;
  if (!r[0]) return 0;

  // Try different ways to access the count
  if (r[0].count !== undefined) return Number(r[0].count);

  // If it's in a nested object
  if (r[0].count && typeof r[0].count === 'object') {
    return Number(r[0].count.value || 0);
  }

  // Try getting the first property value if it's an object with a single numeric property
  const firstKey = Object.keys(r[0])[0];
  if (firstKey && !isNaN(Number(r[0][firstKey]))) {
    return Number(r[0][firstKey]);
  }

  return 0;
}

/**
 * Safely extract a numeric changes count from a variety of DB result shapes.
 * Accepts RunResult, D1Result, ResultSet, or raw arrays and returns 0 when not present.
 */
export function getResultChanges(result: any): number {
  if (!result) return 0;
  if (typeof result.changes === 'number') return result.changes;
  if (Array.isArray(result) && typeof (result as any).changes === 'number')
    return (result as any).changes;
  // Some D1 runtimes put changes on the first element
  if (
    Array.isArray(result) &&
    result[0] &&
    typeof result[0].changes === 'number'
  )
    return result[0].changes;
  return 0;
}
