/**
 * Real-World Admin Scenario Benchmarks
 *
 * Comprehensive benchmarks based on actual admin workflows and usage patterns.
 * These tests simulate realistic admin user behavior and measure performance
 * under real-world conditions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {
  GlobalPerformanceMonitor,
  measureAsync,
  measureMemory,
  PERFORMANCE_THRESHOLDS,
} from '../setup/performance-setup';

// Realistic admin workflow scenarios
const ADMIN_SCENARIOS = {
  DAILY_USER_MANAGEMENT: {
    description: 'Daily user management tasks performed by project admin',
    steps: [
      'Load user list (1000+ users)',
      'Filter users by role',
      'Select 10 users for role update',
      'Bulk assign new roles',
      'View audit logs for verification',
    ],
    expectedDuration: 15000, // 15 seconds
    expectedApiCalls: 8,
  },

  WEEKLY_AUDIT_REVIEW: {
    description: 'Weekly audit log review and analysis',
    steps: [
      'Load audit logs for past week',
      'Filter by action types',
      'Export filtered results',
      'Generate summary report',
    ],
    expectedDuration: 20000, // 20 seconds
    expectedApiCalls: 5,
  },

  EMERGENCY_USER_LOCKOUT: {
    description: 'Emergency response to lock out compromised user',
    steps: [
      'Search for specific user',
      'View user permissions',
      'Revoke all permissions',
      'Log security action',
      'Notify other admins',
    ],
    expectedDuration: 5000, // 5 seconds (time-critical)
    expectedApiCalls: 6,
  },

  BULK_FANDOM_ASSIGNMENT: {
    description: 'Assigning multiple users to new fandom',
    steps: [
      'Load fandom management interface',
      'Search users by criteria',
      'Select 50+ users',
      'Bulk assign to fandom',
      'Verify assignments',
    ],
    expectedDuration: 12000, // 12 seconds
    expectedApiCalls: 10,
  },

  NEW_ADMIN_ONBOARDING: {
    description: 'Setting up permissions for new admin user',
    steps: [
      'Create user invitation',
      'Assign initial role',
      'Configure fandom permissions',
      'Set up dashboard access',
      'Send welcome notification',
    ],
    expectedDuration: 8000, // 8 seconds
    expectedApiCalls: 7,
  },
};

// Mock admin components for realistic testing
const MockAdminWorkflow = ({
  scenario,
  onComplete,
}: {
  scenario: string;
  onComplete: Function;
}) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [apiCallCount, setApiCallCount] = React.useState(0);
  const [startTime] = React.useState(performance.now());

  const scenarioData =
    ADMIN_SCENARIOS[scenario as keyof typeof ADMIN_SCENARIOS];

  const simulateApiCall = async (endpoint: string, duration: number = 100) => {
    setIsLoading(true);
    await fetch(endpoint);
    setApiCallCount(prev => prev + 1);
    setIsLoading(false);
  };

  const executeStep = async (stepIndex: number) => {
    const step = scenarioData.steps[stepIndex];
    setCurrentStep(stepIndex);

    // Simulate different operations based on step content
    if (step.includes('Load') || step.includes('View')) {
      await simulateApiCall('/api/admin/data', 150);
    } else if (step.includes('Filter') || step.includes('Search')) {
      await simulateApiCall('/api/admin/filter', 80);
    } else if (step.includes('Bulk') || step.includes('assign')) {
      await simulateApiCall('/api/admin/bulk-operation', 300);
    } else if (step.includes('Export')) {
      await simulateApiCall('/api/admin/export', 500);
    } else {
      await simulateApiCall('/api/admin/action', 120);
    }

    if (stepIndex < scenarioData.steps.length - 1) {
      setTimeout(() => executeStep(stepIndex + 1), 100);
    } else {
      const totalTime = performance.now() - startTime;
      onComplete({
        scenario,
        totalTime,
        apiCallCount,
        stepsCompleted: scenarioData.steps.length,
      });
    }
  };

  React.useEffect(() => {
    executeStep(0);
  }, []);

  return (
    <div data-testid={`workflow-${scenario}`}>
      <h2>{scenarioData.description}</h2>
      <div data-testid="progress">
        Step {currentStep + 1} of {scenarioData.steps.length}:{' '}
        {scenarioData.steps[currentStep]}
      </div>
      {isLoading && <div data-testid="loading">Processing...</div>}
      <div data-testid="stats">
        API Calls: {apiCallCount} | Expected: {scenarioData.expectedApiCalls}
      </div>
    </div>
  );
};

// Performance benchmark utilities
class ScenarioBenchmark {
  private results: Map<string, any> = new Map();

  async runScenario(scenarioKey: string): Promise<any> {
    return new Promise(resolve => {
      const { result: renderResult, duration: renderTime } = measureSync(() =>
        render(
          <MockAdminWorkflow
            scenario={scenarioKey}
            onComplete={(results: any) => {
              this.results.set(scenarioKey, {
                ...results,
                renderTime,
                timestamp: Date.now(),
              });
              resolve(this.results.get(scenarioKey));
            }}
          />
        )
      );
    });
  }

  async runConcurrentScenarios(
    scenarios: string[],
    maxConcurrent: number = 3
  ): Promise<Map<string, any>> {
    const results = new Map();

    for (let i = 0; i < scenarios.length; i += maxConcurrent) {
      const batch = scenarios.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async scenario => {
        const result = await this.runScenario(scenario);
        return { scenario, result };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ scenario, result }) => {
        results.set(scenario, result);
      });
    }

    return results;
  }

  getResults() {
    return this.results;
  }

  generatePerformanceReport() {
    const report = {
      scenarios: Array.from(this.results.entries()).map(([scenario, data]) => {
        const expected =
          ADMIN_SCENARIOS[scenario as keyof typeof ADMIN_SCENARIOS];
        return {
          scenario,
          description: expected.description,
          performance: {
            actualDuration: data.totalTime,
            expectedDuration: expected.expectedDuration,
            performanceRatio: data.totalTime / expected.expectedDuration,
            withinThreshold: data.totalTime <= expected.expectedDuration * 1.2, // 20% tolerance
          },
          apiCalls: {
            actual: data.apiCallCount,
            expected: expected.expectedApiCalls,
            efficiency: data.apiCallCount <= expected.expectedApiCalls * 1.1, // 10% tolerance
          },
          renderTime: data.renderTime,
        };
      }),
      summary: {
        totalScenarios: this.results.size,
        performingWithinThreshold: 0,
        averagePerformanceRatio: 0,
      },
    };

    // Calculate summary statistics
    report.summary.performingWithinThreshold = report.scenarios.filter(
      s => s.performance.withinThreshold
    ).length;
    report.summary.averagePerformanceRatio =
      report.scenarios.reduce(
        (sum, s) => sum + s.performance.performanceRatio,
        0
      ) / report.scenarios.length;

    return report;
  }
}

describe('Real-World Admin Scenario Benchmarks', () => {
  let benchmark: ScenarioBenchmark;
  let monitor: GlobalPerformanceMonitor;

  beforeEach(() => {
    benchmark = new ScenarioBenchmark();
    monitor = GlobalPerformanceMonitor.getInstance();
  });

  describe('Individual Scenario Performance', () => {
    it('should complete daily user management workflow efficiently', async () => {
      const result = await benchmark.runScenario('DAILY_USER_MANAGEMENT');

      expect(result.totalTime).toBeLessThan(
        ADMIN_SCENARIOS.DAILY_USER_MANAGEMENT.expectedDuration * 1.2
      );
      expect(result.apiCallCount).toBeLessThanOrEqual(
        ADMIN_SCENARIOS.DAILY_USER_MANAGEMENT.expectedApiCalls * 1.1
      );
      expect(result.stepsCompleted).toBe(
        ADMIN_SCENARIOS.DAILY_USER_MANAGEMENT.steps.length
      );

      monitor.recordTestResult('daily-user-management', result);
    });

    it('should handle emergency user lockout quickly', async () => {
      const result = await benchmark.runScenario('EMERGENCY_USER_LOCKOUT');

      // Emergency scenarios must be faster and more reliable
      expect(result.totalTime).toBeLessThan(
        ADMIN_SCENARIOS.EMERGENCY_USER_LOCKOUT.expectedDuration
      );
      expect(result.apiCallCount).toBeLessThanOrEqual(
        ADMIN_SCENARIOS.EMERGENCY_USER_LOCKOUT.expectedApiCalls
      );

      monitor.recordTestResult('emergency-lockout', result);
    });

    it('should handle weekly audit review within acceptable time', async () => {
      const result = await benchmark.runScenario('WEEKLY_AUDIT_REVIEW');

      expect(result.totalTime).toBeLessThan(
        ADMIN_SCENARIOS.WEEKLY_AUDIT_REVIEW.expectedDuration * 1.3
      );
      expect(result.apiCallCount).toBeLessThanOrEqual(
        ADMIN_SCENARIOS.WEEKLY_AUDIT_REVIEW.expectedApiCalls * 1.2
      );

      monitor.recordTestResult('weekly-audit', result);
    });

    it('should complete bulk fandom assignment efficiently', async () => {
      const result = await benchmark.runScenario('BULK_FANDOM_ASSIGNMENT');

      expect(result.totalTime).toBeLessThan(
        ADMIN_SCENARIOS.BULK_FANDOM_ASSIGNMENT.expectedDuration * 1.2
      );
      expect(result.apiCallCount).toBeLessThanOrEqual(
        ADMIN_SCENARIOS.BULK_FANDOM_ASSIGNMENT.expectedApiCalls * 1.1
      );

      monitor.recordTestResult('bulk-fandom-assignment', result);
    });

    it('should handle new admin onboarding smoothly', async () => {
      const result = await benchmark.runScenario('NEW_ADMIN_ONBOARDING');

      expect(result.totalTime).toBeLessThan(
        ADMIN_SCENARIOS.NEW_ADMIN_ONBOARDING.expectedDuration * 1.2
      );
      expect(result.apiCallCount).toBeLessThanOrEqual(
        ADMIN_SCENARIOS.NEW_ADMIN_ONBOARDING.expectedApiCalls * 1.1
      );

      monitor.recordTestResult('admin-onboarding', result);
    });
  });

  describe('Concurrent Scenario Testing', () => {
    it('should handle multiple admins performing different workflows simultaneously', async () => {
      const scenarios = [
        'DAILY_USER_MANAGEMENT',
        'WEEKLY_AUDIT_REVIEW',
        'NEW_ADMIN_ONBOARDING',
      ];

      const startTime = performance.now();
      const results = await benchmark.runConcurrentScenarios(scenarios, 3);
      const totalTime = performance.now() - startTime;

      // All scenarios should complete within reasonable time when run concurrently
      expect(totalTime).toBeLessThan(30000); // 30 seconds max for all concurrent scenarios
      expect(results.size).toBe(3);

      // Each individual scenario should still perform reasonably
      for (const [scenario, result] of results.entries()) {
        const expected =
          ADMIN_SCENARIOS[scenario as keyof typeof ADMIN_SCENARIOS];
        expect(result.totalTime).toBeLessThan(expected.expectedDuration * 1.5); // Allow 50% more time for concurrent execution
      }

      monitor.recordTestResult('concurrent-scenarios', {
        totalTime,
        scenarios: scenarios.length,
        results: Object.fromEntries(results),
      });
    });

    it('should maintain performance under admin user load', async () => {
      // Simulate multiple users performing the same workflow
      const scenario = 'DAILY_USER_MANAGEMENT';
      const userCount = 5;

      const userPromises = Array.from(
        { length: userCount },
        async (_, userIndex) => {
          const userResult = await benchmark.runScenario(scenario);
          return { user: userIndex, ...userResult };
        }
      );

      const results = await Promise.all(userPromises);

      // All users should complete their workflows
      expect(results).toHaveLength(userCount);

      // Performance should not degrade significantly with multiple users
      const avgTime =
        results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
      const maxTime = Math.max(...results.map(r => r.totalTime));

      expect(avgTime).toBeLessThan(
        ADMIN_SCENARIOS[scenario].expectedDuration * 1.3
      );
      expect(maxTime).toBeLessThan(
        ADMIN_SCENARIOS[scenario].expectedDuration * 1.6
      );

      monitor.recordTestResult('multi-user-load', {
        userCount,
        avgTime,
        maxTime,
        results,
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during complex workflows', async () => {
      const { result, memoryDelta } = await measureMemory(async () => {
        const scenarios = Object.keys(ADMIN_SCENARIOS);
        const results = [];

        for (const scenario of scenarios) {
          const result = await benchmark.runScenario(scenario);
          results.push(result);

          // Force cleanup between scenarios
          if (global.gc) {
            global.gc();
          }
        }

        return results;
      });

      expect(result).toHaveLength(Object.keys(ADMIN_SCENARIOS).length);
      expect(memoryDelta).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_USAGE.MAX_GROWTH
      );

      monitor.recordTestResult('memory-management', {
        memoryDelta,
        scenariosCompleted: result.length,
      });
    });

    it('should handle resource cleanup properly', async () => {
      const initialMemory = process.memoryUsage();

      // Run multiple scenarios with resource-intensive operations
      for (let i = 0; i < 3; i++) {
        await benchmark.runScenario('WEEKLY_AUDIT_REVIEW'); // Most resource-intensive

        // Force cleanup
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryGrowth).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_USAGE.LEAK_THRESHOLD
      );
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions across scenarios', async () => {
      // Run baseline measurements
      const baselineResults = new Map();

      for (const scenario of Object.keys(ADMIN_SCENARIOS)) {
        const result = await benchmark.runScenario(scenario);
        baselineResults.set(scenario, result);
      }

      // Run test measurements (simulating potential regression)
      const testResults = new Map();

      for (const scenario of Object.keys(ADMIN_SCENARIOS)) {
        const result = await benchmark.runScenario(scenario);
        testResults.set(scenario, result);
      }

      // Compare results
      for (const scenario of Object.keys(ADMIN_SCENARIOS)) {
        const baseline = baselineResults.get(scenario);
        const test = testResults.get(scenario);

        const performanceRatio = test.totalTime / baseline.totalTime;

        // Should not be significantly slower (within 30% tolerance for normal variation)
        expect(performanceRatio).toBeLessThan(1.3);
      }
    });

    it('should maintain consistent performance characteristics', async () => {
      const scenario = 'EMERGENCY_USER_LOCKOUT'; // Most time-critical
      const iterations = 5;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const result = await benchmark.runScenario(scenario);
        results.push(result.totalTime);
      }

      const avgTime =
        results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);
      const variance = maxTime - minTime;

      // Performance should be consistent (low variance)
      expect(variance).toBeLessThan(avgTime * 0.5); // Variance should be less than 50% of average
      expect(maxTime).toBeLessThan(ADMIN_SCENARIOS[scenario].expectedDuration);
    });
  });

  describe('Comprehensive Benchmark Report', () => {
    it('should generate comprehensive performance report', async () => {
      // Run all scenarios
      for (const scenario of Object.keys(ADMIN_SCENARIOS)) {
        await benchmark.runScenario(scenario);
      }

      const report = benchmark.generatePerformanceReport();

      expect(report.scenarios).toHaveLength(
        Object.keys(ADMIN_SCENARIOS).length
      );
      expect(report.summary.totalScenarios).toBe(
        Object.keys(ADMIN_SCENARIOS).length
      );

      // At least 80% of scenarios should perform within threshold
      expect(report.summary.performingWithinThreshold).toBeGreaterThanOrEqual(
        Math.floor(report.summary.totalScenarios * 0.8)
      );

      // Average performance ratio should be reasonable
      expect(report.summary.averagePerformanceRatio).toBeLessThan(1.2);

      monitor.recordTestResult('comprehensive-benchmark', report);

      // Log detailed report for analysis
      console.log('\n=== Admin Scenario Benchmark Report ===');
      console.log(`Total scenarios tested: ${report.summary.totalScenarios}`);
      console.log(
        `Scenarios within threshold: ${report.summary.performingWithinThreshold}`
      );
      console.log(
        `Average performance ratio: ${report.summary.averagePerformanceRatio.toFixed(
          2
        )}`
      );

      report.scenarios.forEach(scenario => {
        const status = scenario.performance.withinThreshold ? '✅' : '❌';
        console.log(
          `${status} ${
            scenario.scenario
          }: ${scenario.performance.actualDuration.toFixed(
            0
          )}ms (${scenario.performance.performanceRatio.toFixed(2)}x expected)`
        );
      });

      console.log('=== End Benchmark Report ===\n');
    });
  });
});
