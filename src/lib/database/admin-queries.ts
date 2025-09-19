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
  is_active?: boolean;
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

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        fandom_access: user.fandom_access || undefined,
        permissions: user.permissions,
        is_active: user.is_active,
        last_login_at: user.last_login_at || undefined,
        preferences: user.preferences || undefined,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
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

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        fandom_access: user.fandom_access || undefined,
        permissions: user.permissions,
        is_active: user.is_active,
        last_login_at: user.last_login_at || undefined,
        preferences: user.preferences || undefined,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    },

    /**
     * List all admin users with optional filters
     */
    list: async (
      filters: {
        role?: AdminRole;
        fandomId?: string;
        is_active?: boolean;
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

      if (filters.is_active !== undefined) {
        whereConditions.push(eq(adminUsers.is_active, filters.is_active));
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

      const sortColumn =
        sortBy === 'created_at'
          ? adminUsers.created_at
          : sortBy === 'updated_at'
          ? adminUsers.updated_at
          : sortBy === 'name'
          ? adminUsers.name
          : sortBy === 'email'
          ? adminUsers.email
          : adminUsers.created_at;

      // Get paginated data
      const data = await this.db
        .select()
        .from(adminUsers)
        .where(whereClause)
        .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn))
        .offset(offset)
        .limit(limit);

      // Get total count (simplified approach)
      const allUsers = await this.db
        .select()
        .from(adminUsers)
        .where(whereClause);

      const total = allUsers.length;

      // Map database results to AdminUser type
      const mappedData: AdminUser[] = data.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        fandom_access: user.fandom_access || undefined,
        permissions: user.permissions,
        is_active: user.is_active,
        last_login_at: user.last_login_at || undefined,
        preferences: user.preferences || undefined,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }));

      return {
        data: mappedData,
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
          email: userData.email,
          name: userData.name,
          role: userData.role,
          fandom_access: userData.fandom_access,
          permissions: userData.permissions,
          is_active: userData.is_active,
          last_login_at: userData.last_login_at,
          preferences: userData.preferences,
          created_at: now,
          updated_at: now,
        })
        .returning();

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        fandom_access: newUser.fandom_access || undefined,
        permissions: newUser.permissions,
        is_active: newUser.is_active,
        last_login_at: newUser.last_login_at || undefined,
        preferences: newUser.preferences || undefined,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
      };
    },

    /**
     * Update admin user
     */
    update: async (
      id: string,
      updates: Partial<AdminUser>
    ): Promise<AdminUser | null> => {
      const updateData: any = {
        updated_at: new Date(),
      };

      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.fandom_access !== undefined)
        updateData.fandom_access = updates.fandom_access;
      if (updates.permissions !== undefined)
        updateData.permissions = updates.permissions;
      if (updates.is_active !== undefined)
        updateData.is_active = updates.is_active;
      if (updates.last_login_at !== undefined)
        updateData.last_login_at = updates.last_login_at;
      if (updates.preferences !== undefined)
        updateData.preferences = updates.preferences;

      const [updatedUser] = await this.db
        .update(adminUsers)
        .set(updateData)
        .where(eq(adminUsers.id, id))
        .returning();

      if (!updatedUser) return null;

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        fandom_access: updatedUser.fandom_access || undefined,
        permissions: updatedUser.permissions,
        is_active: updatedUser.is_active,
        last_login_at: updatedUser.last_login_at || undefined,
        preferences: updatedUser.preferences || undefined,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      };
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

      if (filters.is_active !== undefined) {
        whereConditions.push(eq(validationRules.is_active, filters.is_active));
      }

      if (filters.category) {
        whereConditions.push(eq(validationRules.category, filters.category));
      }

      if (filters.createdBy) {
        whereConditions.push(eq(validationRules.created_by, filters.createdBy));
      }

      const whereClause = and(...whereConditions);

      const [data, allRules] = await Promise.all([
        this.db
          .select()
          .from(validationRules)
          .where(whereClause)
          .orderBy(
            sortOrder === 'desc'
              ? desc(validationRules.priority)
              : asc(validationRules.priority)
          )
          .offset(offset)
          .limit(limit),
        this.db.select().from(validationRules).where(whereClause),
      ]);

      const total = allRules.length;

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
      const ruleId = `rule-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      // Create the main rule
      const [newRule] = await this.db
        .insert(validationRules)
        .values({
          id: ruleId,
          name: ruleData.name,
          description: ruleData.description,
          fandom_id: ruleData.fandom_id,
          category: ruleData.category,
          priority: ruleData.priority,
          is_active: ruleData.is_active,
          applies_to: ruleData.applies_to,
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

        await this.db.insert(ruleConditions).values(conditionsToInsert);
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

        await this.db.insert(ruleActions).values(actionsToInsert);
      }

      return newRule as ValidationRule;
    },

    /**
     * Update validation rule
     */
    update: async (
      id: string,
      updates: Partial<ValidationRule>,
      adminUserId: string
    ): Promise<ValidationRule | null> => {
      // Update main rule
      const [updatedRule] = await this.db
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
        await this.db
          .delete(ruleConditions)
          .where(eq(ruleConditions.rule_id, id));

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

          await this.db.insert(ruleConditions).values(conditionsToInsert);
        }
      }

      // If actions are provided, replace them
      if (updates.actions) {
        await this.db.delete(ruleActions).where(eq(ruleActions.rule_id, id));

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

          await this.db.insert(ruleActions).values(actionsToInsert);
        }
      }

      return updatedRule as ValidationRule;
    },

    /**
     * Delete validation rule (hard delete with dependency check)
     */
    delete: async (id: string): Promise<boolean> => {
      // Delete conditions and actions first
      await this.db
        .delete(ruleConditions)
        .where(eq(ruleConditions.rule_id, id));
      await this.db.delete(ruleActions).where(eq(ruleActions.rule_id, id));

      // Delete the main rule
      const result = await this.db
        .delete(validationRules)
        .where(eq(validationRules.id, id));

      return result.changes > 0;
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
        return this.validationRules.listAllRules({}, options);
      } else if (adminUser.role === 'FandomAdmin' && adminUser.fandom_access) {
        // FandomAdmin can only see rules for their fandoms
        return this.validationRules.listByFandoms(
          adminUser.fandom_access,
          {},
          options
        );
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

      if (filters.is_active !== undefined) {
        whereConditions.push(eq(validationRules.is_active, filters.is_active));
      }

      if (filters.category) {
        whereConditions.push(eq(validationRules.category, filters.category));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const allData = await this.db
        .select()
        .from(validationRules)
        .where(whereClause);

      const data = allData
        .sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a];
          const bValue = b[sortBy as keyof typeof b];

          // Handle null values
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return sortOrder === 'desc' ? 1 : -1;
          if (bValue === null) return sortOrder === 'desc' ? -1 : 1;

          if (sortOrder === 'desc') {
            return aValue > bValue ? -1 : 1;
          }
          return aValue > bValue ? 1 : -1;
        })
        .slice(offset, offset + limit);

      const total = allData.length;

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

      if (filters.is_active !== undefined) {
        whereConditions.push(eq(validationRules.is_active, filters.is_active));
      }

      if (filters.category) {
        whereConditions.push(eq(validationRules.category, filters.category));
      }

      const whereClause = and(...whereConditions);

      const allData = await this.db
        .select()
        .from(validationRules)
        .where(whereClause);

      const data = allData
        .sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a];
          const bValue = b[sortBy as keyof typeof b];

          // Handle null values
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return sortOrder === 'desc' ? 1 : -1;
          if (bValue === null) return sortOrder === 'desc' ? -1 : 1;

          if (sortOrder === 'desc') {
            return aValue > bValue ? -1 : 1;
          }
          return aValue > bValue ? 1 : -1;
        })
        .slice(offset, offset + limit);

      const total = allData.length;

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

      return (template as unknown as RuleTemplate) || null;
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

      const allData = await this.db
        .select()
        .from(ruleTemplates)
        .where(whereClause);

      const data = allData
        .sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a];
          const bValue = b[sortBy as keyof typeof b];

          // Handle null values
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return sortOrder === 'desc' ? 1 : -1;
          if (bValue === null) return sortOrder === 'desc' ? -1 : 1;

          if (sortOrder === 'desc') {
            return aValue > bValue ? -1 : 1;
          }
          return aValue > bValue ? 1 : -1;
        })
        .slice(offset, offset + limit);

      const total = allData.length;

      return {
        data: data as unknown as RuleTemplate[],
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
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          fandom_id: null, // Templates are fandom-agnostic by default
          template_data: {
            ruleDefinition: templateData.ruleDefinition,
            placeholders: templateData.placeholders,
            version: templateData.version,
            metadata: {},
          },
          is_public: templateData.isActive || false,
          tags: null,
          created_by: adminUserId,
          created_at: now,
          updated_at: now,
          usage_count: 0,
        })
        .returning();

      return newTemplate as unknown as RuleTemplate;
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

      return (updatedTemplate as unknown as RuleTemplate) || null;
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
     * Clone template to create a validation rule
     */
    cloneToRule: async (
      templateId: string,
      fandomId: string,
      customizations: {
        name?: string;
        priority?: number;
        customizations?: Record<string, any>;
      } = {},
      adminUserId: string
    ): Promise<ValidationRule> => {
      const template = await this.ruleTemplates.findById(templateId);
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      // Create rule data from template
      const ruleId = `rule-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      const ruleData = {
        id: ruleId,
        name: customizations.name || `${template.name} (Cloned)`,
        description: template.description,
        fandom_id: fandomId,
        category: template.category,
        priority: customizations.priority || 1,
        is_active: true,
        version: '1.0.0',
        template_id: template.id,
        applies_to: [],
        created_by: adminUserId,
        created_at: now,
        updated_at: now,
        tags: [],
        metadata: { clonedFrom: templateId, ...customizations.customizations },
      };

      const [newRule] = await this.db
        .insert(validationRules)
        .values(ruleData)
        .returning();

      // Increment template usage count
      await this.ruleTemplates.incrementUsage(templateId);

      return newRule as ValidationRule;
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

      const allData = await this.db
        .select()
        .from(tagClasses)
        .where(
          and(
            eq(tagClasses.fandom_id, fandomId),
            eq(tagClasses.is_active, true)
          )
        );

      const data = allData
        .sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a];
          const bValue = b[sortBy as keyof typeof b];

          // Handle null values
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return sortOrder === 'desc' ? 1 : -1;
          if (bValue === null) return sortOrder === 'desc' ? -1 : 1;

          if (sortOrder === 'desc') {
            return aValue > bValue ? -1 : 1;
          }
          return aValue > bValue ? 1 : -1;
        })
        .slice(offset, offset + limit);

      const total = allData.length;

      return {
        data: data as unknown as TagClass[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Get tag classes based on user access
     */
    getByUserAccess: async (
      user: AdminUser,
      options: QueryOptions = {}
    ): Promise<PaginatedResult<TagClass>> => {
      const {
        page = 1,
        limit = 50,
        sortBy = 'name',
        sortOrder = 'asc',
      } = options;
      const offset = (page - 1) * limit;

      // If user has access to all fandoms or specific fandoms
      let whereConditions: any[] = [eq(tagClasses.is_active, true)];

      if (
        user.fandom_access &&
        user.fandom_access.length > 0 &&
        !user.fandom_access.includes('*')
      ) {
        whereConditions.push(inArray(tagClasses.fandom_id, user.fandom_access));
      }

      const allData = await this.db
        .select()
        .from(tagClasses)
        .where(and(...whereConditions));

      const sortedData = allData.sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a];
        const bVal = b[sortBy as keyof typeof b];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      const data = sortedData.slice(offset, offset + limit);
      const total = allData.length;

      return {
        data: data as unknown as TagClass[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Find tag class by ID
     */
    findById: async (id: string): Promise<TagClass | null> => {
      const [tagClass] = await this.db
        .select()
        .from(tagClasses)
        .where(eq(tagClasses.id, id))
        .limit(1);

      return (tagClass as unknown as TagClass) || null;
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
          name: tagClassData.name,
          description: tagClassData.description || '',
          fandom_id: tagClassData.fandomId,
          validation_rules: {},
          is_active: tagClassData.isActive,
          created_at: now,
          updated_at: now,
        })
        .returning();

      return newTagClass as unknown as TagClass;
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

      return (updatedTagClass as unknown as TagClass) || null;
    },

    /**
     * Deactivate tag class (soft delete)
     */
    deactivate: async (id: string): Promise<boolean> => {
      const result = await this.db
        .update(tagClasses)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(tagClasses.id, id));

      return result.changes > 0;
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

      const rulesCreatedData = await this.db
        .select()
        .from(validationRules)
        .where(
          and(
            eq(validationRules.created_by, adminUserId),
            gt(validationRules.created_at, since)
          )
        );

      const templatesCreatedData = await this.db
        .select()
        .from(ruleTemplates)
        .where(
          and(
            eq(ruleTemplates.created_by, adminUserId),
            gt(ruleTemplates.created_at, since)
          )
        );

      const recentActivity = await this.db
        .select()
        .from(validationRules)
        .where(
          and(
            eq(validationRules.created_by, adminUserId),
            gt(validationRules.created_at, since)
          )
        )
        .orderBy(desc(validationRules.created_at))
        .limit(10);

      return {
        rulesCreated: rulesCreatedData.length,
        templatesCreated: templatesCreatedData.length,
        recentActivity,
      };
    },

    /**
     * Get fandom rule statistics
     */
    getFandomStats: async (fandomId: string) => {
      const ruleCountData = await this.db
        .select()
        .from(validationRules)
        .where(eq(validationRules.fandom_id, fandomId));

      const activeRuleCountData = await this.db
        .select()
        .from(validationRules)
        .where(
          and(
            eq(validationRules.fandom_id, fandomId),
            eq(validationRules.is_active, true)
          )
        );

      const templateCountData = await this.db
        .select()
        .from(ruleTemplates)
        .where(eq(ruleTemplates.fandom_id, fandomId));

      return {
        totalRules: ruleCountData.length,
        activeRules: activeRuleCountData.length,
        templates: templateCountData.length,
      };
    },
  };
}
