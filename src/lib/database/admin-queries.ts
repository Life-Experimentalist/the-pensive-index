/**
 * Admin Database Query Layer
 *
 * Provides optimized database operations for admin functionality including:
 * - CRUD operations for all admin entities
 * - Fandom-scoped queries for FandomAdmins
 * - Performance-optimized queries with proper indexing
 * - Transaction support for complex operations
 * - Audit logging for admin actions
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { DatabaseConnection } from '@/lib/database';
import {
  adminUsers,
  validationRules,
  ruleConditions,
  ruleActions,
  ruleTemplates,
  tagClasses,
  plotBlocks,
  fandoms,
} from '@/lib/database/schema';
import {
  eq,
  and,
  or,
  like,
  inArray,
  desc,
  asc,
  sql,
  isNull,
  count,
  gt,
  lt,
} from 'drizzle-orm';
import type {
  AdminUser,
  AdminRole,
  ValidationRule,
  RuleTemplate,
  TagClass,
} from '@/types/admin';

// Query result types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminQueryFilters {
  fandomId?: string;
  isActive?: boolean;
  category?: string;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Admin database operations with role-based access control
 */
export class AdminQueries {
  constructor(private db: DatabaseConnection) {}

  /**
   * Admin Users Management
   */
  public readonly adminUsers = {
    /**
     * Find admin user by ID
     */
    findById: async (id: string): Promise<AdminUser | null> => {
      const [user] = await this.db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id))
        .limit(1);

      return user || null;
    },

    /**
     * Find admin user by email
     */
    findByEmail: async (email: string): Promise<AdminUser | null> => {
      const [user] = await this.db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, email))
        .limit(1);

      return user || null;
    },

    /**
     * List all admin users with optional filters
     */
    list: async (
      filters: {
        role?: AdminRole;
        fandomId?: string;
        isActive?: boolean;
      } = {},
      options: QueryOptions = {}
    ): Promise<PaginatedResult<AdminUser>> => {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = options;
      const offset = (page - 1) * limit;

      let whereConditions: any[] = [];

      if (filters.role) {
        whereConditions.push(eq(adminUsers.role, filters.role));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(adminUsers.is_active, filters.isActive));
      }

      if (filters.fandomId) {
        whereConditions.push(
          sql`json_extract(${adminUsers.fandom_access}, '$') LIKE ${
            '%' + filters.fandomId + '%'
          }`
        );
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(adminUsers)
          .where(whereClause)
          .orderBy(
            sortOrder === 'desc'
              ? desc(adminUsers[sortBy as keyof typeof adminUsers])
              : asc(adminUsers[sortBy as keyof typeof adminUsers])
          )
          .offset(offset)
          .limit(limit),
        this.db.select({ total: count() }).from(adminUsers).where(whereClause),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Create new admin user
     */
    create: async (
      userData: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>
    ): Promise<AdminUser> => {
      const id = `admin-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      const [newUser] = await this.db
        .insert(adminUsers)
        .values({
          id,
          ...userData,
          created_at: now,
          updated_at: now,
        })
        .returning();

      return newUser;
    },

    /**
     * Update admin user
     */
    update: async (
      id: string,
      updates: Partial<AdminUser>
    ): Promise<AdminUser | null> => {
      const [updatedUser] = await this.db
        .update(adminUsers)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(eq(adminUsers.id, id))
        .returning();

      return updatedUser || null;
    },

    /**
     * Deactivate admin user (soft delete)
     */
    deactivate: async (id: string): Promise<boolean> => {
      const result = await this.db
        .update(adminUsers)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(adminUsers.id, id));

      return result.changes > 0;
    },

    /**
     * Update last login timestamp
     */
    updateLastLogin: async (id: string): Promise<void> => {
      await this.db
        .update(adminUsers)
        .set({
          last_login_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(adminUsers.id, id));
    },
  };

  /**
   * Validation Rules Management
   */
  public readonly validationRules = {
    /**
     * Find validation rule by ID
     */
    findById: async (id: string): Promise<ValidationRule | null> => {
      const [rule] = await this.db
        .select()
        .from(validationRules)
        .where(eq(validationRules.id, id))
        .limit(1);

      if (!rule) return null;

      // Get associated conditions and actions
      const [conditions, actions] = await Promise.all([
        this.db
          .select()
          .from(ruleConditions)
          .where(eq(ruleConditions.rule_id, id))
          .orderBy(asc(ruleConditions.order_index)),
        this.db
          .select()
          .from(ruleActions)
          .where(eq(ruleActions.rule_id, id))
          .orderBy(asc(ruleActions.order_index)),
      ]);

      return {
        ...rule,
        conditions,
        actions,
      } as ValidationRule;
    },

    /**
     * List validation rules with fandom scoping
     */
    listByFandom: async (
      fandomId: string,
      filters: AdminQueryFilters = {},
      options: QueryOptions = {}
    ): Promise<PaginatedResult<ValidationRule>> => {
      const {
        page = 1,
        limit = 20,
        sortBy = 'priority',
        sortOrder = 'asc',
      } = options;
      const offset = (page - 1) * limit;

      let whereConditions = [eq(validationRules.fandom_id, fandomId)];

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(validationRules.is_active, filters.isActive));
      }

      if (filters.category) {
        whereConditions.push(eq(validationRules.category, filters.category));
      }

      if (filters.createdBy) {
        whereConditions.push(eq(validationRules.created_by, filters.createdBy));
      }

      const whereClause = and(...whereConditions);

      const [data, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(validationRules)
          .where(whereClause)
          .orderBy(
            sortOrder === 'desc'
              ? desc(validationRules[sortBy as keyof typeof validationRules])
              : asc(validationRules[sortBy as keyof typeof validationRules])
          )
          .offset(offset)
          .limit(limit),
        this.db
          .select({ total: count() })
          .from(validationRules)
          .where(whereClause),
      ]);

      return {
        data: data as ValidationRule[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Create validation rule with conditions and actions
     */
    create: async (
      ruleData: Omit<ValidationRule, 'id' | 'created_at' | 'updated_at'>,
      adminUserId: string
    ): Promise<ValidationRule> => {
      return await this.db.transaction(async tx => {
        const ruleId = `rule-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const now = new Date();

        // Create the main rule
        const [newRule] = await tx
          .insert(validationRules)
          .values({
            id: ruleId,
            name: ruleData.name,
            description: ruleData.description,
            fandom_id: ruleData.fandomId,
            category: ruleData.category,
            priority: ruleData.priority,
            is_active: ruleData.isActive,
            applies_to: ruleData.appliesTo,
            created_by: adminUserId,
            created_at: now,
            updated_at: now,
            version: ruleData.version,
            tags: ruleData.tags,
            metadata: ruleData.metadata,
          })
          .returning();

        // Create conditions
        if (ruleData.conditions && ruleData.conditions.length > 0) {
          const conditionsToInsert = ruleData.conditions.map(
            (condition, index) => ({
              id: `cond-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              rule_id: ruleId,
              type: condition.type,
              target: condition.target,
              operator: condition.operator,
              value: condition.value,
              weight: condition.weight || 1.0,
              order_index: index,
              group_id: condition.groupId,
              is_negated: condition.isNegated || false,
              created_at: now,
              metadata: condition.metadata,
            })
          );

          await tx.insert(ruleConditions).values(conditionsToInsert);
        }

        // Create actions
        if (ruleData.actions && ruleData.actions.length > 0) {
          const actionsToInsert = ruleData.actions.map((action, index) => ({
            id: `action-${Date.now()}-${index}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            rule_id: ruleId,
            type: action.type,
            severity: action.severity,
            message: action.message,
            data: action.data,
            order_index: index,
            condition_group: action.conditionGroup,
            created_at: now,
          }));

          await tx.insert(ruleActions).values(actionsToInsert);
        }

        return newRule as ValidationRule;
      });
    },

    /**
     * Update validation rule
     */
    update: async (
      id: string,
      updates: Partial<ValidationRule>,
      adminUserId: string
    ): Promise<ValidationRule | null> => {
      return await this.db.transaction(async tx => {
        // Update main rule
        const [updatedRule] = await tx
          .update(validationRules)
          .set({
            ...updates,
            updated_at: new Date(),
          })
          .where(eq(validationRules.id, id))
          .returning();

        if (!updatedRule) return null;

        // If conditions are provided, replace them
        if (updates.conditions) {
          await tx.delete(ruleConditions).where(eq(ruleConditions.rule_id, id));

          if (updates.conditions.length > 0) {
            const conditionsToInsert = updates.conditions.map(
              (condition, index) => ({
                id: `cond-${Date.now()}-${index}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
                rule_id: id,
                type: condition.type,
                target: condition.target,
                operator: condition.operator,
                value: condition.value,
                weight: condition.weight || 1.0,
                order_index: index,
                group_id: condition.groupId,
                is_negated: condition.isNegated || false,
                created_at: new Date(),
                metadata: condition.metadata,
              })
            );

            await tx.insert(ruleConditions).values(conditionsToInsert);
          }
        }

        // If actions are provided, replace them
        if (updates.actions) {
          await tx.delete(ruleActions).where(eq(ruleActions.rule_id, id));

          if (updates.actions.length > 0) {
            const actionsToInsert = updates.actions.map((action, index) => ({
              id: `action-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              rule_id: id,
              type: action.type,
              severity: action.severity,
              message: action.message,
              data: action.data,
              order_index: index,
              condition_group: action.conditionGroup,
              created_at: new Date(),
            }));

            await tx.insert(ruleActions).values(actionsToInsert);
          }
        }

        return updatedRule as ValidationRule;
      });
    },

    /**
     * Delete validation rule (hard delete with dependency check)
     */
    delete: async (id: string): Promise<boolean> => {
      return await this.db.transaction(async tx => {
        // Delete conditions and actions first
        await tx.delete(ruleConditions).where(eq(ruleConditions.rule_id, id));
        await tx.delete(ruleActions).where(eq(ruleActions.rule_id, id));

        // Delete the main rule
        const result = await tx
          .delete(validationRules)
          .where(eq(validationRules.id, id));

        return result.changes > 0;
      });
    },

    /**
     * Get rules by user access (for FandomAdmin scoping)
     */
    getByUserAccess: async (
      adminUser: AdminUser,
      options: QueryOptions = {}
    ): Promise<PaginatedResult<ValidationRule>> => {
      if (adminUser.role === 'ProjectAdmin') {
        // ProjectAdmin can see all rules
        return this.listAllRules({}, options);
      } else if (adminUser.role === 'FandomAdmin' && adminUser.fandom_access) {
        // FandomAdmin can only see rules for their fandoms
        return this.listByFandoms(adminUser.fandom_access, {}, options);
      }

      return {
        data: [],
        total: 0,
        page: 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    },

    /**
     * List all rules (ProjectAdmin only)
     */
    listAllRules: async (
      filters: AdminQueryFilters = {},
      options: QueryOptions = {}
    ): Promise<PaginatedResult<ValidationRule>> => {
      const {
        page = 1,
        limit = 20,
        sortBy = 'updated_at',
        sortOrder = 'desc',
      } = options;
      const offset = (page - 1) * limit;

      let whereConditions: any[] = [];

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(validationRules.is_active, filters.isActive));
      }

      if (filters.category) {
        whereConditions.push(eq(validationRules.category, filters.category));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(validationRules)
          .where(whereClause)
          .orderBy(
            sortOrder === 'desc'
              ? desc(validationRules[sortBy as keyof typeof validationRules])
              : asc(validationRules[sortBy as keyof typeof validationRules])
          )
          .offset(offset)
          .limit(limit),
        this.db
          .select({ total: count() })
          .from(validationRules)
          .where(whereClause),
      ]);

      return {
        data: data as ValidationRule[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * List rules by multiple fandoms (FandomAdmin scoping)
     */
    listByFandoms: async (
      fandomIds: string[],
      filters: AdminQueryFilters = {},
      options: QueryOptions = {}
    ): Promise<PaginatedResult<ValidationRule>> => {
      const {
        page = 1,
        limit = 20,
        sortBy = 'updated_at',
        sortOrder = 'desc',
      } = options;
      const offset = (page - 1) * limit;

      let whereConditions = [inArray(validationRules.fandom_id, fandomIds)];

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(validationRules.is_active, filters.isActive));
      }

      if (filters.category) {
        whereConditions.push(eq(validationRules.category, filters.category));
      }

      const whereClause = and(...whereConditions);

      const [data, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(validationRules)
          .where(whereClause)
          .orderBy(
            sortOrder === 'desc'
              ? desc(validationRules[sortBy as keyof typeof validationRules])
              : asc(validationRules[sortBy as keyof typeof validationRules])
          )
          .offset(offset)
          .limit(limit),
        this.db
          .select({ total: count() })
          .from(validationRules)
          .where(whereClause),
      ]);

      return {
        data: data as ValidationRule[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
  };

  /**
   * Rule Templates Management
   */
  public readonly ruleTemplates = {
    /**
     * Find template by ID
     */
    findById: async (id: string): Promise<RuleTemplate | null> => {
      const [template] = await this.db
        .select()
        .from(ruleTemplates)
        .where(eq(ruleTemplates.id, id))
        .limit(1);

      return (template as RuleTemplate) || null;
    },

    /**
     * List public templates or user's templates
     */
    list: async (
      filters: {
        isPublic?: boolean;
        createdBy?: string;
        category?: string;
        fandomId?: string;
      } = {},
      options: QueryOptions = {}
    ): Promise<PaginatedResult<RuleTemplate>> => {
      const {
        page = 1,
        limit = 20,
        sortBy = 'usage_count',
        sortOrder = 'desc',
      } = options;
      const offset = (page - 1) * limit;

      let whereConditions: any[] = [];

      if (filters.isPublic !== undefined) {
        whereConditions.push(eq(ruleTemplates.is_public, filters.isPublic));
      }

      if (filters.createdBy) {
        whereConditions.push(eq(ruleTemplates.created_by, filters.createdBy));
      }

      if (filters.category) {
        whereConditions.push(eq(ruleTemplates.category, filters.category));
      }

      if (filters.fandomId) {
        whereConditions.push(eq(ruleTemplates.fandom_id, filters.fandomId));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(ruleTemplates)
          .where(whereClause)
          .orderBy(
            sortOrder === 'desc'
              ? desc(ruleTemplates[sortBy as keyof typeof ruleTemplates])
              : asc(ruleTemplates[sortBy as keyof typeof ruleTemplates])
          )
          .offset(offset)
          .limit(limit),
        this.db
          .select({ total: count() })
          .from(ruleTemplates)
          .where(whereClause),
      ]);

      return {
        data: data as RuleTemplate[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Create rule template
     */
    create: async (
      templateData: Omit<
        RuleTemplate,
        'id' | 'created_at' | 'updated_at' | 'usage_count'
      >,
      adminUserId: string
    ): Promise<RuleTemplate> => {
      const id = `template-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      const [newTemplate] = await this.db
        .insert(ruleTemplates)
        .values({
          id,
          ...templateData,
          created_by: adminUserId,
          created_at: now,
          updated_at: now,
          usage_count: 0,
        })
        .returning();

      return newTemplate as RuleTemplate;
    },

    /**
     * Update rule template
     */
    update: async (
      id: string,
      updates: Partial<RuleTemplate>
    ): Promise<RuleTemplate | null> => {
      const [updatedTemplate] = await this.db
        .update(ruleTemplates)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(eq(ruleTemplates.id, id))
        .returning();

      return (updatedTemplate as RuleTemplate) || null;
    },

    /**
     * Increment template usage count
     */
    incrementUsage: async (id: string): Promise<void> => {
      await this.db
        .update(ruleTemplates)
        .set({
          usage_count: sql`${ruleTemplates.usage_count} + 1`,
          updated_at: new Date(),
        })
        .where(eq(ruleTemplates.id, id));
    },

    /**
     * Delete template (soft delete by making private)
     */
    deactivate: async (id: string): Promise<boolean> => {
      const result = await this.db
        .update(ruleTemplates)
        .set({
          is_public: false,
          updated_at: new Date(),
        })
        .where(eq(ruleTemplates.id, id));

      return result.changes > 0;
    },
  };

  /**
   * Tag Classes Management (fandom-scoped)
   */
  public readonly tagClasses = {
    /**
     * List tag classes by fandom
     */
    listByFandom: async (
      fandomId: string,
      options: QueryOptions = {}
    ): Promise<PaginatedResult<TagClass>> => {
      const {
        page = 1,
        limit = 50,
        sortBy = 'name',
        sortOrder = 'asc',
      } = options;
      const offset = (page - 1) * limit;

      const [data, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(tagClasses)
          .where(
            and(
              eq(tagClasses.fandom_id, fandomId),
              eq(tagClasses.is_active, true)
            )
          )
          .orderBy(
            sortOrder === 'desc'
              ? desc(tagClasses[sortBy as keyof typeof tagClasses])
              : asc(tagClasses[sortBy as keyof typeof tagClasses])
          )
          .offset(offset)
          .limit(limit),
        this.db
          .select({ total: count() })
          .from(tagClasses)
          .where(
            and(
              eq(tagClasses.fandom_id, fandomId),
              eq(tagClasses.is_active, true)
            )
          ),
      ]);

      return {
        data: data as TagClass[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Create tag class with validation rules
     */
    create: async (
      tagClassData: Omit<TagClass, 'id' | 'created_at' | 'updated_at'>
    ): Promise<TagClass> => {
      const id = `tagclass-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      const [newTagClass] = await this.db
        .insert(tagClasses)
        .values({
          id,
          ...tagClassData,
          created_at: now,
          updated_at: now,
        })
        .returning();

      return newTagClass as TagClass;
    },

    /**
     * Update tag class
     */
    update: async (
      id: string,
      updates: Partial<TagClass>
    ): Promise<TagClass | null> => {
      const [updatedTagClass] = await this.db
        .update(tagClasses)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(eq(tagClasses.id, id))
        .returning();

      return (updatedTagClass as TagClass) || null;
    },
  };

  /**
   * Audit and Analytics
   */
  public readonly analytics = {
    /**
     * Get admin activity statistics
     */
    getAdminStats: async (adminUserId: string, days: number = 30) => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [rulesCreated, templatesCreated, recentActivity] =
        await Promise.all([
          this.db
            .select({ count: count() })
            .from(validationRules)
            .where(
              and(
                eq(validationRules.created_by, adminUserId),
                gt(validationRules.created_at, since)
              )
            ),
          this.db
            .select({ count: count() })
            .from(ruleTemplates)
            .where(
              and(
                eq(ruleTemplates.created_by, adminUserId),
                gt(ruleTemplates.created_at, since)
              )
            ),
          this.db
            .select({
              type: sql`'rule'`,
              name: validationRules.name,
              created_at: validationRules.created_at,
            })
            .from(validationRules)
            .where(
              and(
                eq(validationRules.created_by, adminUserId),
                gt(validationRules.created_at, since)
              )
            )
            .orderBy(desc(validationRules.created_at))
            .limit(10),
        ]);

      return {
        rulesCreated: rulesCreated[0]?.count || 0,
        templatesCreated: templatesCreated[0]?.count || 0,
        recentActivity,
      };
    },

    /**
     * Get fandom rule statistics
     */
    getFandomStats: async (fandomId: string) => {
      const [ruleCount, activeRuleCount, templateCount] = await Promise.all([
        this.db
          .select({ count: count() })
          .from(validationRules)
          .where(eq(validationRules.fandom_id, fandomId)),
        this.db
          .select({ count: count() })
          .from(validationRules)
          .where(
            and(
              eq(validationRules.fandom_id, fandomId),
              eq(validationRules.is_active, true)
            )
          ),
        this.db
          .select({ count: count() })
          .from(ruleTemplates)
          .where(eq(ruleTemplates.fandom_id, fandomId)),
      ]);

      return {
        totalRules: ruleCount[0]?.count || 0,
        activeRules: activeRuleCount[0]?.count || 0,
        templates: templateCount[0]?.count || 0,
      };
    },
  };
}
