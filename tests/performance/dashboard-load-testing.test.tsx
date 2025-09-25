/**
 * Admin Dashboard Load Testing Suite
 *
 * Comprehensive load testing for admin dashboard components and workflows
 * under realistic user scenarios and traffic patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock components for load testing
const MockUserTable = ({ users, onFilter, onSort }: any) => {
  React.useEffect(() => {
    // Simulate component rendering time
    const start = performance.now();
    while (performance.now() - start < Math.random() * 10 + 5) {
      // Busy wait to simulate rendering work
    }
  }, [users]);

  return (
    <div data-testid="user-table">
      <input
        data-testid="filter-input"
        onChange={onFilter}
        placeholder="Filter users"
      />
      <button data-testid="sort-button" onClick={onSort}>
        Sort
      </button>
      <div data-testid="user-list">
        {users.map((user: any, i: number) => (
          <div key={i} data-testid={`user-item-${i}`}>
            {user.name} - {user.email}
          </div>
        ))}
      </div>
    </div>
  );
};

const MockAdminDashboard = ({ userCount = 1000 }: { userCount?: number }) => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('');

  React.useEffect(() => {
    // Simulate loading large dataset
    const loadUsers = async () => {
      const start = performance.now();
      const newUsers = Array.from({ length: userCount }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: ['admin', 'moderator', 'user'][i % 3],
        lastActive: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ),
      }));

      // Simulate network delay
      await new Promise(resolve =>
        setTimeout(resolve, Math.max(50, userCount / 20))
      );

      setUsers(newUsers);
      setFilteredUsers(newUsers);
      setLoading(false);

      const loadTime = performance.now() - start;
      if (loadTime > 1000) {
        console.warn(`Slow user loading: ${loadTime}ms for ${userCount} users`);
      }
    };

    loadUsers();
  }, [userCount]);

  React.useEffect(() => {
    const start = performance.now();
    const filtered = users.filter(
      user =>
        user.name.toLowerCase().includes(filter.toLowerCase()) ||
        user.email.toLowerCase().includes(filter.toLowerCase())
    );
    setFilteredUsers(filtered);

    const filterTime = performance.now() - start;
    if (filterTime > 100) {
      console.warn(`Slow filtering: ${filterTime}ms for ${users.length} users`);
    }
  }, [filter, users]);

  const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const handleSort = () => {
    const start = performance.now();
    const sorted = [...filteredUsers].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setFilteredUsers(sorted);

    const sortTime = performance.now() - start;
    if (sortTime > 200) {
      console.warn(
        `Slow sorting: ${sortTime}ms for ${filteredUsers.length} users`
      );
    }
  };

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div data-testid="admin-dashboard">
      <div data-testid="dashboard-header">
        <h1>Admin Dashboard ({filteredUsers.length} users)</h1>
      </div>
      <MockUserTable
        users={filteredUsers}
        onFilter={handleFilter}
        onSort={handleSort}
      />
    </div>
  );
};

// Performance monitoring utilities
class LoadTestMonitor {
  private renderTimes: number[] = [];
  private interactionTimes: number[] = [];
  private memorySnapshots: NodeJS.MemoryUsage[] = [];

  recordRenderTime(time: number) {
    this.renderTimes.push(time);
  }

  recordInteractionTime(time: number) {
    this.interactionTimes.push(time);
  }

  recordMemorySnapshot() {
    this.memorySnapshots.push(process.memoryUsage());
  }

  getRenderStats() {
    return this.calculateStats(this.renderTimes);
  }

  getInteractionStats() {
    return this.calculateStats(this.interactionTimes);
  }

  getMemoryGrowth() {
    if (this.memorySnapshots.length < 2) return 0;
    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];
    return last.heapUsed - first.heapUsed;
  }

  private calculateStats(times: number[]) {
    if (times.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };

    const sorted = [...times].sort((a, b) => a - b);
    return {
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: times.length,
    };
  }

  reset() {
    this.renderTimes = [];
    this.interactionTimes = [];
    this.memorySnapshots = [];
  }
}

const loadTestMonitor = new LoadTestMonitor();

describe('Admin Dashboard Load Testing', () => {
  beforeEach(() => {
    loadTestMonitor.reset();
    loadTestMonitor.recordMemorySnapshot();
  });

  afterEach(() => {
    loadTestMonitor.recordMemorySnapshot();
  });

  describe('Component Rendering Performance', () => {
    it('should render dashboard with small dataset efficiently', async () => {
      const startTime = performance.now();

      const { rerender } = render(<MockAdminDashboard userCount={100} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      loadTestMonitor.recordRenderTime(renderTime);

      expect(renderTime).toBeLessThan(500); // Should render within 500ms
      expect(
        screen.getByText('Admin Dashboard (100 users)')
      ).toBeInTheDocument();
    });

    it('should handle medium dataset rendering', async () => {
      const startTime = performance.now();

      render(<MockAdminDashboard userCount={1000} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      const renderTime = performance.now() - startTime;
      loadTestMonitor.recordRenderTime(renderTime);

      expect(renderTime).toBeLessThan(1500); // Should handle 1k users within 1.5s
      expect(
        screen.getByText('Admin Dashboard (1000 users)')
      ).toBeInTheDocument();
    });

    it('should handle large dataset rendering', async () => {
      const startTime = performance.now();

      render(<MockAdminDashboard userCount={5000} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const renderTime = performance.now() - startTime;
      loadTestMonitor.recordRenderTime(renderTime);

      expect(renderTime).toBeLessThan(5000); // Should handle 5k users within 5s
      expect(
        screen.getByText('Admin Dashboard (5000 users)')
      ).toBeInTheDocument();
    });

    it('should maintain performance across multiple renders', async () => {
      const { rerender } = render(<MockAdminDashboard userCount={500} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      // Perform multiple re-renders with different data sizes
      const renderSizes = [500, 750, 1000, 750, 500];

      for (const size of renderSizes) {
        const startTime = performance.now();
        rerender(<MockAdminDashboard userCount={size} />);

        await waitFor(() => {
          expect(
            screen.getByText(`Admin Dashboard (${size} users)`)
          ).toBeInTheDocument();
        });

        const renderTime = performance.now() - startTime;
        loadTestMonitor.recordRenderTime(renderTime);
      }

      const stats = loadTestMonitor.getRenderStats();
      expect(stats.avg).toBeLessThan(1000);
      expect(stats.max).toBeLessThan(2000);
    });
  });

  describe('User Interaction Performance', () => {
    it('should handle filtering interactions efficiently', async () => {
      const user = userEvent.setup();

      render(<MockAdminDashboard userCount={2000} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const filterInput = screen.getByTestId('filter-input');

      // Test multiple filter operations
      const filterTests = ['user1', 'admin', '@example', 'User 1000', ''];

      for (const filterText of filterTests) {
        const startTime = performance.now();

        await user.clear(filterInput);
        await user.type(filterInput, filterText);

        await waitFor(() => {
          // Wait for filtering to complete
          expect(filterInput).toHaveValue(filterText);
        });

        const interactionTime = performance.now() - startTime;
        loadTestMonitor.recordInteractionTime(interactionTime);
      }

      const stats = loadTestMonitor.getInteractionStats();
      expect(stats.avg).toBeLessThan(300); // Average filter should be under 300ms
      expect(stats.max).toBeLessThan(800); // Max filter should be under 800ms
    });

    it('should handle sorting interactions efficiently', async () => {
      const user = userEvent.setup();

      render(<MockAdminDashboard userCount={1500} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const sortButton = screen.getByTestId('sort-button');

      // Perform multiple sort operations
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        await user.click(sortButton);

        await waitFor(() => {
          // Wait for sort to complete
          expect(sortButton).toBeInTheDocument();
        });

        const interactionTime = performance.now() - startTime;
        loadTestMonitor.recordInteractionTime(interactionTime);
      }

      const stats = loadTestMonitor.getInteractionStats();
      expect(stats.avg).toBeLessThan(500); // Average sort should be under 500ms
      expect(stats.max).toBeLessThan(1000); // Max sort should be under 1s
    });

    it('should handle rapid consecutive interactions', async () => {
      const user = userEvent.setup();

      render(<MockAdminDashboard userCount={1000} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const filterInput = screen.getByTestId('filter-input');
      const sortButton = screen.getByTestId('sort-button');

      const startTime = performance.now();

      // Rapid sequence of interactions
      await user.type(filterInput, 'user');
      await user.click(sortButton);
      await user.clear(filterInput);
      await user.type(filterInput, 'admin');
      await user.click(sortButton);

      const totalTime = performance.now() - startTime;
      loadTestMonitor.recordInteractionTime(totalTime);

      expect(totalTime).toBeLessThan(2000); // Rapid sequence should complete within 2s
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should not have significant memory leaks during normal operations', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<MockAdminDashboard userCount={1000} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const filterInput = screen.getByTestId('filter-input');

      // Perform many operations that could cause memory leaks
      for (let i = 0; i < 20; i++) {
        await user.clear(filterInput);
        await user.type(filterInput, `test${i}`);

        if (i % 5 === 0) {
          rerender(<MockAdminDashboard userCount={1000 + i * 50} />);
          await waitFor(() => {
            expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
          });
        }

        loadTestMonitor.recordMemorySnapshot();
      }

      const memoryGrowth = loadTestMonitor.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    it('should handle large dataset loading without excessive memory usage', async () => {
      const datasets = [1000, 2000, 3000, 2000, 1000];

      for (const datasetSize of datasets) {
        const { unmount } = render(
          <MockAdminDashboard userCount={datasetSize} />
        );

        await waitFor(() => {
          expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        });

        loadTestMonitor.recordMemorySnapshot();
        unmount();

        // Force cleanup
        if (global.gc) {
          global.gc();
        }
      }

      const memoryGrowth = loadTestMonitor.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total growth
    });
  });

  describe('Concurrent User Simulation', () => {
    it('should handle multiple concurrent dashboard instances', async () => {
      const dashboardInstances = [];
      const renderPromises = [];

      // Simulate multiple admin users accessing dashboard simultaneously
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        const instance = render(<MockAdminDashboard userCount={800} />);
        dashboardInstances.push(instance);

        renderPromises.push(
          waitFor(() => {
            expect(
              screen.getAllByTestId('admin-dashboard')[i]
            ).toBeInTheDocument();
          }).then(() => {
            const renderTime = performance.now() - startTime;
            loadTestMonitor.recordRenderTime(renderTime);
          })
        );
      }

      await Promise.all(renderPromises);

      const stats = loadTestMonitor.getRenderStats();
      expect(stats.avg).toBeLessThan(2000); // Concurrent renders should average under 2s
      expect(stats.count).toBe(5);

      // Cleanup
      dashboardInstances.forEach(instance => instance.unmount());
    });

    it('should maintain performance with concurrent user interactions', async () => {
      const users = Array.from({ length: 3 }, () => userEvent.setup());
      const dashboards = users.map(() =>
        render(<MockAdminDashboard userCount={500} />)
      );

      // Wait for all dashboards to load
      await Promise.all(
        dashboards.map(() =>
          waitFor(() => {
            expect(screen.getAllByTestId('admin-dashboard')).toHaveLength(3);
          })
        )
      );

      // Simulate concurrent user interactions
      const interactionPromises = dashboards.map(async (_, index) => {
        const user = users[index];
        const filterInputs = screen.getAllByTestId('filter-input');
        const sortButtons = screen.getAllByTestId('sort-button');

        const startTime = performance.now();

        await user.type(filterInputs[index], `user${index}`);
        await user.click(sortButtons[index]);

        const interactionTime = performance.now() - startTime;
        loadTestMonitor.recordInteractionTime(interactionTime);
      });

      await Promise.all(interactionPromises);

      const stats = loadTestMonitor.getInteractionStats();
      expect(stats.avg).toBeLessThan(800); // Concurrent interactions should be reasonably fast
      expect(stats.count).toBe(3);

      // Cleanup
      dashboards.forEach(dashboard => dashboard.unmount());
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in rendering', async () => {
      const baselineRenders = [];
      const testRenders = [];

      // Baseline measurements
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        const { unmount } = render(<MockAdminDashboard userCount={1000} />);

        await waitFor(() => {
          expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        });

        const renderTime = performance.now() - startTime;
        baselineRenders.push(renderTime);
        unmount();
      }

      // Test measurements (simulate potential regression)
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        const { unmount } = render(<MockAdminDashboard userCount={1000} />);

        await waitFor(() => {
          expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        });

        const renderTime = performance.now() - startTime;
        testRenders.push(renderTime);
        unmount();
      }

      const baselineAvg =
        baselineRenders.reduce((a, b) => a + b, 0) / baselineRenders.length;
      const testAvg =
        testRenders.reduce((a, b) => a + b, 0) / testRenders.length;

      // Test should not be significantly slower than baseline
      const regressionThreshold = baselineAvg * 1.5; // 50% slower is considered regression
      expect(testAvg).toBeLessThan(regressionThreshold);
    });

    it('should maintain consistent interaction performance', async () => {
      const user = userEvent.setup();
      const interactionTimes = [];

      render(<MockAdminDashboard userCount={1500} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const filterInput = screen.getByTestId('filter-input');

      // Measure interaction performance over time
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        await user.clear(filterInput);
        await user.type(filterInput, `test${i}`);

        const interactionTime = performance.now() - startTime;
        interactionTimes.push(interactionTime);

        // Brief pause between interactions
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Check for performance degradation over time
      const firstHalf = interactionTimes.slice(0, 5);
      const secondHalf = interactionTimes.slice(5);

      const firstHalfAvg =
        firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Performance should not degrade significantly over time
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 2);
    });
  });

  describe('Resource Optimization Tests', () => {
    it('should efficiently handle pagination-like scenarios', async () => {
      const user = userEvent.setup();

      render(<MockAdminDashboard userCount={5000} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      const filterInput = screen.getByTestId('filter-input');

      // Simulate pagination by filtering to smaller subsets
      const pageFilters = ['User 1', 'User 2', 'User 3', 'User 4', 'User 5'];

      for (const filter of pageFilters) {
        const startTime = performance.now();

        await user.clear(filterInput);
        await user.type(filterInput, filter);

        await waitFor(() => {
          expect(filterInput).toHaveValue(filter);
        });

        const filterTime = performance.now() - startTime;
        loadTestMonitor.recordInteractionTime(filterTime);
      }

      const stats = loadTestMonitor.getInteractionStats();
      expect(stats.avg).toBeLessThan(200); // Pagination-like filtering should be fast
    });

    it('should handle component updates efficiently', async () => {
      const { rerender } = render(<MockAdminDashboard userCount={1000} />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      // Simulate frequent updates (like real-time data)
      const updateSizes = [1000, 1010, 1020, 1015, 1005, 1000];

      for (const size of updateSizes) {
        const startTime = performance.now();

        rerender(<MockAdminDashboard userCount={size} />);

        await waitFor(() => {
          expect(
            screen.getByText(`Admin Dashboard (${size} users)`)
          ).toBeInTheDocument();
        });

        const updateTime = performance.now() - startTime;
        loadTestMonitor.recordRenderTime(updateTime);
      }

      const stats = loadTestMonitor.getRenderStats();
      expect(stats.avg).toBeLessThan(300); // Updates should be fast
      expect(stats.max).toBeLessThan(800);
    });
  });
});
