/**
 * Workflow Testing Type Definitions
 *
 * Types for defining and executing admin workflow test scenarios
 */

export interface WorkflowAssertion {
  type: 'ui' | 'api' | 'database';
  description: string;
  check: () => Promise<any> | any;
}

export interface WorkflowStep {
  name: string;
  action: () => Promise<void>;
  assertions: WorkflowAssertion[];
}

export interface WorkflowScenario {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface TestUser {
  email: string;
  name: string;
  role?: string;
}

export interface TestHierarchy {
  superAdmin: TestUser;
  projectAdmin: TestUser;
  fandomAdmin: TestUser;
  moderator: TestUser;
}

export interface AuditEvent {
  action: string;
  actor: string;
  target: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export interface APICall {
  method: string;
  path: string;
  data?: any;
  timestamp?: Date;
}

export interface DatabaseOperation {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  data?: any;
  where?: Record<string, any>;
}

export interface MockSystemState {
  users: TestUser[];
  roles: Map<string, string[]>;
  permissions: Map<string, string[]>;
  invitations: Map<string, any>;
  auditEvents: AuditEvent[];
  apiCalls: APICall[];
  databaseOperations: DatabaseOperation[];
}
