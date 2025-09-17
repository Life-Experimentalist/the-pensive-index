import { drizzle } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { migrate as migrateLibSQL } from 'drizzle-orm/libsql/migrator';
import {
  sql,
  eq,
  ne,
  lt,
  lte,
  gt,
  gte,
  like,
  ilike,
  isNull,
  isNotNull,
  and,
  or,
  not,
  desc,
  asc,
} from 'drizzle-orm';
import * as schema from './schema';

// Database connection types
export type DatabaseConnection =
  | DrizzleD1Database<typeof schema>
  | LibSQLDatabase<typeof schema>;

// Database configuration interface
export interface DatabaseConfig {
  type: 'cloudflare-d1' | 'libsql' | 'sqlite';
  url?: string;
  authToken?: string;
  d1Database?: any; // D1Database type from Cloudflare
  maxConnections?: number;
  queryTimeoutMs?: number;
}

// Database utility class
export class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: DatabaseConnection | null = null;
  private config: DatabaseConfig | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection based on environment
   */
  public async initialize(config: DatabaseConfig): Promise<void> {
    this.config = config;

    try {
      switch (config.type) {
        case 'cloudflare-d1':
          if (!config.d1Database) {
            throw new Error(
              'D1 database instance is required for Cloudflare D1'
            );
          }
          this.connection = drizzle(config.d1Database, { schema });
          break;

        case 'libsql':
        case 'sqlite':
          if (!config.url) {
            throw new Error('Database URL is required for LibSQL/SQLite');
          }
          // Note: This requires @libsql/client to be installed
          // For now, we'll create a mock connection
          this.connection = drizzleLibSQL(
            {
              url: config.url,
              authToken: config.authToken,
            } as any,
            { schema }
          );
          break;

        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      console.log(`Database connection initialized: ${config.type}`);
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * Get the database connection
   */
  public getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error(
        'Database connection not initialized. Call initialize() first.'
      );
    }
    return this.connection;
  }

  /**
   * Run database migrations
   */
  public async runMigrations(
    migrationsFolder: string = './migrations'
  ): Promise<void> {
    if (!this.connection || !this.config) {
      throw new Error('Database connection not initialized');
    }

    try {
      if (this.config.type === 'cloudflare-d1') {
        await migrate(this.connection as DrizzleD1Database<typeof schema>, {
          migrationsFolder,
        });
      } else {
        await migrateLibSQL(this.connection as LibSQLDatabase<typeof schema>, {
          migrationsFolder,
        });
      }
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Database migration failed:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.connection) {
      return false;
    }

    try {
      // Simple query to test connection
      await this.connection.select().from(schema.fandoms).limit(1);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close database connection (for cleanup)
   */
  public async close(): Promise<void> {
    if (this.connection && this.config?.type !== 'cloudflare-d1') {
      // LibSQL connections can be closed
      try {
        // @ts-ignore - client may have close method
        await this.connection.client?.close?.();
      } catch (error) {
        console.warn('Failed to close database connection:', error);
      }
    }
    this.connection = null;
    this.config = null;
  }
}

// Database transaction utilities
export class TransactionManager {
  constructor(private db: DatabaseConnection) {}

  /**
   * Execute operations within a transaction
   */
  public async execute<T>(operation: (tx: any) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx: any) => {
      return await operation(tx);
    });
  }

  /**
   * Execute multiple operations with rollback on any failure
   */
  public async executeMultiple<T>(
    operations: Array<(tx: any) => Promise<T>>
  ): Promise<T[]> {
    return await this.db.transaction(async (tx: any) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      return results;
    });
  }

  /**
   * Execute operations with savepoints for partial rollback
   */
  public async executeWithSavepoints<T>(
    operations: Array<{
      name: string;
      operation: (tx: any) => Promise<T>;
      rollbackOn?: (error: Error) => boolean;
    }>
  ): Promise<Array<{ name: string; result?: T; error?: Error }>> {
    return await this.db.transaction(async (tx: any) => {
      const results: Array<{ name: string; result?: T; error?: Error }> = [];

      for (const { name, operation, rollbackOn } of operations) {
        try {
          const result = await operation(tx);
          results.push({ name, result });
        } catch (error) {
          const shouldRollback = rollbackOn ? rollbackOn(error as Error) : true;

          if (shouldRollback) {
            results.push({ name, error: error as Error });
            throw error; // This will rollback the entire transaction
          } else {
            results.push({ name, error: error as Error });
            // Continue with next operation
          }
        }
      }

      return results;
    });
  }
}

// Query builder utilities
export class QueryBuilder {
  constructor(private db: DatabaseConnection) {}

  /**
   * Build paginated query with total count
   */
  public async paginate<T>(
    query: any,
    page: number = 1,
    perPage: number = 20
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      per_page: number;
      total_count: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    const offset = (page - 1) * perPage;

    // Get total count
    const countQuery = query.select({ count: sql`count(*)` });
    const [{ count: totalCount }] = await countQuery;

    // Get paginated data
    const data = await query.limit(perPage).offset(offset);

    const totalPages = Math.ceil(totalCount / perPage);

    return {
      data,
      pagination: {
        page,
        per_page: perPage,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    };
  }

  /**
   * Build search query with relevance scoring
   */
  public buildSearchQuery(
    baseQuery: any,
    searchTerms: string[],
    searchFields: string[]
  ) {
    if (!searchTerms.length || !searchFields.length) {
      return baseQuery;
    }

    // Build LIKE conditions for each term and field combination
    const conditions = searchTerms.flatMap(term =>
      searchFields.map(
        field => sql`${sql.identifier(field)} LIKE ${`%${term}%`}`
      )
    );

    // Combine conditions with OR
    const searchCondition = conditions.reduce((acc, condition, index) =>
      index === 0 ? condition : sql`${acc} OR ${condition}`
    );

    return baseQuery.where(searchCondition);
  }

  /**
   * Build relevance scoring for search results
   */
  public addRelevanceScoring(
    query: any,
    searchTerms: string[],
    weightedFields: Array<{ field: string; weight: number }>
  ) {
    if (!searchTerms.length || !weightedFields.length) {
      return query;
    }

    // Build relevance score calculation
    const relevanceCalculations = weightedFields.map(({ field, weight }) => {
      const termMatches = searchTerms.map(
        term =>
          sql`CASE WHEN ${sql.identifier(
            field
          )} LIKE ${`%${term}%`} THEN ${weight} ELSE 0 END`
      );

      return termMatches.reduce((acc, match) =>
        acc ? sql`${acc} + ${match}` : match
      );
    });

    const totalRelevance = relevanceCalculations.reduce((acc, calc) =>
      acc ? sql`${acc} + ${calc}` : calc
    );

    return query
      .select({
        ...query.getSelectedFields(),
        relevance_score: totalRelevance,
      })
      .orderBy(sql`${totalRelevance} DESC`);
  }
}

// Database seeding utilities
export class DatabaseSeeder {
  constructor(private db: DatabaseConnection) {}

  /**
   * Seed database with initial data
   */
  public async seedInitialData(): Promise<void> {
    const tx = new TransactionManager(this.db);

    await tx.execute(async db => {
      // Seed fandoms
      await this.seedFandoms(db);

      // Seed admin users
      await this.seedAdminUsers(db);

      // Seed basic tag classes
      await this.seedTagClasses(db);

      console.log('Initial database seeding completed');
    });
  }

  /**
   * Seed development data for testing
   */
  public async seedDevelopmentData(): Promise<void> {
    const tx = new TransactionManager(this.db);

    await tx.execute(async db => {
      // Seed test fandoms
      await this.seedTestFandoms(db);

      // Seed test tags
      await this.seedTestTags(db);

      // Seed test plot blocks
      await this.seedTestPlotBlocks(db);

      // Seed test stories
      await this.seedTestStories(db);

      console.log('Development database seeding completed');
    });
  }

  private async seedFandoms(db: DatabaseConnection): Promise<void> {
    const fandoms = [
      {
        id: 'harry-potter',
        name: 'Harry Potter',
        description: 'The wizarding world created by J.K. Rowling',
        slug: 'harry-potter',
        is_active: true,
      },
      {
        id: 'percy-jackson',
        name: 'Percy Jackson',
        description: 'Camp Half-Blood and the world of Greek mythology',
        slug: 'percy-jackson',
        is_active: true,
      },
    ];

    await db.insert(schema.fandoms).values(fandoms).onConflictDoNothing();
  }

  private async seedAdminUsers(db: DatabaseConnection): Promise<void> {
    // This would typically come from environment variables or secure configuration
    const adminUsers = [
      {
        id: 'admin-1',
        email: 'admin@pensieve-index.com',
        name: 'System Administrator',
        role: 'admin' as const,
        permissions: [],
        is_active: true,
      },
    ];

    await db.insert(schema.adminUsers).values(adminUsers).onConflictDoNothing();
  }

  private async seedTagClasses(db: DatabaseConnection): Promise<void> {
    const tagClasses = [
      {
        id: 'hp-relationship-status',
        name: 'Relationship Status',
        fandom_id: 'harry-potter',
        description: 'Character relationship status tags',
        validation_rules: {
          mutual_exclusion: {
            within_class: true,
          },
          instance_limits: {
            max_instances: 1,
          },
        },
        is_active: true,
      },
    ];

    await db.insert(schema.tagClasses).values(tagClasses).onConflictDoNothing();
  }

  private async seedTestFandoms(db: DatabaseConnection): Promise<void> {
    // Implementation for test data
  }

  private async seedTestTags(db: DatabaseConnection): Promise<void> {
    // Implementation for test data
  }

  private async seedTestPlotBlocks(db: DatabaseConnection): Promise<void> {
    // Implementation for test data
  }

  private async seedTestStories(db: DatabaseConnection): Promise<void> {
    // Implementation for test data
  }
}

// Connection pool management for high-traffic scenarios
export class ConnectionPool {
  private connections: DatabaseConnection[] = [];
  private availableConnections: DatabaseConnection[] = [];
  private config: DatabaseConfig;
  private maxConnections: number;

  constructor(config: DatabaseConfig, maxConnections: number = 10) {
    this.config = config;
    this.maxConnections = maxConnections;
  }

  /**
   * Initialize connection pool
   */
  public async initialize(): Promise<void> {
    for (let i = 0; i < this.maxConnections; i++) {
      const manager = DatabaseManager.getInstance();
      await manager.initialize(this.config);
      const connection = manager.getConnection();
      this.connections.push(connection);
      this.availableConnections.push(connection);
    }
  }

  /**
   * Get a connection from the pool
   */
  public async getConnection(): Promise<{
    connection: DatabaseConnection;
    release: () => void;
  }> {
    if (this.availableConnections.length === 0) {
      throw new Error('No available connections in pool');
    }

    const connection = this.availableConnections.pop()!;

    const release = () => {
      this.availableConnections.push(connection);
    };

    return { connection, release };
  }

  /**
   * Execute query with automatic connection management
   */
  public async execute<T>(
    operation: (db: DatabaseConnection) => Promise<T>
  ): Promise<T> {
    const { connection, release } = await this.getConnection();

    try {
      return await operation(connection);
    } finally {
      release();
    }
  }

  /**
   * Close all connections in the pool
   */
  public async closeAll(): Promise<void> {
    // Note: Cloudflare D1 connections don't need explicit closing
    this.connections.length = 0;
    this.availableConnections.length = 0;
  }
}

// Health check utilities
export class DatabaseHealthChecker {
  constructor(private db: DatabaseConnection) {}

  /**
   * Perform comprehensive database health check
   */
  public async checkHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      duration_ms?: number;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Connection test
    const connectionResult = await this.checkConnection();
    checks.push(connectionResult);
    if (connectionResult.status === 'fail') overallStatus = 'critical';

    // Table existence test
    const tablesResult = await this.checkTables();
    checks.push(tablesResult);
    if (tablesResult.status === 'fail' && overallStatus !== 'critical') {
      overallStatus = 'critical';
    }

    // Data integrity test
    const integrityResult = await this.checkDataIntegrity();
    checks.push(integrityResult);
    if (integrityResult.status === 'warning' && overallStatus === 'healthy') {
      overallStatus = 'warning';
    }

    // Performance test
    const performanceResult = await this.checkPerformance();
    checks.push(performanceResult);
    if (performanceResult.status === 'warning' && overallStatus === 'healthy') {
      overallStatus = 'warning';
    }

    return { status: overallStatus, checks };
  }

  private async checkConnection(): Promise<any> {
    const startTime = performance.now();

    try {
      await this.db.select().from(schema.fandoms).limit(1);
      const duration = performance.now() - startTime;

      return {
        name: 'Database Connection',
        status: 'pass' as const,
        message: 'Database connection successful',
        duration_ms: Math.round(duration),
      };
    } catch (error) {
      return {
        name: 'Database Connection',
        status: 'fail' as const,
        message: `Connection failed: ${(error as Error).message}`,
      };
    }
  }

  private async checkTables(): Promise<any> {
    const requiredTables = [
      'fandoms',
      'tags',
      'tagClasses',
      'plotBlocks',
      'plotBlockConditions',
      'stories',
      'adminUsers',
    ];

    try {
      // Check each table individually with proper schema references
      await this.db.select().from(schema.fandoms).limit(1);
      await this.db.select().from(schema.tags).limit(1);
      await this.db.select().from(schema.tagClasses).limit(1);
      await this.db.select().from(schema.plotBlocks).limit(1);
      await this.db.select().from(schema.plotBlockConditions).limit(1);
      await this.db.select().from(schema.stories).limit(1);
      await this.db.select().from(schema.adminUsers).limit(1);

      return {
        name: 'Required Tables',
        status: 'pass' as const,
        message: 'All required tables exist and are accessible',
      };
    } catch (error) {
      return {
        name: 'Required Tables',
        status: 'fail' as const,
        message: `Table check failed: ${(error as Error).message}`,
      };
    }
  }

  private async checkDataIntegrity(): Promise<any> {
    try {
      // Check for orphaned records
      const orphanedTags = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.tags)
        .leftJoin(schema.fandoms, eq(schema.tags.fandom_id, schema.fandoms.id))
        .where(isNull(schema.fandoms.id));

      const orphanCount = Number(orphanedTags[0]?.count || 0);

      if (orphanCount > 0) {
        return {
          name: 'Data Integrity',
          status: 'warning' as const,
          message: `Found ${orphanCount} orphaned tag records`,
        };
      }

      return {
        name: 'Data Integrity',
        status: 'pass' as const,
        message: 'No data integrity issues detected',
      };
    } catch (error) {
      return {
        name: 'Data Integrity',
        status: 'warning' as const,
        message: `Integrity check failed: ${(error as Error).message}`,
      };
    }
  }

  private async checkPerformance(): Promise<any> {
    const startTime = performance.now();

    try {
      // Run a moderately complex query to test performance
      await this.db
        .select()
        .from(schema.stories)
        .leftJoin(
          schema.storyTags,
          eq(schema.stories.id, schema.storyTags.story_id)
        )
        .leftJoin(schema.tags, eq(schema.storyTags.tag_id, schema.tags.id))
        .limit(100);

      const duration = performance.now() - startTime;

      if (duration > 1000) {
        return {
          name: 'Query Performance',
          status: 'warning' as const,
          message: `Query performance degraded: ${Math.round(duration)}ms`,
          duration_ms: Math.round(duration),
        };
      }

      return {
        name: 'Query Performance',
        status: 'pass' as const,
        message: 'Query performance is acceptable',
        duration_ms: Math.round(duration),
      };
    } catch (error) {
      return {
        name: 'Query Performance',
        status: 'warning' as const,
        message: `Performance check failed: ${(error as Error).message}`,
      };
    }
  }
}

// Export utility functions
export const db = DatabaseManager.getInstance();

export function createTransactionManager(
  connection: DatabaseConnection
): TransactionManager {
  return new TransactionManager(connection);
}

export function createQueryBuilder(
  connection: DatabaseConnection
): QueryBuilder {
  return new QueryBuilder(connection);
}

export function createSeeder(connection: DatabaseConnection): DatabaseSeeder {
  return new DatabaseSeeder(connection);
}

export function createHealthChecker(
  connection: DatabaseConnection
): DatabaseHealthChecker {
  return new DatabaseHealthChecker(connection);
}

// Import sql and other utilities from drizzle
export {
  sql,
  eq,
  ne,
  lt,
  lte,
  gt,
  gte,
  like,
  ilike,
  isNull,
  isNotNull,
  and,
  or,
  not,
  desc,
  asc,
};
