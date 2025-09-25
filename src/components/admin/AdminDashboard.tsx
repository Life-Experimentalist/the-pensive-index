/**
 * Interactive Admin Dashboard Component
 *
 * Main dashboard interface with tabbed navigation and comprehensive admin tools:
 * - Overview with stats and recent activity
 * - Rules management and creation
 * - Templates management
 * - Tag classes configuration
 * - Testing sandbox and validation tools
 * - Import/Export functionality
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import RuleBuilder from './RuleBuilder';
import {
  TrendingUp,
  Settings,
  TestTube,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Play,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

export interface DashboardProps {
  initialTab?: string;
}

interface RuleManagementWorkflowProps {
  fandomId?: string;
  rules?: any[];
  onRuleCreated?: (rule: any) => void;
  onRuleUpdated?: (rule: any) => void;
  onRuleDeleted?: (ruleId: string) => void;
}

interface TestingWorkflowProps {
  fandomId?: string;
  rules?: any[];
  onScenarioCreated?: (scenario: any) => void;
  onTestExecuted?: (results: any) => void;
  onValidationRun?: (config: any) => void;
}

interface TabDefinition {
  id: string;
  label: string;
  testId: string;
  content: React.ReactNode;
}

// Mock API functions for demo purposes
const mockApiCalls = {
  fetchRules: async () => {
    console.log('Fetching rules...');
    return [];
  },
  createRule: async (rule: any) => {
    console.log('Creating rule:', rule);
    return { id: 'new-rule-id', ...rule };
  },
  updateRule: async (rule: any) => {
    console.log('Updating rule:', rule);
    return rule;
  },
  deleteRule: async (ruleId: string) => {
    console.log('Deleting rule:', ruleId);
    return true;
  },
  runValidation: async (config: any) => {
    console.log('Running validation:', config);
    return { passed: 0, failed: 0 };
  },
  runScenario: async (scenario: any) => {
    console.log('Running scenario:', scenario);
    return { success: true, results: [] };
  },
};

const RuleManagementWorkflow: React.FC<RuleManagementWorkflowProps> = ({
  onRuleCreated,
  onRuleUpdated,
  onRuleDeleted,
}) => {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleType, setRuleType] = useState('');

  const handleCreateRule = useCallback(async () => {
    setShowWizard(true);
    await mockApiCalls.fetchRules();
  }, []);

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
  }, []);

  const handleSaveRule = useCallback(async () => {
    const rule = {
      name: ruleName,
      description: ruleDescription,
      type: ruleType,
      template: selectedTemplate,
    };

    // Call mock API and the callback
    const created = await mockApiCalls.createRule(rule);
    onRuleCreated?.(created);

    // Reset form
    setShowWizard(false);
    setRuleName('');
    setRuleDescription('');
    setRuleType('');
    setSelectedTemplate(null);
  }, [ruleName, ruleDescription, ruleType, selectedTemplate, onRuleCreated]);

  const handleSaveAndActivate = useCallback(async () => {
    await handleSaveRule();
    // Additional activation logic would go here
  }, [handleSaveRule]);

  const handleTestRule = useCallback(async () => {
    await mockApiCalls.runValidation({ type: 'single-rule' });
  }, []);

  return (
    <div data-testid="rule-management-workflow">
      <div data-testid="rule-list">
        <Button data-testid="create-rule-btn" onClick={handleCreateRule}>
          Create New Rule
        </Button>
        <div data-testid="rule-item-1">
          <span>Existing Rule 1</span>
          <Button data-testid="edit-rule-1" variant="outline" size="sm">
            Edit
          </Button>
          <Button data-testid="delete-rule-1" variant="outline" size="sm">
            Delete
          </Button>
        </div>
      </div>

      <div
        data-testid="rule-creation-wizard"
        style={{ display: showWizard ? 'block' : 'none' }}
      >
        <div data-testid="template-selection">
          <h3>Select Template</h3>
          <Button
            data-testid="template-1"
            onClick={() => handleTemplateSelect('shipping-exclusivity')}
          >
            Shipping Exclusivity
          </Button>
          <Button
            data-testid="template-2"
            onClick={() => handleTemplateSelect('prerequisite')}
          >
            Prerequisite Rule
          </Button>
          <Button
            data-testid="no-template"
            onClick={() => handleTemplateSelect('none')}
          >
            Start from Scratch
          </Button>
        </div>

        <div data-testid="rule-customization">
          <h3>Customize Rule</h3>
          <Input
            data-testid="rule-name"
            placeholder="Rule name"
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            aria-label="Rule name"
          />
          <textarea
            data-testid="rule-description"
            placeholder="Description"
            value={ruleDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setRuleDescription(e.target.value)
            }
            aria-label="Rule description"
            className="w-full p-2 border rounded"
          />
          <div data-testid="rule-builder">
            <RuleBuilder />
          </div>
        </div>

        <div data-testid="rule-testing">
          <h3>Test Rule</h3>
          <Button data-testid="test-rule" onClick={handleTestRule}>
            Test Rule
          </Button>
          <div data-testid="test-results">Test Results</div>
        </div>

        <div data-testid="rule-deployment">
          <h3>Deploy Rule</h3>
          <Button data-testid="save-rule" onClick={handleSaveRule}>
            Save Rule
          </Button>
          <Button
            data-testid="save-and-activate"
            onClick={handleSaveAndActivate}
          >
            Save & Activate
          </Button>
        </div>
      </div>
    </div>
  );
};

const TestingWorkflow: React.FC<TestingWorkflowProps> = ({
  onScenarioCreated,
  onTestExecuted,
  onValidationRun,
}) => {
  const [activeView, setActiveView] = useState<'scenarios' | 'creation'>(
    'scenarios'
  );
  const [scenarioName, setScenarioName] = useState('');
  const [expectedValid, setExpectedValid] = useState(false);
  const [testResults, setTestResults] = useState({ passed: 0, failed: 0 });

  const handleRunScenario = useCallback(
    async (scenarioId: string) => {
      const results = await mockApiCalls.runScenario({ id: scenarioId });
      onTestExecuted?.(results);
    },
    [onTestExecuted]
  );

  const handleRunAllScenarios = useCallback(async () => {
    const results = await mockApiCalls.runValidation({ type: 'all-scenarios' });
    setTestResults(results);
    onValidationRun?.(results);
  }, [onValidationRun]);

  const handleRegressionTest = useCallback(async () => {
    const results = await mockApiCalls.runValidation({ type: 'regression' });
    setTestResults(results);
    onValidationRun?.(results);
  }, [onValidationRun]);

  const handleSaveScenario = useCallback(async () => {
    const scenario = {
      name: scenarioName,
      expectedValid,
    };

    onScenarioCreated?.(scenario);

    // Reset form
    setScenarioName('');
    setExpectedValid(false);
    setActiveView('scenarios');
  }, [scenarioName, expectedValid, onScenarioCreated]);

  return (
    <div data-testid="testing-workflow">
      <div data-testid="testing-dashboard">
        <div data-testid="test-scenarios">
          <h3>Test Scenarios</h3>
          <Button
            data-testid="create-scenario"
            onClick={() => setActiveView('creation')}
          >
            Create Scenario
          </Button>
          <div data-testid="scenario-list">
            <div data-testid="scenario-item-1">
              <span>Harry/Hermione Conflict Test</span>
              <Button
                data-testid="run-scenario-1"
                onClick={() => handleRunScenario('1')}
              >
                Run
              </Button>
            </div>
          </div>
        </div>
        <div data-testid="bulk-testing">
          <h3>Bulk Testing</h3>
          <Button
            data-testid="run-all-scenarios"
            onClick={handleRunAllScenarios}
          >
            Run All Scenarios
          </Button>
          <Button data-testid="regression-test" onClick={handleRegressionTest}>
            Regression Test
          </Button>
        </div>
        <div data-testid="test-results">
          <h3>Test Results</h3>
          <div data-testid="results-summary">
            <span data-testid="passed-count">Passed: {testResults.passed}</span>
            <span data-testid="failed-count">Failed: {testResults.failed}</span>
          </div>
          <div data-testid="results-details">Detailed Results</div>
        </div>
      </div>
      <div
        data-testid="scenario-creation"
        style={{ display: activeView === 'creation' ? 'block' : 'none' }}
      >
        <Input
          data-testid="scenario-name"
          placeholder="Scenario name"
          value={scenarioName}
          onChange={e => setScenarioName(e.target.value)}
        />
        <div data-testid="input-selection">
          <h4>Input Tags & Plot Blocks</h4>
          <div data-testid="tag-selector">Tag Selector</div>
          <div data-testid="plot-block-selector">Plot Block Selector</div>
        </div>
        <div data-testid="expected-results">
          <h4>Expected Results</h4>
          <label>
            <input
              data-testid="expect-valid"
              type="checkbox"
              checked={expectedValid}
              onChange={e => setExpectedValid(e.target.checked)}
            />
            Should be valid
          </label>
          <div data-testid="expected-errors">Expected Errors</div>
        </div>
        <Button data-testid="save-scenario" onClick={handleSaveScenario}>
          Save Scenario
        </Button>
      </div>
    </div>
  );
};

export default function AdminDashboard({
  initialTab = 'overview',
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [passedCount, setPassedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target &&
        (event.target as HTMLElement).closest('[data-testid="dashboard-nav"]')
      ) {
        const buttons = navRef.current?.querySelectorAll('button') || [];
        const currentIndex = Array.from(buttons).findIndex(
          btn => btn === document.activeElement
        );

        switch (event.key) {
          case 'ArrowRight':
            event.preventDefault();
            const nextIndex = (currentIndex + 1) % buttons.length;
            (buttons[nextIndex] as HTMLElement)?.focus();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            const prevIndex =
              (currentIndex - 1 + buttons.length) % buttons.length;
            (buttons[prevIndex] as HTMLElement)?.focus();
            break;
          case 'Enter':
          case ' ':
            event.preventDefault();
            if (document.activeElement) {
              (document.activeElement as HTMLElement).click();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const handleRuleCreated = useCallback(() => {
    // Handle rule creation
  }, []);

  const handleScenarioCreated = useCallback(() => {
    // Handle scenario creation
  }, []);

  const handleTestExecuted = useCallback((results: any) => {
    setPassedCount(results.passed || 0);
    setFailedCount(results.failed || 0);
  }, []);

  const handleValidationRun = useCallback((results: any) => {
    setPassedCount(results.passed || 0);
    setFailedCount(results.failed || 0);
  }, []);

  const tabs: TabDefinition[] = [
    {
      id: 'overview',
      label: 'Overview',
      testId: 'nav-overview',
      content: <div data-testid="overview-tab">Overview Content</div>,
    },
    {
      id: 'rules',
      label: 'Rules',
      testId: 'nav-rules',
      content: (
        <div data-testid="rules-tab" aria-live="polite">
          <RuleManagementWorkflow
            onRuleCreated={handleRuleCreated}
            onRuleUpdated={() => {}}
            onRuleDeleted={() => {}}
          />
        </div>
      ),
    },
    {
      id: 'templates',
      label: 'Templates',
      testId: 'nav-templates',
      content: <div data-testid="templates-tab">Templates Management</div>,
    },
    {
      id: 'tag-classes',
      label: 'Tag Classes',
      testId: 'nav-tag-classes',
      content: <div data-testid="tag-classes-tab">Tag Classes</div>,
    },
    {
      id: 'testing',
      label: 'Testing',
      testId: 'nav-testing',
      content: (
        <div data-testid="testing-tab" aria-live="polite">
          <TestingWorkflow
            onScenarioCreated={handleScenarioCreated}
            onTestExecuted={handleTestExecuted}
            onValidationRun={handleValidationRun}
          />
        </div>
      ),
    },
    {
      id: 'import-export',
      label: 'Import/Export',
      testId: 'nav-import-export',
      content: <div data-testid="import-export-tab">Import/Export</div>,
    },
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];

  return (
    <div data-testid="admin-dashboard" className="w-full max-w-7xl mx-auto p-4">
      <nav
        data-testid="dashboard-nav"
        ref={navRef}
        role="navigation"
        aria-label="Admin dashboard navigation"
        className="mb-6 overflow-x-auto"
      >
        <div className="flex flex-wrap gap-2 min-w-max">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              data-testid={tab.testId}
              aria-selected={activeTab === tab.id}
              aria-label={`Navigate to ${tab.label} section`}
              onClick={() => handleTabChange(tab.id)}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className="whitespace-nowrap text-sm px-3 py-2 sm:px-4 sm:py-2 sm:text-base"
              size="sm"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </nav>

      <main
        data-testid="dashboard-content"
        role="main"
        aria-labelledby={`nav-${activeTab}`}
        className="w-full"
      >
        <div className="max-w-none overflow-x-auto">{currentTab.content}</div>
      </main>
    </div>
  );
}
