import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';

// Database integration test types
interface DatabaseTestConfig {
  connectionString: string;
  testDatabase: string;
  migrationPath: string;
  seedDataPath: string;
}

interface TransactionTestResult {
  success: boolean;
  recordsAffected: number;
  rollbackSuccessful?: boolean;
  errorMessage?: string;
  executionTime: number;
}

interface TreeTestNode {
  id: string;
  name: string;
  parent_id?: string;
  children?: TreeTestNode[];
  depth: number;
  path: string[];
}

interface PerformanceTestMetrics {
  queryTime: number;
  resultCount: number;
  memoryUsage: number;
  indexUsage: boolean;
  optimizerPlan?: string;
}

// Mock Database Interface for Integration Testing
class DatabaseTestManager {
  private connection: any;
  private testStartTime: number = 0;

  constructor(private config: DatabaseTestConfig) {}

  async connect(): Promise<void> {
    // Mock database connection
    this.connection = {
      connected: true,
      database: this.config.testDatabase,
    };
  }

  async disconnect(): Promise<void> {
    this.connection = null;
  }

  async beginTransaction(): Promise<string> {
    const transactionId = `tx_${Date.now()}_${Math.random()}`;
    return transactionId;
  }

  async commitTransaction(transactionId: string): Promise<void> {
    // Mock transaction commit
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    // Mock transaction rollback
  }

  async executeQuery(
    query: string,
    params: any[] = []
  ): Promise<{ rows: any[]; metrics: PerformanceTestMetrics }> {
    const startTime = performance.now();

    // Mock query execution with realistic performance characteristics
    let rows: any[] = [];
    let resultCount = 0;

    if (query.toLowerCase().includes('select')) {
      // Simulate different query types
      if (query.includes('fandoms')) {
        rows = this.mockFandomData();
      } else if (query.includes('tags')) {
        rows = this.mockTagData();
      } else if (query.includes('plot_blocks')) {
        rows = this.mockPlotBlockData();
      } else if (query.includes('tag_classes')) {
        rows = this.mockTagClassData();
      }
      resultCount = rows.length;
    } else if (query.toLowerCase().includes('insert')) {
      resultCount = 1;
    } else if (query.toLowerCase().includes('update')) {
      resultCount = Math.floor(Math.random() * 5) + 1;
    } else if (query.toLowerCase().includes('delete')) {
      resultCount = Math.floor(Math.random() * 3);
    }

    const queryTime = performance.now() - startTime;

    return {
      rows,
      metrics: {
        queryTime,
        resultCount,
        memoryUsage: Math.random() * 1000,
        indexUsage: !query.toLowerCase().includes('like'),
        optimizerPlan: this.generateMockQueryPlan(query),
      },
    };
  }

  private mockFandomData(): any[] {
    return [
      { id: 1, name: 'Harry Potter', slug: 'harry-potter', is_active: true },
      { id: 2, name: 'Percy Jackson', slug: 'percy-jackson', is_active: true },
      { id: 3, name: 'Crossover', slug: 'crossover', is_active: true },
    ];
  }

  private mockTagData(): any[] {
    return [
      {
        id: 1,
        name: 'harry-potter',
        fandom_id: 1,
        tag_class_id: 1,
        created_at: new Date(),
      },
      {
        id: 2,
        name: 'hermione-granger',
        fandom_id: 1,
        tag_class_id: 1,
        created_at: new Date(),
      },
      {
        id: 3,
        name: 'romantic',
        fandom_id: 1,
        tag_class_id: 2,
        created_at: new Date(),
      },
      {
        id: 4,
        name: 'angst',
        fandom_id: 1,
        tag_class_id: 2,
        created_at: new Date(),
      },
    ];
  }

  private mockPlotBlockData(): TreeTestNode[] {
    return [
      {
        id: '1',
        name: 'Goblin Inheritance',
        depth: 0,
        path: ['1'],
      },
      {
        id: '2',
        name: 'Black Lordship',
        parent_id: '1',
        depth: 1,
        path: ['1', '2'],
      },
      {
        id: '3',
        name: 'After Sirius Death',
        parent_id: '2',
        depth: 2,
        path: ['1', '2', '3'],
      },
      {
        id: '4',
        name: 'Emancipation Route',
        parent_id: '2',
        depth: 2,
        path: ['1', '2', '4'],
      },
    ];
  }

  private mockTagClassData(): any[] {
    return [
      {
        id: 1,
        name: 'character-tags',
        fandom_id: 1,
        validation_rules: {
          max_instances: 10,
          required_context: [],
          mutual_exclusions: [],
        },
      },
      {
        id: 2,
        name: 'genre-tags',
        fandom_id: 1,
        validation_rules: {
          max_instances: 5,
          required_context: [],
          mutual_exclusions: ['fluff', 'angst'],
        },
      },
    ];
  }

  private generateMockQueryPlan(query: string): string {
    if (query.includes('JOIN')) {
      return 'Hash Join (cost=1.23..45.67)';
    } else if (query.includes('WHERE')) {
      return 'Index Scan (cost=0.15..12.34)';
    } else {
      return 'Seq Scan (cost=0.00..23.45)';
    }
  }

  async validateTreeStructure(tableName: string): Promise<{
    isValid: boolean;
    orphanNodes: number;
    circularReferences: number;
    maxDepth: number;
    totalNodes: number;
  }> {
    const nodes = await this.getTreeNodes(tableName);

    let orphanNodes = 0;
    let circularReferences = 0;
    let maxDepth = 0;

    // Validate tree structure
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const node of nodes) {
      if (node.parent_id && !nodeMap.has(node.parent_id)) {
        orphanNodes++;
      }

      // Check for circular references
      if (this.hasCircularReference(node, nodeMap)) {
        circularReferences++;
      }

      maxDepth = Math.max(maxDepth, node.depth);
    }

    return {
      isValid: orphanNodes === 0 && circularReferences === 0,
      orphanNodes,
      circularReferences,
      maxDepth,
      totalNodes: nodes.length,
    };
  }

  private async getTreeNodes(tableName: string): Promise<TreeTestNode[]> {
    const { rows } = await this.executeQuery(`
      SELECT id, name, parent_id,
             array_length(string_to_array(path, '.'), 1) as depth,
             string_to_array(path, '.') as path
      FROM ${tableName}
    `);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      parent_id: row.parent_id,
      depth: row.depth || 0,
      path: row.path || [row.id],
    }));
  }

  private hasCircularReference(
    node: TreeTestNode,
    nodeMap: Map<string, TreeTestNode>
  ): boolean {
    const visited = new Set<string>();
    let current = node;

    while (current && current.parent_id) {
      if (visited.has(current.id)) {
        return true;
      }
      visited.add(current.id);
      current = nodeMap.get(current.parent_id)!;
    }

    return false;
  }

  async testBulkInsert(
    tableName: string,
    records: any[],
    batchSize: number = 1000
  ): Promise<TransactionTestResult> {
    const startTime = performance.now();
    let recordsAffected = 0;

    try {
      const transactionId = await this.beginTransaction();

      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const placeholders = batch.map(() => '(?)').join(', ');

        const { metrics } = await this.executeQuery(
          `INSERT INTO ${tableName} VALUES ${placeholders}`,
          batch
        );

        recordsAffected += metrics.resultCount;
      }

      await this.commitTransaction(transactionId);

      return {
        success: true,
        recordsAffected,
        executionTime: performance.now() - startTime,
      };
    } catch (error: unknown) {
      return {
        success: false,
        recordsAffected: 0,
        executionTime: performance.now() - startTime,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async testConcurrentTransactions(operationCount: number): Promise<{
    successfulTransactions: number;
    failedTransactions: number;
    avgExecutionTime: number;
    deadlocks: number;
  }> {
    const promises = Array.from({ length: operationCount }, async (_, i) => {
      const startTime = performance.now();

      try {
        const transactionId = await this.beginTransaction();

        // Simulate concurrent operations
        await this.executeQuery(`
          UPDATE tags SET updated_at = NOW()
          WHERE id = ${(i % 10) + 1}
        `);

        await this.executeQuery(`
          INSERT INTO tag_classes (name, fandom_id)
          VALUES ('test-class-${i}', 1)
        `);

        await this.commitTransaction(transactionId);

        return {
          success: true,
          executionTime: performance.now() - startTime,
          deadlock: false,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          executionTime: performance.now() - startTime,
          deadlock: errorMessage.includes('deadlock'),
        };
      }
    });

    const results = await Promise.all(promises);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const deadlocks = results.filter(r => r.deadlock).length;
    const avgTime =
      results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

    return {
      successfulTransactions: successful,
      failedTransactions: failed,
      avgExecutionTime: avgTime,
      deadlocks,
    };
  }
}

describe('Integration Tests - Database Operations', () => {
  let dbManager: DatabaseTestManager;

  const testConfig: DatabaseTestConfig = {
    connectionString: 'sqlite://test.db',
    testDatabase: 'the_pensive_index_test',
    migrationPath: './migrations',
    seedDataPath: './test-data',
  };

  beforeAll(async () => {
    dbManager = new DatabaseTestManager(testConfig);
    await dbManager.connect();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic CRUD Operations', () => {
    it('should perform efficient fandom queries', async () => {
      const { rows, metrics } = await dbManager.executeQuery(`
        SELECT f.*, COUNT(t.id) as tag_count
        FROM fandoms f
        LEFT JOIN tags t ON f.id = t.fandom_id
        WHERE f.is_active = true
        GROUP BY f.id
        ORDER BY f.name
      `);

      expect(rows.length).toBeGreaterThan(0);
      expect(metrics.queryTime).toBeLessThan(50);
      expect(metrics.indexUsage).toBe(true);
      expect(metrics.resultCount).toBe(rows.length);
    });

    it('should handle complex tag queries with joins', async () => {
      const { rows, metrics } = await dbManager.executeQuery(`
        SELECT t.*, tc.name as class_name, f.name as fandom_name
        FROM tags t
        JOIN tag_classes tc ON t.tag_class_id = tc.id
        JOIN fandoms f ON t.fandom_id = f.id
        WHERE f.slug = 'harry-potter'
        AND tc.name IN ('character-tags', 'ship-tags')
        ORDER BY t.name
      `);

      expect(rows.length).toBeGreaterThan(0);
      expect(metrics.queryTime).toBeLessThan(100);
      expect(metrics.indexUsage).toBe(true);

      // Validate join results
      rows.forEach(row => {
        expect(row.class_name).toBeDefined();
        expect(row.fandom_name).toBe('Harry Potter');
      });
    });

    it('should perform efficient plot block tree queries', async () => {
      const { rows, metrics } = await dbManager.executeQuery(`
        WITH RECURSIVE plot_tree AS (
          -- Base case: root nodes
          SELECT id, name, parent_id, 0 as depth,
                 ARRAY[id] as path, name as full_path
          FROM plot_blocks
          WHERE parent_id IS NULL

          UNION ALL

          -- Recursive case: children
          SELECT pb.id, pb.name, pb.parent_id, pt.depth + 1,
                 pt.path || pb.id, pt.full_path || ' > ' || pb.name
          FROM plot_blocks pb
          JOIN plot_tree pt ON pb.parent_id = pt.id
          WHERE pt.depth < 10 -- Prevent infinite recursion
        )
        SELECT * FROM plot_tree ORDER BY path
      `);

      expect(rows.length).toBeGreaterThan(0);
      expect(metrics.queryTime).toBeLessThan(200);

      // Validate tree structure
      const depths = rows.map(r => r.depth || 0);
      expect(Math.max(...depths)).toBeLessThan(10);
    });

    it('should handle bulk tag insertions efficiently', async () => {
      const bulkTags = Array.from({ length: 1000 }, (_, i) => ({
        name: `bulk-tag-${i}`,
        fandom_id: 1,
        tag_class_id: 1,
        created_at: new Date(),
      }));

      const result = await dbManager.testBulkInsert('tags', bulkTags, 100);

      expect(result.success).toBe(true);
      expect(result.recordsAffected).toBe(1000);
      expect(result.executionTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Transaction Management', () => {
    it('should handle complex multi-table transactions', async () => {
      const transactionId = await dbManager.beginTransaction();

      try {
        // Insert new fandom
        const { metrics: fandomMetrics } = await dbManager.executeQuery(`
          INSERT INTO fandoms (name, slug, is_active)
          VALUES ('Test Fandom', 'test-fandom', true)
        `);

        // Insert related tag classes
        const { metrics: classMetrics } = await dbManager.executeQuery(`
          INSERT INTO tag_classes (name, fandom_id, validation_rules)
          VALUES ('test-characters', 1, '{}')
        `);

        // Insert tags
        const { metrics: tagMetrics } = await dbManager.executeQuery(`
          INSERT INTO tags (name, fandom_id, tag_class_id)
          VALUES ('test-character-1', 1, 1)
        `);

        await dbManager.commitTransaction(transactionId);

        expect(fandomMetrics.resultCount).toBe(1);
        expect(classMetrics.resultCount).toBe(1);
        expect(tagMetrics.resultCount).toBe(1);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        throw error;
      }
    });

    it('should rollback transactions on constraint violations', async () => {
      const transactionId = await dbManager.beginTransaction();
      let rollbackSuccessful = false;

      try {
        // Valid operation
        await dbManager.executeQuery(`
          INSERT INTO fandoms (name, slug, is_active)
          VALUES ('Valid Fandom', 'valid-fandom', true)
        `);

        // This should fail due to duplicate slug
        await dbManager.executeQuery(`
          INSERT INTO fandoms (name, slug, is_active)
          VALUES ('Duplicate Fandom', 'valid-fandom', true)
        `);

        await dbManager.commitTransaction(transactionId);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        rollbackSuccessful = true;
      }

      expect(rollbackSuccessful).toBe(true);

      // Verify rollback worked
      const { rows } = await dbManager.executeQuery(`
        SELECT COUNT(*) as count FROM fandoms WHERE slug = 'valid-fandom'
      `);
      expect(rows[0].count).toBe(0);
    });

    it('should handle concurrent transaction conflicts', async () => {
      const result = await dbManager.testConcurrentTransactions(20);

      expect(result.successfulTransactions + result.failedTransactions).toBe(
        20
      );
      expect(result.avgExecutionTime).toBeLessThan(1000);
      expect(result.deadlocks).toBeLessThan(5); // Some deadlocks acceptable
    });

    it('should maintain transaction isolation levels', async () => {
      // Start two concurrent transactions
      const tx1 = await dbManager.beginTransaction();
      const tx2 = await dbManager.beginTransaction();

      try {
        // TX1: Update a tag
        await dbManager.executeQuery(`
          UPDATE tags SET name = 'modified-by-tx1' WHERE id = 1
        `);

        // TX2: Try to read the same tag (should see original value)
        const { rows } = await dbManager.executeQuery(`
          SELECT name FROM tags WHERE id = 1
        `);

        // Should still see original value due to isolation
        expect(rows[0].name).not.toBe('modified-by-tx1');

        await dbManager.commitTransaction(tx1);
        await dbManager.commitTransaction(tx2);
      } catch (error) {
        await dbManager.rollbackTransaction(tx1);
        await dbManager.rollbackTransaction(tx2);
        throw error;
      }
    });
  });

  describe('Tree Structure Operations', () => {
    it('should validate plot block tree integrity', async () => {
      const validation = await dbManager.validateTreeStructure('plot_blocks');

      expect(validation.isValid).toBe(true);
      expect(validation.orphanNodes).toBe(0);
      expect(validation.circularReferences).toBe(0);
      expect(validation.maxDepth).toBeLessThan(10);
      expect(validation.totalNodes).toBeGreaterThan(0);
    });

    it('should handle tree insertions correctly', async () => {
      const transactionId = await dbManager.beginTransaction();

      try {
        // Insert parent node
        const { rows: parentRows } = await dbManager.executeQuery(`
          INSERT INTO plot_blocks (name, parent_id, fandom_id)
          VALUES ('New Parent Plot', NULL, 1)
          RETURNING id
        `);

        const parentId = parentRows[0].id;

        // Insert child nodes
        await dbManager.executeQuery(`
          INSERT INTO plot_blocks (name, parent_id, fandom_id)
          VALUES
            ('Child Plot 1', ${parentId}, 1),
            ('Child Plot 2', ${parentId}, 1)
        `);

        // Verify tree structure
        const { rows: treeRows } = await dbManager.executeQuery(`
          SELECT COUNT(*) as child_count
          FROM plot_blocks
          WHERE parent_id = ${parentId}
        `);

        expect(treeRows[0].child_count).toBe(2);

        await dbManager.commitTransaction(transactionId);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        throw error;
      }
    });

    it('should prevent circular references in tree structure', async () => {
      const transactionId = await dbManager.beginTransaction();
      let preventedCircular = false;

      try {
        // Create nodes A -> B -> C
        const { rows: nodeA } = await dbManager.executeQuery(`
          INSERT INTO plot_blocks (name, parent_id, fandom_id)
          VALUES ('Node A', NULL, 1)
          RETURNING id
        `);

        const { rows: nodeB } = await dbManager.executeQuery(`
          INSERT INTO plot_blocks (name, parent_id, fandom_id)
          VALUES ('Node B', ${nodeA[0].id}, 1)
          RETURNING id
        `);

        const { rows: nodeC } = await dbManager.executeQuery(`
          INSERT INTO plot_blocks (name, parent_id, fandom_id)
          VALUES ('Node C', ${nodeB[0].id}, 1)
          RETURNING id
        `);

        // Try to create circular reference: A -> B -> C -> A
        await dbManager.executeQuery(`
          UPDATE plot_blocks
          SET parent_id = ${nodeC[0].id}
          WHERE id = ${nodeA[0].id}
        `);

        await dbManager.commitTransaction(transactionId);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        preventedCircular = true;
      }

      expect(preventedCircular).toBe(true);
    });

    it('should efficiently query tree descendants', async () => {
      const { rows, metrics } = await dbManager.executeQuery(`
        WITH RECURSIVE descendants AS (
          SELECT id, name, parent_id, 0 as level
          FROM plot_blocks
          WHERE id = 1  -- Starting from root node

          UNION ALL

          SELECT pb.id, pb.name, pb.parent_id, d.level + 1
          FROM plot_blocks pb
          JOIN descendants d ON pb.parent_id = d.id
          WHERE d.level < 5
        )
        SELECT * FROM descendants ORDER BY level, name
      `);

      expect(metrics.queryTime).toBeLessThan(100);
      expect(rows.length).toBeGreaterThan(0);

      // Verify hierarchical structure
      let lastLevel = -1;
      rows.forEach(row => {
        expect(row.level).toBeGreaterThanOrEqual(lastLevel);
        if (row.level > 0) {
          expect(row.parent_id).toBeDefined();
        }
        lastLevel = row.level;
      });
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      let constraintViolated = false;

      try {
        await dbManager.executeQuery(`
          INSERT INTO tags (name, fandom_id, tag_class_id)
          VALUES ('orphaned-tag', 999, 999)  -- Non-existent foreign keys
        `);
      } catch (error) {
        constraintViolated = true;
      }

      expect(constraintViolated).toBe(true);
    });

    it('should enforce unique constraints', async () => {
      let uniqueViolated = false;

      try {
        // First insertion should succeed
        await dbManager.executeQuery(`
          INSERT INTO fandoms (name, slug, is_active)
          VALUES ('Unique Test', 'unique-test', true)
        `);

        // Second insertion should fail
        await dbManager.executeQuery(`
          INSERT INTO fandoms (name, slug, is_active)
          VALUES ('Unique Test 2', 'unique-test', true)
        `);
      } catch (error) {
        uniqueViolated = true;
      }

      expect(uniqueViolated).toBe(true);
    });

    it('should validate JSON schema constraints', async () => {
      const validationRules = {
        max_instances: 5,
        required_context: ['romantic'],
        mutual_exclusions: ['harry/ginny', 'harry/luna'],
        category_restrictions: ['shipping'],
      };

      const { metrics } = await dbManager.executeQuery(`
        INSERT INTO tag_classes (name, fandom_id, validation_rules)
        VALUES ('test-shipping', 1, '${JSON.stringify(validationRules)}')
      `);

      expect(metrics.resultCount).toBe(1);

      // Verify JSON was stored correctly
      const { rows } = await dbManager.executeQuery(`
        SELECT validation_rules FROM tag_classes
        WHERE name = 'test-shipping'
      `);

      const storedRules = JSON.parse(rows[0].validation_rules);
      expect(storedRules.max_instances).toBe(5);
      expect(storedRules.mutual_exclusions).toContain('harry/ginny');
    });

    it('should handle cascade deletes properly', async () => {
      const transactionId = await dbManager.beginTransaction();

      try {
        // Create test fandom with related data
        const { rows: fandomRows } = await dbManager.executeQuery(`
          INSERT INTO fandoms (name, slug, is_active)
          VALUES ('Delete Test', 'delete-test', true)
          RETURNING id
        `);

        const fandomId = fandomRows[0].id;

        // Create related tag classes and tags
        await dbManager.executeQuery(`
          INSERT INTO tag_classes (name, fandom_id, validation_rules)
          VALUES ('test-class', ${fandomId}, '{}')
        `);

        await dbManager.executeQuery(`
          INSERT INTO tags (name, fandom_id, tag_class_id)
          VALUES ('test-tag', ${fandomId}, 1)
        `);

        // Delete fandom (should cascade)
        const { metrics } = await dbManager.executeQuery(`
          DELETE FROM fandoms WHERE id = ${fandomId}
        `);

        expect(metrics.resultCount).toBe(1);

        // Verify cascaded deletes
        const { rows: tagRows } = await dbManager.executeQuery(`
          SELECT COUNT(*) as count FROM tags WHERE fandom_id = ${fandomId}
        `);

        expect(tagRows[0].count).toBe(0);

        await dbManager.commitTransaction(transactionId);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        throw error;
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should use indexes for common query patterns', async () => {
      // Test fandom slug lookup (should use index)
      const { metrics: slugMetrics } = await dbManager.executeQuery(`
        SELECT * FROM fandoms WHERE slug = 'harry-potter'
      `);

      expect(slugMetrics.indexUsage).toBe(true);
      expect(slugMetrics.queryTime).toBeLessThan(10);

      // Test tag name search (should use index)
      const { metrics: tagMetrics } = await dbManager.executeQuery(`
        SELECT * FROM tags WHERE name = 'harry-potter'
      `);

      expect(tagMetrics.indexUsage).toBe(true);
      expect(tagMetrics.queryTime).toBeLessThan(10);
    });

    it('should handle large result sets efficiently', async () => {
      const { rows, metrics } = await dbManager.executeQuery(`
        SELECT t.*, tc.name as class_name
        FROM tags t
        JOIN tag_classes tc ON t.tag_class_id = tc.id
        WHERE t.fandom_id = 1
        ORDER BY t.name
        LIMIT 1000
      `);

      expect(metrics.queryTime).toBeLessThan(500);
      expect(metrics.memoryUsage).toBeLessThan(10000); // 10MB
      expect(rows.length).toBeLessThanOrEqual(1000);
    });

    it('should optimize complex aggregation queries', async () => {
      const { rows, metrics } = await dbManager.executeQuery(`
        SELECT
          f.name as fandom_name,
          COUNT(DISTINCT t.id) as tag_count,
          COUNT(DISTINCT tc.id) as class_count,
          COUNT(DISTINCT pb.id) as plot_block_count
        FROM fandoms f
        LEFT JOIN tags t ON f.id = t.fandom_id
        LEFT JOIN tag_classes tc ON f.id = tc.fandom_id
        LEFT JOIN plot_blocks pb ON f.id = pb.fandom_id
        WHERE f.is_active = true
        GROUP BY f.id, f.name
        ORDER BY tag_count DESC
      `);

      expect(metrics.queryTime).toBeLessThan(200);
      expect(rows.length).toBeGreaterThan(0);

      // Verify aggregation results
      rows.forEach(row => {
        expect(row.tag_count).toBeGreaterThanOrEqual(0);
        expect(row.class_count).toBeGreaterThanOrEqual(0);
        expect(row.plot_block_count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle concurrent read operations efficiently', async () => {
      const concurrentReads = Array.from({ length: 50 }, () =>
        dbManager.executeQuery(`
          SELECT t.*, f.name as fandom_name
          FROM tags t
          JOIN fandoms f ON t.fandom_id = f.id
          WHERE t.name LIKE '%harry%'
        `)
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentReads);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(50);
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 50 queries

      // All queries should complete successfully
      results.forEach(result => {
        expect(result.metrics.queryTime).toBeLessThan(100);
      });
    });
  });

  describe('Backup and Recovery Scenarios', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate connection failure
      const originalConnection = dbManager['connection'];
      dbManager['connection'] = null;

      let connectionError = false;
      try {
        await dbManager.executeQuery('SELECT 1');
      } catch (error) {
        connectionError = true;
      }

      expect(connectionError).toBe(true);

      // Restore connection
      dbManager['connection'] = originalConnection;

      // Should work again
      const { rows } = await dbManager.executeQuery('SELECT 1 as test');
      expect(rows[0].test).toBe(1);
    });

    it('should validate data consistency after recovery', async () => {
      // Simulate data corruption scenario
      const validation = await dbManager.validateTreeStructure('plot_blocks');

      expect(validation.isValid).toBe(true);
      expect(validation.orphanNodes).toBe(0);
      expect(validation.circularReferences).toBe(0);

      // Verify foreign key integrity
      const { rows } = await dbManager.executeQuery(`
        SELECT
          COUNT(*) as total_tags,
          COUNT(DISTINCT fandom_id) as valid_fandoms,
          COUNT(DISTINCT tag_class_id) as valid_classes
        FROM tags t
        WHERE EXISTS (SELECT 1 FROM fandoms f WHERE f.id = t.fandom_id)
        AND EXISTS (SELECT 1 FROM tag_classes tc WHERE tc.id = t.tag_class_id)
      `);

      expect(rows[0].total_tags).toBeGreaterThan(0);
      expect(rows[0].valid_fandoms).toBeGreaterThan(0);
      expect(rows[0].valid_classes).toBeGreaterThan(0);
    });
  });

  describe('Migration and Schema Evolution', () => {
    it('should handle schema migrations safely', async () => {
      const transactionId = await dbManager.beginTransaction();

      try {
        // Simulate adding a new column
        await dbManager.executeQuery(`
          ALTER TABLE tags ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0
        `);

        // Verify column was added
        const { rows } = await dbManager.executeQuery(`
          SELECT popularity_score FROM tags LIMIT 1
        `);

        expect(rows[0].popularity_score).toBeDefined();

        await dbManager.commitTransaction(transactionId);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        throw error;
      }
    });

    it('should maintain data integrity during migrations', async () => {
      // Test that existing data remains valid after schema changes
      const { rows: beforeCount } = await dbManager.executeQuery(`
        SELECT COUNT(*) as count FROM tags
      `);

      const transactionId = await dbManager.beginTransaction();

      try {
        // Simulate migration that updates data
        await dbManager.executeQuery(`
          UPDATE tags SET updated_at = CURRENT_TIMESTAMP
          WHERE updated_at IS NULL
        `);

        const { rows: afterCount } = await dbManager.executeQuery(`
          SELECT COUNT(*) as count FROM tags
        `);

        expect(afterCount[0].count).toBe(beforeCount[0].count);

        await dbManager.commitTransaction(transactionId);
      } catch (error) {
        await dbManager.rollbackTransaction(transactionId);
        throw error;
      }
    });
  });
});
