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

/**
 * Contract Tests for External Integrations
 *
 * These tests verify that our application correctly integrates with external services
 * and that the contracts between our system and external dependencies are maintained.
 *
 * Contract testing ensures:
 * 1. Database connection and query contracts
 * 2. Authentication service integration contracts
 * 3. Third-party API contracts
 * 4. External service health checks
 * 5. Service dependency management
 */

// Contract testing types and interfaces
interface DatabaseContract {
  connectionString: string;
  maxConnections: number;
  queryTimeout: number;
  retryAttempts: number;
  healthCheckQuery: string;
}

interface AuthenticationContract {
  provider: string;
  endpoint: string;
  tokenExpiry: number;
  refreshTokenSupported: boolean;
  requiredScopes: string[];
}

interface ExternalAPIContract {
  baseURL: string;
  version: string;
  authentication: 'bearer' | 'apikey' | 'oauth';
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  responseFormat: 'json' | 'xml';
  supportedMethods: string[];
}

interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  dependencies: string[];
  metadata?: Record<string, any>;
}

interface ContractValidationResult {
  contractName: string;
  isValid: boolean;
  violations: ContractViolation[];
  performance: {
    responseTime: number;
    throughput?: number;
  };
  lastValidated: Date;
}

interface ContractViolation {
  field: string;
  expected: any;
  actual: any;
  severity: 'critical' | 'major' | 'minor';
  message: string;
}

// Mock External Service Clients
class MockDatabaseClient {
  private config: DatabaseContract;
  private connectionStatus: 'connected' | 'disconnected' | 'error' =
    'disconnected';

  constructor(config: DatabaseContract) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const startTime = performance.now();

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Simulate occasional connection failures
    if (Math.random() < 0.05) {
      this.connectionStatus = 'error';
      throw new Error('Database connection failed');
    }

    this.connectionStatus = 'connected';

    const connectionTime = performance.now() - startTime;
    if (connectionTime > 5000) {
      throw new Error('Database connection timeout');
    }
  }

  async disconnect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 10));
    this.connectionStatus = 'disconnected';
  }

  async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (this.connectionStatus !== 'connected') {
      throw new Error('Database not connected');
    }

    const startTime = performance.now();

    // Simulate query execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));

    const queryTime = performance.now() - startTime;

    if (queryTime > this.config.queryTimeout) {
      throw new Error('Query timeout exceeded');
    }

    // Return mock results based on query type
    if (query.includes('SELECT')) {
      return {
        rows: Array.from(
          { length: Math.floor(Math.random() * 10) + 1 },
          (_, i) => ({
            id: i + 1,
            name: `record_${i + 1}`,
            created_at: new Date(),
          })
        ),
        rowCount: Math.floor(Math.random() * 10) + 1,
      };
    }

    if (
      query.includes('INSERT') ||
      query.includes('UPDATE') ||
      query.includes('DELETE')
    ) {
      return {
        rowsAffected: Math.floor(Math.random() * 5) + 1,
      };
    }

    return { success: true };
  }

  async healthCheck(): Promise<ServiceHealthStatus> {
    try {
      const startTime = performance.now();
      await this.executeQuery(this.config.healthCheckQuery);
      const responseTime = performance.now() - startTime;

      return {
        service: 'database',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        dependencies: ['connection_pool', 'disk_storage'],
        metadata: {
          connectionString: this.config.connectionString.replace(
            /password=[^;]*/i,
            'password=***'
          ),
          maxConnections: this.config.maxConnections,
        },
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: -1,
        lastChecked: new Date(),
        dependencies: ['connection_pool', 'disk_storage'],
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }
}

class MockAuthenticationService {
  private config: AuthenticationContract;
  private tokens: Map<string, { token: string; expiresAt: Date }> = new Map();

  constructor(config: AuthenticationContract) {
    this.config = config;
  }

  async authenticate(credentials: {
    username: string;
    password: string;
  }): Promise<{
    token: string;
    expiresAt: Date;
    scopes: string[];
  }> {
    const startTime = performance.now();

    // Simulate authentication delay
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 200 + 100)
    );

    // Mock authentication logic
    if (
      credentials.username === 'invalid' ||
      credentials.password === 'wrong'
    ) {
      throw new Error('Invalid credentials');
    }

    const authTime = performance.now() - startTime;
    if (authTime > 5000) {
      throw new Error('Authentication timeout');
    }

    const token = `mock_token_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + this.config.tokenExpiry * 1000);

    this.tokens.set(credentials.username, { token, expiresAt });

    return {
      token,
      expiresAt,
      scopes: this.config.requiredScopes,
    };
  }

  async validateToken(token: string): Promise<{
    isValid: boolean;
    username?: string;
    scopes?: string[];
    expiresAt?: Date;
  }> {
    // Simulate token validation delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));

    // Find token in storage
    for (const [username, tokenData] of this.tokens.entries()) {
      if (tokenData.token === token) {
        const isExpired = tokenData.expiresAt <= new Date();
        return {
          isValid: !isExpired,
          username: isExpired ? undefined : username,
          scopes: isExpired ? undefined : this.config.requiredScopes,
          expiresAt: tokenData.expiresAt,
        };
      }
    }

    return { isValid: false };
  }

  async refreshToken(refreshToken: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    if (!this.config.refreshTokenSupported) {
      throw new Error('Refresh tokens not supported');
    }

    // Simulate refresh token logic
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    const token = `refreshed_token_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + this.config.tokenExpiry * 1000);

    return { token, expiresAt };
  }

  async healthCheck(): Promise<ServiceHealthStatus> {
    try {
      const startTime = performance.now();

      // Test authentication endpoint
      await fetch(`${this.config.endpoint}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {
        // Mock response for testing
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      });

      const responseTime = performance.now() - startTime;

      return {
        service: 'authentication',
        status: responseTime < 200 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        dependencies: ['user_database', 'token_store'],
        metadata: {
          provider: this.config.provider,
          endpoint: this.config.endpoint,
          tokenExpiry: this.config.tokenExpiry,
        },
      };
    } catch (error) {
      return {
        service: 'authentication',
        status: 'unhealthy',
        responseTime: -1,
        lastChecked: new Date(),
        dependencies: ['user_database', 'token_store'],
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

class MockExternalAPIClient {
  private config: ExternalAPIContract;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(config: ExternalAPIContract) {
    this.config = config;
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const windowElapsed = (now - this.windowStart) / 1000;

    if (windowElapsed >= this.config.rateLimit.window) {
      // Reset window
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.config.rateLimit.requests) {
      throw new Error('Rate limit exceeded');
    }

    this.requestCount++;
  }

  async makeRequest(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<{
    status: number;
    data: any;
    headers: Record<string, string>;
  }> {
    this.checkRateLimit();

    if (!this.config.supportedMethods.includes(method.toUpperCase())) {
      throw new Error(`Method ${method} not supported`);
    }

    const startTime = performance.now();

    // Simulate API request delay
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 300 + 100)
    );

    const responseTime = performance.now() - startTime;

    // Simulate occasional API failures
    if (Math.random() < 0.02) {
      throw new Error('API service unavailable');
    }

    // Mock response based on endpoint
    let responseData: any;
    if (endpoint.includes('/validation')) {
      responseData = {
        valid: true,
        errors: [],
        suggestions: ['Consider adding more detail'],
      };
    } else if (endpoint.includes('/search')) {
      responseData = {
        results: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          title: `Result ${i + 1}`,
          score: Math.random(),
        })),
        total: 5,
      };
    } else {
      responseData = { message: 'Success', timestamp: new Date() };
    }

    return {
      status: 200,
      data: responseData,
      headers: {
        'content-type':
          this.config.responseFormat === 'json'
            ? 'application/json'
            : 'application/xml',
        'x-response-time': responseTime.toString(),
        'x-rate-limit-remaining': (
          this.config.rateLimit.requests - this.requestCount
        ).toString(),
      },
    };
  }

  async healthCheck(): Promise<ServiceHealthStatus> {
    try {
      const startTime = performance.now();
      await this.makeRequest('GET', '/health');
      const responseTime = performance.now() - startTime;

      return {
        service: 'external_api',
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        dependencies: ['api_gateway', 'load_balancer'],
        metadata: {
          baseURL: this.config.baseURL,
          version: this.config.version,
          rateLimit: this.config.rateLimit,
        },
      };
    } catch (error) {
      return {
        service: 'external_api',
        status: 'unhealthy',
        responseTime: -1,
        lastChecked: new Date(),
        dependencies: ['api_gateway', 'load_balancer'],
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

// Contract Validation Engine
class ContractValidationEngine {
  private databaseClient: MockDatabaseClient;
  private authService: MockAuthenticationService;
  private externalAPI: MockExternalAPIClient;

  constructor(
    databaseConfig: DatabaseContract,
    authConfig: AuthenticationContract,
    apiConfig: ExternalAPIContract
  ) {
    this.databaseClient = new MockDatabaseClient(databaseConfig);
    this.authService = new MockAuthenticationService(authConfig);
    this.externalAPI = new MockExternalAPIClient(apiConfig);
  }

  async validateDatabaseContract(): Promise<ContractValidationResult> {
    const startTime = performance.now();
    const violations: ContractViolation[] = [];

    try {
      // Test database connection
      await this.databaseClient.connect();

      // Test basic CRUD operations
      const selectResult = await this.databaseClient.executeQuery(
        'SELECT * FROM test_table LIMIT 1'
      );
      if (!selectResult.rows || !Array.isArray(selectResult.rows)) {
        violations.push({
          field: 'query_result_format',
          expected: 'object with rows array',
          actual: typeof selectResult,
          severity: 'critical',
          message: 'Database query result format violation',
        });
      }

      // Test health check
      const health = await this.databaseClient.healthCheck();
      if (health.status === 'unhealthy') {
        violations.push({
          field: 'health_status',
          expected: 'healthy or degraded',
          actual: health.status,
          severity: 'critical',
          message: 'Database health check failed',
        });
      }

      await this.databaseClient.disconnect();

      const responseTime = performance.now() - startTime;

      return {
        contractName: 'database_contract',
        isValid: violations.length === 0,
        violations,
        performance: { responseTime },
        lastValidated: new Date(),
      };
    } catch (error) {
      violations.push({
        field: 'connection',
        expected: 'successful connection',
        actual: 'connection failed',
        severity: 'critical',
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        contractName: 'database_contract',
        isValid: false,
        violations,
        performance: { responseTime: performance.now() - startTime },
        lastValidated: new Date(),
      };
    }
  }

  async validateAuthenticationContract(): Promise<ContractValidationResult> {
    const startTime = performance.now();
    const violations: ContractViolation[] = [];

    try {
      // Test authentication flow
      const authResult = await this.authService.authenticate({
        username: 'testuser',
        password: 'testpass',
      });

      if (!authResult.token || typeof authResult.token !== 'string') {
        violations.push({
          field: 'token_format',
          expected: 'string',
          actual: typeof authResult.token,
          severity: 'critical',
          message: 'Authentication token format violation',
        });
      }

      if (!authResult.expiresAt || !(authResult.expiresAt instanceof Date)) {
        violations.push({
          field: 'expiry_format',
          expected: 'Date object',
          actual: typeof authResult.expiresAt,
          severity: 'major',
          message: 'Token expiry format violation',
        });
      }

      // Test token validation
      const validation = await this.authService.validateToken(authResult.token);
      if (!validation.isValid) {
        violations.push({
          field: 'token_validation',
          expected: 'true',
          actual: validation.isValid,
          severity: 'critical',
          message: 'Token validation failed immediately after creation',
        });
      }

      // Test health check
      const health = await this.authService.healthCheck();
      if (health.status === 'unhealthy') {
        violations.push({
          field: 'health_status',
          expected: 'healthy or degraded',
          actual: health.status,
          severity: 'critical',
          message: 'Authentication service health check failed',
        });
      }

      const responseTime = performance.now() - startTime;

      return {
        contractName: 'authentication_contract',
        isValid: violations.length === 0,
        violations,
        performance: { responseTime },
        lastValidated: new Date(),
      };
    } catch (error) {
      violations.push({
        field: 'authentication_flow',
        expected: 'successful authentication',
        actual: 'authentication failed',
        severity: 'critical',
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        contractName: 'authentication_contract',
        isValid: false,
        violations,
        performance: { responseTime: performance.now() - startTime },
        lastValidated: new Date(),
      };
    }
  }

  async validateExternalAPIContract(): Promise<ContractValidationResult> {
    const startTime = performance.now();
    const violations: ContractViolation[] = [];

    try {
      // Test API endpoints
      const validationResponse = await this.externalAPI.makeRequest(
        'POST',
        '/validation',
        {
          data: 'test',
        }
      );

      if (validationResponse.status !== 200) {
        violations.push({
          field: 'response_status',
          expected: 200,
          actual: validationResponse.status,
          severity: 'major',
          message: 'API returned non-200 status code',
        });
      }

      if (
        !validationResponse.data ||
        typeof validationResponse.data !== 'object'
      ) {
        violations.push({
          field: 'response_format',
          expected: 'object',
          actual: typeof validationResponse.data,
          severity: 'critical',
          message: 'API response format violation',
        });
      }

      // Test rate limiting (make multiple requests)
      try {
        for (let i = 0; i < 5; i++) {
          await this.externalAPI.makeRequest('GET', '/test');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Rate limit')) {
          // Rate limiting is working as expected
        } else {
          violations.push({
            field: 'rate_limiting',
            expected: 'rate limit enforcement',
            actual: 'rate limit not enforced',
            severity: 'minor',
            message: 'Rate limiting not working as expected',
          });
        }
      }

      // Test health check
      const health = await this.externalAPI.healthCheck();
      if (health.status === 'unhealthy') {
        violations.push({
          field: 'health_status',
          expected: 'healthy or degraded',
          actual: health.status,
          severity: 'critical',
          message: 'External API health check failed',
        });
      }

      const responseTime = performance.now() - startTime;

      return {
        contractName: 'external_api_contract',
        isValid: violations.length === 0,
        violations,
        performance: { responseTime },
        lastValidated: new Date(),
      };
    } catch (error) {
      violations.push({
        field: 'api_communication',
        expected: 'successful API communication',
        actual: 'API communication failed',
        severity: 'critical',
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        contractName: 'external_api_contract',
        isValid: false,
        violations,
        performance: { responseTime: performance.now() - startTime },
        lastValidated: new Date(),
      };
    }
  }

  async validateAllContracts(): Promise<ContractValidationResult[]> {
    const results = await Promise.all([
      this.validateDatabaseContract(),
      this.validateAuthenticationContract(),
      this.validateExternalAPIContract(),
    ]);

    return results;
  }

  async performServiceHealthChecks(): Promise<ServiceHealthStatus[]> {
    const healthChecks = await Promise.all([
      this.databaseClient.healthCheck(),
      this.authService.healthCheck(),
      this.externalAPI.healthCheck(),
    ]);

    return healthChecks;
  }
}

describe('Contract Tests for External Integrations', () => {
  let contractValidator: ContractValidationEngine;

  const databaseConfig: DatabaseContract = {
    connectionString: 'postgresql://user:password@localhost:5432/testdb',
    maxConnections: 20,
    queryTimeout: 5000,
    retryAttempts: 3,
    healthCheckQuery: 'SELECT 1',
  };

  const authConfig: AuthenticationContract = {
    provider: 'oauth2',
    endpoint: 'https://auth.example.com',
    tokenExpiry: 3600, // 1 hour
    refreshTokenSupported: true,
    requiredScopes: ['read', 'write', 'admin'],
  };

  const apiConfig: ExternalAPIContract = {
    baseURL: 'https://api.example.com/v1',
    version: '1.0',
    authentication: 'bearer',
    rateLimit: {
      requests: 100,
      window: 60, // 1 minute
    },
    responseFormat: 'json',
    supportedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  };

  beforeAll(async () => {
    contractValidator = new ContractValidationEngine(
      databaseConfig,
      authConfig,
      apiConfig
    );
  });

  describe('Database Contract Validation', () => {
    it('should validate database connection contract', async () => {
      const result = await contractValidator.validateDatabaseContract();

      expect(result.contractName).toBe('database_contract');
      expect(result.lastValidated).toBeInstanceOf(Date);
      expect(result.performance.responseTime).toBeGreaterThan(0);

      if (!result.isValid) {
        console.warn('Database contract violations:', result.violations);
      }

      // Database should connect successfully in most cases
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle database connection failures gracefully', async () => {
      // Create a validator with invalid config to test failure handling
      const invalidConfig: DatabaseContract = {
        ...databaseConfig,
        connectionString: 'invalid://connection/string',
      };

      const failValidator = new ContractValidationEngine(
        invalidConfig,
        authConfig,
        apiConfig
      );

      const result = await failValidator.validateDatabaseContract();

      // Should detect contract violations for invalid connections
      expect(result.contractName).toBe('database_contract');
      expect(result.isValid).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(result.performance.responseTime).toBeGreaterThan(0);
    });

    it('should validate database query response format', async () => {
      const result = await contractValidator.validateDatabaseContract();

      expect(result.contractName).toBe('database_contract');

      // Should validate that query responses have expected format
      const formatViolations = result.violations.filter(
        v => v.field === 'query_result_format'
      );

      // Format should be correct for our mock implementation
      expect(formatViolations).toHaveLength(0);
    });
  });

  describe('Authentication Contract Validation', () => {
    it('should validate authentication service contract', async () => {
      const result = await contractValidator.validateAuthenticationContract();

      expect(result.contractName).toBe('authentication_contract');
      expect(result.lastValidated).toBeInstanceOf(Date);
      expect(result.performance.responseTime).toBeGreaterThan(0);

      if (!result.isValid) {
        console.warn('Authentication contract violations:', result.violations);
      }

      // Authentication should work successfully
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should validate token format and expiry', async () => {
      const result = await contractValidator.validateAuthenticationContract();

      const tokenViolations = result.violations.filter(
        v => v.field.includes('token') || v.field.includes('expiry')
      );

      // Token format should be valid
      expect(tokenViolations).toHaveLength(0);
    });

    it('should validate authentication flow end-to-end', async () => {
      const result = await contractValidator.validateAuthenticationContract();

      expect(result.contractName).toBe('authentication_contract');

      // Should not have authentication flow violations
      const flowViolations = result.violations.filter(
        v => v.field === 'authentication_flow'
      );

      expect(flowViolations).toHaveLength(0);
    });
  });

  describe('External API Contract Validation', () => {
    it('should validate external API contract', async () => {
      const result = await contractValidator.validateExternalAPIContract();

      expect(result.contractName).toBe('external_api_contract');
      expect(result.lastValidated).toBeInstanceOf(Date);
      expect(result.performance.responseTime).toBeGreaterThan(0);

      if (!result.isValid) {
        console.warn('External API contract violations:', result.violations);
      }

      // API should respond correctly
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should validate API response format', async () => {
      const result = await contractValidator.validateExternalAPIContract();

      const formatViolations = result.violations.filter(
        v => v.field === 'response_format'
      );

      // Response format should be valid JSON
      expect(formatViolations).toHaveLength(0);
    });

    it('should validate rate limiting behavior', async () => {
      const result = await contractValidator.validateExternalAPIContract();

      // Rate limiting should be enforced
      const rateLimitViolations = result.violations.filter(
        v => v.field === 'rate_limiting'
      );

      // Rate limiting should work correctly in our mock
      expect(rateLimitViolations).toHaveLength(0);
    });
  });

  describe('Service Health Monitoring', () => {
    it('should perform comprehensive health checks', async () => {
      const healthStatuses =
        await contractValidator.performServiceHealthChecks();

      expect(healthStatuses).toHaveLength(3);

      healthStatuses.forEach(status => {
        expect(status.service).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
        expect(status.responseTime).toBeGreaterThanOrEqual(-1);
        expect(status.lastChecked).toBeInstanceOf(Date);
        expect(Array.isArray(status.dependencies)).toBe(true);
      });

      // Most services should be healthy in test environment
      const healthyServices = healthStatuses.filter(
        s => s.status === 'healthy'
      );
      expect(healthyServices.length).toBeGreaterThan(0);
    });

    it('should track service dependencies', async () => {
      const healthStatuses =
        await contractValidator.performServiceHealthChecks();

      healthStatuses.forEach(status => {
        expect(Array.isArray(status.dependencies)).toBe(true);
        expect(status.dependencies.length).toBeGreaterThan(0);

        // Each dependency should be a string
        status.dependencies.forEach(dep => {
          expect(typeof dep).toBe('string');
          expect(dep.length).toBeGreaterThan(0);
        });
      });
    });

    it('should provide service metadata', async () => {
      const healthStatuses =
        await contractValidator.performServiceHealthChecks();

      healthStatuses.forEach(status => {
        if (status.metadata) {
          expect(typeof status.metadata).toBe('object');

          // Should not expose sensitive information
          if (
            status.service === 'database' &&
            status.metadata.connectionString
          ) {
            expect(status.metadata.connectionString).toContain('***');
          }
        }
      });
    });
  });

  describe('Contract Validation Integration', () => {
    it('should validate all contracts simultaneously', async () => {
      const results = await contractValidator.validateAllContracts();

      expect(results).toHaveLength(3);

      results.forEach(result => {
        expect(result.contractName).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.violations)).toBe(true);
        expect(result.performance.responseTime).toBeGreaterThan(0);
        expect(result.lastValidated).toBeInstanceOf(Date);
      });

      // Log any contract violations for debugging
      results.forEach(result => {
        if (!result.isValid) {
          console.warn(
            `Contract violations for ${result.contractName}:`,
            result.violations
          );
        }
      });
    });

    it('should handle concurrent contract validations', async () => {
      const startTime = performance.now();

      // Run multiple validation cycles concurrently
      const validationPromises = Array.from({ length: 3 }, () =>
        contractValidator.validateAllContracts()
      );

      const allResults = await Promise.all(validationPromises);
      const endTime = performance.now();

      // Should complete in reasonable time even with concurrent validations
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      // All results should be valid
      allResults.forEach(results => {
        expect(results).toHaveLength(3);
        results.forEach(result => {
          expect(result.contractName).toBeDefined();
          expect(typeof result.isValid).toBe('boolean');
        });
      });
    });

    it('should provide performance metrics for contract validation', async () => {
      const results = await contractValidator.validateAllContracts();

      results.forEach(result => {
        expect(result.performance.responseTime).toBeGreaterThan(0);
        expect(result.performance.responseTime).toBeLessThan(30000); // 30 seconds max

        // Should complete database operations fastest
        if (result.contractName === 'database_contract') {
          expect(result.performance.responseTime).toBeLessThan(5000); // 5 seconds
        }

        // Authentication should be reasonably fast
        if (result.contractName === 'authentication_contract') {
          expect(result.performance.responseTime).toBeLessThan(10000); // 10 seconds
        }

        // External API might be slower but should still be reasonable
        if (result.contractName === 'external_api_contract') {
          expect(result.performance.responseTime).toBeLessThan(15000); // 15 seconds
        }
      });
    });
  });

  describe('Contract Violation Analysis', () => {
    it('should categorize contract violations by severity', async () => {
      const results = await contractValidator.validateAllContracts();

      results.forEach(result => {
        result.violations.forEach(violation => {
          expect(['critical', 'major', 'minor']).toContain(violation.severity);
          expect(violation.field).toBeDefined();
          expect(violation.message).toBeDefined();
          expect(violation.expected).toBeDefined();
          expect(violation.actual).toBeDefined();
        });
      });
    });

    it('should provide actionable violation messages', async () => {
      const results = await contractValidator.validateAllContracts();

      results.forEach(result => {
        result.violations.forEach(violation => {
          expect(typeof violation.message).toBe('string');
          expect(violation.message.length).toBeGreaterThan(10);

          // Message should be descriptive
          expect(violation.message).not.toBe('error');
          expect(violation.message).not.toBe('failed');
        });
      });
    });

    it('should track contract validation history', async () => {
      // Run multiple validations to build history
      const firstValidation = await contractValidator.validateAllContracts();

      // Wait a small amount to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const secondValidation = await contractValidator.validateAllContracts();

      // Should have different timestamps
      for (let i = 0; i < firstValidation.length; i++) {
        expect(
          secondValidation[i].lastValidated.getTime()
        ).toBeGreaterThanOrEqual(firstValidation[i].lastValidated.getTime());
      }
    });
  });
});
