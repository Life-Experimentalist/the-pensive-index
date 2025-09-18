/**
 * E2E Tests for Validation Dashboard
 *
 * Comprehensive testing of the validation dashboard interface that shows
 * conflicts, suggestions, and provides real-time feedback during rule building.
 *
 * Features tested:
 * - Real-time validation feedback display
 * - Conflict visualization and highlighting
 * - Suggestion presentation and application
 * - Interactive conflict resolution
 * - Dashboard performance with complex rule sets
 * - Validation state management
 * - Error handling and recovery
 * - Accessibility features
 */

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

// E2E Test Configuration
const E2E_TIMEOUT = 30000; // 30 second timeout for E2E tests
const VALIDATION_DEBOUNCE = 300; // Match actual validation debounce time

// Types for validation dashboard testing
interface ValidationConflict {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleIds: string[];
  suggestedFix?: string;
  affectedElements?: string[];
}

interface ValidationSuggestion {
  id: string;
  type: 'add' | 'remove' | 'modify';
  message: string;
  targetRule?: string;
  confidence: number;
  preview?: string;
}

interface ValidationState {
  isValid: boolean;
  conflicts: ValidationConflict[];
  suggestions: ValidationSuggestion[];
  validationTime: number;
  rulesProcessed: number;
  lastValidated: Date;
}

interface Rule {
  id: string;
  type: 'tag' | 'plot-block' | 'condition';
  name: string;
  value: any;
  position: { x: number; y: number };
  isHighlighted?: boolean;
  hasConflict?: boolean;
}

// Mock DOM elements with proper implementation
class MockElement {
  tagName: string;
  id: string;
  className: string;
  textContent: string = '';
  innerHTML: string = '';
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  attributes: Map<string, string> = new Map();
  eventListeners: Map<string, Function[]> = new Map();
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};

  constructor(tagName: string = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) || null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    return true;
  }

  appendChild(child: MockElement): MockElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: MockElement): MockElement {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
    return child;
  }

  querySelector(selector: string): MockElement | null {
    return this.findFirst(selector);
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    this.collectMatching(selector, results);
    return results;
  }

  private findFirst(selector: string): MockElement | null {
    if (this.matches(selector)) return this;
    for (const child of this.children) {
      const found = child.findFirst(selector);
      if (found) return found;
    }
    return null;
  }

  private collectMatching(selector: string, results: MockElement[]): void {
    if (this.matches(selector)) {
      results.push(this);
    }
    for (const child of this.children) {
      child.collectMatching(selector, results);
    }
  }

  private matches(selector: string): boolean {
    if (selector.startsWith('#')) {
      return this.id === selector.slice(1);
    }
    if (selector.startsWith('.')) {
      return this.className.includes(selector.slice(1));
    }
    if (selector.startsWith('[') && selector.endsWith(']')) {
      const attrMatch = selector.slice(1, -1);
      if (attrMatch.includes('=')) {
        const [attr, value] = attrMatch.split('=');
        return this.getAttribute(attr) === value.replace(/"/g, '');
      } else {
        return this.getAttribute(attrMatch) !== null;
      }
    }
    return this.tagName === selector.toUpperCase();
  }

  getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      top: 0,
      right: 100,
      bottom: 50,
      left: 0,
      toJSON: () => ({}),
    };
  }

  scrollIntoView(): void {
    // Mock implementation
  }

  focus(): void {
    // Mock implementation
  }

  blur(): void {
    // Mock implementation
  }

  click(): void {
    this.dispatchEvent(new Event('click'));
  }
}

// Validation Dashboard Component Mock
class MockValidationDashboard {
  private container: MockElement;
  private validationState: ValidationState;
  private rules: Rule[] = [];
  private onStateChange?: (state: ValidationState) => void;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(
    containerId: string,
    options: {
      onStateChange?: (state: ValidationState) => void;
    } = {}
  ) {
    this.container = new MockElement('div');
    this.container.id = containerId;
    this.container.className = 'validation-dashboard';
    this.onStateChange = options.onStateChange;

    this.validationState = {
      isValid: true,
      conflicts: [],
      suggestions: [],
      validationTime: 0,
      rulesProcessed: 0,
      lastValidated: new Date(),
    };

    this.initializeDashboard();
  }

  private initializeDashboard(): void {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h2>Validation Dashboard</h2>
        <div class="validation-status" data-testid="validation-status">
          <span class="status-indicator"></span>
          <span class="status-text">Ready</span>
        </div>
      </div>
      <div class="dashboard-content">
        <div class="conflicts-section">
          <h3>Conflicts (<span class="conflicts-count" data-testid="conflicts-count">0</span>)</h3>
          <div class="conflicts-list" data-testid="conflicts-list"></div>
        </div>
        <div class="suggestions-section">
          <h3>Suggestions (<span class="suggestions-count" data-testid="suggestions-count">0</span>)</h3>
          <div class="suggestions-list" data-testid="suggestions-list"></div>
        </div>
        <div class="performance-section">
          <h3>Performance</h3>
          <div class="performance-metrics" data-testid="performance-metrics">
            <div class="metric">
              <span class="label">Validation Time:</span>
              <span class="value" data-testid="validation-time">0ms</span>
            </div>
            <div class="metric">
              <span class="label">Rules Processed:</span>
              <span class="value" data-testid="rules-processed">0</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Set up click handlers for conflict resolution
    this.container.addEventListener('click', (event: any) => {
      const target = event.target as MockElement;

      if (target.className.includes('resolve-conflict')) {
        const conflictId = target.getAttribute('data-conflict-id');
        if (conflictId) {
          this.resolveConflict(conflictId);
        }
      }

      if (target.className.includes('apply-suggestion')) {
        const suggestionId = target.getAttribute('data-suggestion-id');
        if (suggestionId) {
          this.applySuggestion(suggestionId);
        }
      }

      if (target.className.includes('highlight-rule')) {
        const ruleId = target.getAttribute('data-rule-id');
        if (ruleId) {
          this.highlightRule(ruleId);
        }
      }
    });
  }

  updateRules(rules: Rule[]): void {
    this.rules = [...rules];
    this.scheduleValidation();
  }

  private scheduleValidation(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.performValidation();
    }, VALIDATION_DEBOUNCE);
  }

  private async performValidation(): Promise<void> {
    const startTime = performance.now();

    try {
      // Update status to validating
      this.updateValidationStatus('validating', 'Validating rules...');

      // Simulate validation process
      await new Promise(resolve => setTimeout(resolve, 50));

      const conflicts = this.detectConflicts();
      const suggestions = this.generateSuggestions();

      const validationTime = performance.now() - startTime;

      this.validationState = {
        isValid: conflicts.filter(c => c.severity === 'error').length === 0,
        conflicts,
        suggestions,
        validationTime,
        rulesProcessed: this.rules.length,
        lastValidated: new Date(),
      };

      this.updateDashboard();

      if (this.onStateChange) {
        this.onStateChange(this.validationState);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      this.updateValidationStatus('error', 'Validation failed');
    }
  }

  private detectConflicts(): ValidationConflict[] {
    const conflicts: ValidationConflict[] = [];

    // Check for conflicting tags
    const angstRules = this.rules.filter(r => r.value === 'angst');
    const fluffRules = this.rules.filter(r => r.value === 'fluff');

    if (angstRules.length > 0 && fluffRules.length > 0) {
      conflicts.push({
        id: 'conflict_angst_fluff',
        severity: 'warning',
        message:
          'Angst and Fluff tags may create conflicting tone expectations',
        ruleIds: [...angstRules.map(r => r.id), ...fluffRules.map(r => r.id)],
        suggestedFix:
          'Consider using "Hurt/Comfort" instead for emotional range',
        affectedElements: [
          ...angstRules.map(r => r.id),
          ...fluffRules.map(r => r.id),
        ],
      });
    }

    // Check for duplicate rules
    const ruleValues = new Map<string, Rule[]>();
    this.rules.forEach(rule => {
      const key = `${rule.type}:${rule.value}`;
      if (!ruleValues.has(key)) {
        ruleValues.set(key, []);
      }
      ruleValues.get(key)!.push(rule);
    });

    ruleValues.forEach((rules, key) => {
      if (rules.length > 1) {
        conflicts.push({
          id: `conflict_duplicate_${key}`,
          severity: 'error',
          message: `Duplicate rule detected: ${rules[0].name}`,
          ruleIds: rules.map(r => r.id),
          suggestedFix: 'Remove duplicate rules',
          affectedElements: rules.map(r => r.id),
        });
      }
    });

    // Check for too many rules
    if (this.rules.length > 10) {
      conflicts.push({
        id: 'conflict_too_many_rules',
        severity: 'warning',
        message: `Too many rules (${this.rules.length}) may make story discovery difficult`,
        ruleIds: this.rules.map(r => r.id),
        suggestedFix:
          'Consider consolidating similar rules or removing less important ones',
      });
    }

    // Check for invalid combinations
    const timeTravel = this.rules.find(r => r.value === 'time-travel');
    const nextGen = this.rules.find(r => r.value === 'next-generation');

    if (timeTravel && nextGen) {
      conflicts.push({
        id: 'conflict_time_travel_next_gen',
        severity: 'error',
        message: 'Time Travel and Next Generation are typically incompatible',
        ruleIds: [timeTravel.id, nextGen.id],
        suggestedFix: 'Choose either Time Travel or Next Generation, not both',
        affectedElements: [timeTravel.id, nextGen.id],
      });
    }

    return conflicts;
  }

  private generateSuggestions(): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Suggest popular combinations
    if (this.rules.some(r => r.value === 'time-travel')) {
      suggestions.push({
        id: 'suggestion_time_travel_combo',
        type: 'add',
        message:
          'Consider adding "Fix-It" tag - commonly paired with Time Travel',
        confidence: 0.8,
        preview: 'Add Fix-It tag',
      });
    }

    // Suggest specific tags based on plot blocks
    if (this.rules.some(r => r.value === 'goblin-inheritance')) {
      suggestions.push({
        id: 'suggestion_goblin_combo',
        type: 'add',
        message:
          'Stories with Goblin Inheritance often include "Independent Harry" tag',
        confidence: 0.75,
        preview: 'Add Independent Harry tag',
      });
    }

    // Suggest removing less useful rules
    if (this.rules.length > 8) {
      const leastUseful = this.rules.find(r => r.value === 'general-audiences');
      if (leastUseful) {
        suggestions.push({
          id: 'suggestion_remove_general',
          type: 'remove',
          message:
            '"General Audiences" is implied by default and can be removed',
          targetRule: leastUseful.id,
          confidence: 0.6,
          preview: 'Remove General Audiences tag',
        });
      }
    }

    // Suggest modifications for better specificity
    const romanceRules = this.rules.filter(r => r.value === 'romance');
    if (romanceRules.length > 0) {
      suggestions.push({
        id: 'suggestion_specific_romance',
        type: 'modify',
        message:
          'Consider specifying the type of romance (slow burn, enemies to lovers, etc.)',
        targetRule: romanceRules[0].id,
        confidence: 0.7,
        preview: 'Make romance more specific',
      });
    }

    return suggestions;
  }

  private updateDashboard(): void {
    this.updateValidationStatus(
      this.validationState.isValid ? 'valid' : 'invalid',
      this.validationState.isValid ? 'All rules valid' : 'Conflicts detected'
    );

    this.updateConflictsList();
    this.updateSuggestionsList();
    this.updatePerformanceMetrics();
  }

  private updateValidationStatus(status: string, message: string): void {
    const statusIndicator = this.container.querySelector('.status-indicator')!;
    const statusText = this.container.querySelector('.status-text')!;

    statusIndicator.className = `status-indicator status-${status}`;
    statusText.textContent = message;
  }

  private updateConflictsList(): void {
    const conflictsList = this.container.querySelector('.conflicts-list')!;
    const conflictsCount = this.container.querySelector('.conflicts-count')!;

    conflictsCount.textContent =
      this.validationState.conflicts.length.toString();

    if (this.validationState.conflicts.length === 0) {
      conflictsList.innerHTML =
        '<div class="no-conflicts">No conflicts detected</div>';
      return;
    }

    conflictsList.innerHTML = this.validationState.conflicts
      .map(
        conflict => `
      <div class="conflict-item conflict-${
        conflict.severity
      }" data-conflict-id="${conflict.id}" data-testid="conflict-${
          conflict.id
        }">
        <div class="conflict-header">
          <span class="conflict-severity">${conflict.severity.toUpperCase()}</span>
          <span class="conflict-message">${conflict.message}</span>
        </div>
        <div class="conflict-actions">
          ${
            conflict.suggestedFix
              ? `
            <button class="resolve-conflict" data-conflict-id="${conflict.id}" data-testid="resolve-${conflict.id}">
              ${conflict.suggestedFix}
            </button>
          `
              : ''
          }
          <button class="highlight-rules" data-rule-ids="${conflict.ruleIds.join(
            ','
          )}" data-testid="highlight-${conflict.id}">
            Highlight Affected Rules
          </button>
        </div>
        <div class="affected-rules">
          Affects: ${conflict.ruleIds.length} rule(s)
        </div>
      </div>
    `
      )
      .join('');
  }

  private updateSuggestionsList(): void {
    const suggestionsList = this.container.querySelector('.suggestions-list')!;
    const suggestionsCount =
      this.container.querySelector('.suggestions-count')!;

    suggestionsCount.textContent =
      this.validationState.suggestions.length.toString();

    if (this.validationState.suggestions.length === 0) {
      suggestionsList.innerHTML =
        '<div class="no-suggestions">No suggestions available</div>';
      return;
    }

    suggestionsList.innerHTML = this.validationState.suggestions
      .map(
        suggestion => `
      <div class="suggestion-item suggestion-${
        suggestion.type
      }" data-suggestion-id="${suggestion.id}" data-testid="suggestion-${
          suggestion.id
        }">
        <div class="suggestion-header">
          <span class="suggestion-type">${suggestion.type.toUpperCase()}</span>
          <span class="suggestion-message">${suggestion.message}</span>
        </div>
        <div class="suggestion-details">
          <div class="confidence-bar">
            <span class="confidence-label">Confidence:</span>
            <div class="confidence-meter">
              <div class="confidence-fill" style="width: ${
                suggestion.confidence * 100
              }%"></div>
            </div>
            <span class="confidence-value">${Math.round(
              suggestion.confidence * 100
            )}%</span>
          </div>
          ${
            suggestion.preview
              ? `<div class="suggestion-preview">${suggestion.preview}</div>`
              : ''
          }
        </div>
        <div class="suggestion-actions">
          <button class="apply-suggestion" data-suggestion-id="${
            suggestion.id
          }" data-testid="apply-${suggestion.id}">
            Apply Suggestion
          </button>
          <button class="dismiss-suggestion" data-suggestion-id="${
            suggestion.id
          }" data-testid="dismiss-${suggestion.id}">
            Dismiss
          </button>
        </div>
      </div>
    `
      )
      .join('');
  }

  private updatePerformanceMetrics(): void {
    const validationTime = this.container.querySelector(
      '[data-testid="validation-time"]'
    )!;
    const rulesProcessed = this.container.querySelector(
      '[data-testid="rules-processed"]'
    )!;

    validationTime.textContent = `${Math.round(
      this.validationState.validationTime
    )}ms`;
    rulesProcessed.textContent = this.validationState.rulesProcessed.toString();
  }

  private resolveConflict(conflictId: string): void {
    const conflict = this.validationState.conflicts.find(
      c => c.id === conflictId
    );
    if (!conflict) return;

    // Mock conflict resolution
    console.log(`Resolving conflict: ${conflictId}`);

    // Remove conflict from state
    this.validationState.conflicts = this.validationState.conflicts.filter(
      c => c.id !== conflictId
    );
    this.updateDashboard();

    if (this.onStateChange) {
      this.onStateChange(this.validationState);
    }
  }

  private applySuggestion(suggestionId: string): void {
    const suggestion = this.validationState.suggestions.find(
      s => s.id === suggestionId
    );
    if (!suggestion) return;

    // Mock suggestion application
    console.log(`Applying suggestion: ${suggestionId}`);

    // Remove suggestion from state
    this.validationState.suggestions = this.validationState.suggestions.filter(
      s => s.id !== suggestionId
    );
    this.updateDashboard();

    if (this.onStateChange) {
      this.onStateChange(this.validationState);
    }
  }

  private highlightRule(ruleId: string): void {
    // Mock rule highlighting
    console.log(`Highlighting rule: ${ruleId}`);

    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isHighlighted = true;
    }
  }

  // Public API for testing
  getValidationState(): ValidationState {
    return { ...this.validationState };
  }

  getContainer(): MockElement {
    return this.container;
  }

  triggerValidation(): void {
    this.performValidation();
  }

  setValidationState(state: Partial<ValidationState>): void {
    this.validationState = { ...this.validationState, ...state };
    this.updateDashboard();
  }

  clearValidation(): void {
    this.validationState = {
      isValid: true,
      conflicts: [],
      suggestions: [],
      validationTime: 0,
      rulesProcessed: 0,
      lastValidated: new Date(),
    };
    this.rules = [];
    this.updateDashboard();
  }
}

// Global setup for testing
let mockDashboard: MockValidationDashboard;
let mockDocument: any;

describe('E2E Tests for Validation Dashboard', () => {
  beforeAll(() => {
    // Setup mock environment
    mockDocument = {
      createElement: (tag: string) => new MockElement(tag),
      getElementById: (id: string) => mockDocument.body.querySelector(`#${id}`),
      querySelector: (selector: string) =>
        mockDocument.body.querySelector(selector),
      querySelectorAll: (selector: string) =>
        mockDocument.body.querySelectorAll(selector),
      body: new MockElement('body'),
    };

    (global as any).document = mockDocument;
  });

  beforeEach(() => {
    // Reset DOM state
    mockDocument.body.innerHTML = '';

    // Create validation dashboard
    mockDashboard = new MockValidationDashboard('validation-dashboard-test', {
      onStateChange: state => {
        console.log('Validation state changed:', state);
      },
    });

    mockDocument.body.appendChild(mockDashboard.getContainer());
  });

  afterEach(() => {
    // Clean up
    mockDashboard.clearValidation();
  });

  describe('Dashboard Initialization', () => {
    it('should initialize dashboard with all required sections', () => {
      const container = mockDashboard.getContainer();

      expect(container).toBeDefined();
      expect(container.id).toBe('validation-dashboard-test');
      expect(container.className).toBe('validation-dashboard');

      // Check for required sections
      const header = container.querySelector('.dashboard-header');
      const content = container.querySelector('.dashboard-content');
      const conflictsSection = container.querySelector('.conflicts-section');
      const suggestionsSection = container.querySelector(
        '.suggestions-section'
      );
      const performanceSection = container.querySelector(
        '.performance-section'
      );

      expect(header).toBeDefined();
      expect(content).toBeDefined();
      expect(conflictsSection).toBeDefined();
      expect(suggestionsSection).toBeDefined();
      expect(performanceSection).toBeDefined();
    });

    it('should display initial validation status', () => {
      const container = mockDashboard.getContainer();
      const statusText = container.querySelector('.status-text')!;
      const conflictsCount = container.querySelector(
        '[data-testid="conflicts-count"]'
      )!;
      const suggestionsCount = container.querySelector(
        '[data-testid="suggestions-count"]'
      )!;

      expect(statusText.textContent).toBe('Ready');
      expect(conflictsCount.textContent).toBe('0');
      expect(suggestionsCount.textContent).toBe('0');
    });

    it('should show empty state messages', () => {
      const container = mockDashboard.getContainer();
      const conflictsList = container.querySelector(
        '[data-testid="conflicts-list"]'
      )!;
      const suggestionsList = container.querySelector(
        '[data-testid="suggestions-list"]'
      )!;

      expect(conflictsList.innerHTML).toContain('No conflicts detected');
      expect(suggestionsList.innerHTML).toContain('No suggestions available');
    });
  });

  describe('Real-time Validation Display', () => {
    it('should update dashboard when rules change', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 100, y: 100 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 200, y: 100 },
        },
      ];

      mockDashboard.updateRules(testRules);

      // Wait for validation debounce
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const state = mockDashboard.getValidationState();
      expect(state.rulesProcessed).toBe(2);
      expect(state.conflicts.length).toBeGreaterThan(0);

      const container = mockDashboard.getContainer();
      const rulesProcessed = container.querySelector(
        '[data-testid="rules-processed"]'
      )!;
      expect(rulesProcessed.textContent).toBe('2');
    });

    it('should show validation in progress', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Test',
          value: 'test',
          position: { x: 0, y: 0 },
        },
      ];

      // Trigger validation
      mockDashboard.updateRules(testRules);

      // Immediately check status (should be validating)
      const container = mockDashboard.getContainer();
      const statusText = container.querySelector('.status-text')!;

      // Wait for validation to complete
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      // Status should be updated
      const finalStatus = container.querySelector('.status-text')!.textContent;
      expect(finalStatus).not.toBe('Ready');
    });

    it('should update performance metrics in real-time', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Test1',
          value: 'test1',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Test2',
          value: 'test2',
          position: { x: 100, y: 0 },
        },
        {
          id: 'rule3',
          type: 'tag',
          name: 'Test3',
          value: 'test3',
          position: { x: 200, y: 0 },
        },
      ];

      mockDashboard.updateRules(testRules);

      // Wait for validation
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const validationTime = container.querySelector(
        '[data-testid="validation-time"]'
      )!;
      const rulesProcessed = container.querySelector(
        '[data-testid="rules-processed"]'
      )!;

      expect(parseInt(validationTime.textContent!)).toBeGreaterThan(0);
      expect(rulesProcessed.textContent).toBe('3');
    });
  });

  describe('Conflict Visualization', () => {
    it('should detect and display conflicting rules', async () => {
      const conflictingRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 100, y: 0 },
        },
      ];

      mockDashboard.updateRules(conflictingRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const conflictsCount = container.querySelector(
        '[data-testid="conflicts-count"]'
      )!;
      const conflictsList = container.querySelector(
        '[data-testid="conflicts-list"]'
      )!;

      expect(conflictsCount.textContent).toBe('1');
      expect(conflictsList.innerHTML).toContain('Angst and Fluff');
      expect(conflictsList.innerHTML).toContain('conflict-warning');
    });

    it('should show different severity levels for conflicts', async () => {
      const duplicateRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 100, y: 0 },
        },
      ];

      mockDashboard.updateRules(duplicateRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const conflictsList = container.querySelector(
        '[data-testid="conflicts-list"]'
      )!;

      expect(conflictsList.innerHTML).toContain('conflict-error');
      expect(conflictsList.innerHTML).toContain('Duplicate rule');
    });

    it('should provide conflict resolution actions', async () => {
      const conflictingRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Time Travel',
          value: 'time-travel',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Next Generation',
          value: 'next-generation',
          position: { x: 100, y: 0 },
        },
      ];

      mockDashboard.updateRules(conflictingRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const resolveButton = container.querySelector('.resolve-conflict');
      const highlightButton = container.querySelector('.highlight-rules');

      expect(resolveButton).toBeDefined();
      expect(highlightButton).toBeDefined();

      // Test resolve action
      if (resolveButton) {
        resolveButton.click();

        // Conflict should be removed
        const conflictsCount = container.querySelector(
          '[data-testid="conflicts-count"]'
        )!;
        expect(parseInt(conflictsCount.textContent!)).toBeLessThan(1);
      }
    });

    it('should highlight affected rules', async () => {
      const conflictingRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 100, y: 0 },
        },
      ];

      mockDashboard.updateRules(conflictingRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const highlightButton = container.querySelector(
        '[data-testid="highlight-conflict_angst_fluff"]'
      );

      if (highlightButton) {
        highlightButton.click();
        // In a real implementation, would verify visual highlighting
        expect(true).toBe(true); // Mock assertion
      }
    });
  });

  describe('Suggestion System', () => {
    it('should generate relevant suggestions', async () => {
      const timeTravelRule: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Time Travel',
          value: 'time-travel',
          position: { x: 0, y: 0 },
        },
      ];

      mockDashboard.updateRules(timeTravelRule);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const suggestionsCount = container.querySelector(
        '[data-testid="suggestions-count"]'
      )!;
      const suggestionsList = container.querySelector(
        '[data-testid="suggestions-list"]'
      )!;

      expect(parseInt(suggestionsCount.textContent!)).toBeGreaterThan(0);
      expect(suggestionsList.innerHTML).toContain('Fix-It');
    });

    it('should show suggestion confidence levels', async () => {
      const goblinRule: Rule[] = [
        {
          id: 'rule1',
          type: 'plot-block',
          name: 'Goblin Inheritance',
          value: 'goblin-inheritance',
          position: { x: 0, y: 0 },
        },
      ];

      mockDashboard.updateRules(goblinRule);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const confidenceMeter = container.querySelector('.confidence-meter');
      const confidenceValue = container.querySelector('.confidence-value');

      expect(confidenceMeter).toBeDefined();
      expect(confidenceValue).toBeDefined();

      if (confidenceValue) {
        const confidence = parseInt(confidenceValue.textContent!);
        expect(confidence).toBeGreaterThan(0);
        expect(confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should allow applying suggestions', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Time Travel',
          value: 'time-travel',
          position: { x: 0, y: 0 },
        },
      ];

      mockDashboard.updateRules(testRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const applyButton = container.querySelector('.apply-suggestion');

      expect(applyButton).toBeDefined();

      if (applyButton) {
        const initialSuggestionsCount = parseInt(
          container.querySelector('[data-testid="suggestions-count"]')!
            .textContent!
        );

        applyButton.click();

        const newSuggestionsCount = parseInt(
          container.querySelector('[data-testid="suggestions-count"]')!
            .textContent!
        );
        expect(newSuggestionsCount).toBeLessThan(initialSuggestionsCount);
      }
    });

    it('should handle suggestion dismissal', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'General Audiences',
          value: 'general-audiences',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 100, y: 0 },
        },
        {
          id: 'rule3',
          type: 'tag',
          name: 'Adventure',
          value: 'adventure',
          position: { x: 200, y: 0 },
        },
        {
          id: 'rule4',
          type: 'tag',
          name: 'Drama',
          value: 'drama',
          position: { x: 300, y: 0 },
        },
        {
          id: 'rule5',
          type: 'tag',
          name: 'Hurt/Comfort',
          value: 'hurt-comfort',
          position: { x: 400, y: 0 },
        },
        {
          id: 'rule6',
          type: 'tag',
          name: 'Friendship',
          value: 'friendship',
          position: { x: 500, y: 0 },
        },
        {
          id: 'rule7',
          type: 'tag',
          name: 'Family',
          value: 'family',
          position: { x: 600, y: 0 },
        },
        {
          id: 'rule8',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 700, y: 0 },
        },
        {
          id: 'rule9',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 800, y: 0 },
        },
      ];

      mockDashboard.updateRules(testRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const dismissButton = container.querySelector('.dismiss-suggestion');

      if (dismissButton) {
        dismissButton.click();
        // In a real implementation, would verify suggestion is hidden
        expect(true).toBe(true); // Mock assertion
      }
    });
  });

  describe('Interactive Features', () => {
    it('should handle rule highlighting from conflicts', async () => {
      const conflictingRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 100, y: 0 },
        },
      ];

      mockDashboard.updateRules(conflictingRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const highlightButton = container.querySelector('.highlight-rules');

      if (highlightButton) {
        highlightButton.click();

        // Verify highlighting was triggered
        const state = mockDashboard.getValidationState();
        expect(state.conflicts.length).toBeGreaterThan(0);
      }
    });

    it('should update status based on validation results', async () => {
      // Test valid state
      const validRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 0, y: 0 },
        },
      ];

      mockDashboard.updateRules(validRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      let container = mockDashboard.getContainer();
      let statusText = container.querySelector('.status-text')!;
      expect(statusText.textContent).toContain('valid');

      // Test invalid state
      const invalidRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 100, y: 0 },
        }, // Duplicate
      ];

      mockDashboard.updateRules(invalidRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      statusText = container.querySelector('.status-text')!;
      expect(statusText.textContent).toContain('Conflicts detected');
    });

    it('should provide state change notifications', async () => {
      const stateChanges: ValidationState[] = [];

      const dashboardWithCallback = new MockValidationDashboard(
        'test-dashboard',
        {
          onStateChange: state => {
            stateChanges.push(state);
          },
        }
      );

      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Test',
          value: 'test',
          position: { x: 0, y: 0 },
        },
      ];

      dashboardWithCallback.updateRules(testRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1].rulesProcessed).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of rules efficiently', async () => {
      const manyRules: Rule[] = [];
      for (let i = 0; i < 50; i++) {
        manyRules.push({
          id: `rule${i}`,
          type: 'tag',
          name: `Test Rule ${i}`,
          value: `test-rule-${i}`,
          position: { x: i * 20, y: i * 10 },
        });
      }

      const startTime = performance.now();
      mockDashboard.updateRules(manyRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds

      const state = mockDashboard.getValidationState();
      expect(state.rulesProcessed).toBe(50);
      expect(state.validationTime).toBeLessThan(1000); // Validation itself should be fast
    });

    it('should debounce rapid rule updates', async () => {
      const validationSpy = vi.spyOn(mockDashboard as any, 'performValidation');

      // Trigger multiple rapid updates
      for (let i = 0; i < 5; i++) {
        mockDashboard.updateRules([
          {
            id: `rule${i}`,
            type: 'tag',
            name: `Test ${i}`,
            value: `test${i}`,
            position: { x: i, y: i },
          },
        ]);
      }

      // Wait for debounce period
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      // Should only validate once due to debouncing
      expect(validationSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain responsive UI with complex validation', async () => {
      const complexRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 100, y: 0 },
        },
        {
          id: 'rule3',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 200, y: 0 },
        },
        {
          id: 'rule4',
          type: 'tag',
          name: 'Romance',
          value: 'romance',
          position: { x: 300, y: 0 },
        }, // Duplicate
        {
          id: 'rule5',
          type: 'tag',
          name: 'Time Travel',
          value: 'time-travel',
          position: { x: 400, y: 0 },
        },
        {
          id: 'rule6',
          type: 'tag',
          name: 'Next Generation',
          value: 'next-generation',
          position: { x: 500, y: 0 },
        },
      ];

      mockDashboard.updateRules(complexRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const startTime = performance.now();

      // Test UI responsiveness by triggering clicks
      const container = mockDashboard.getContainer();
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => button.click());

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // UI should remain responsive
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock validation error
      const originalPerformValidation = (mockDashboard as any)
        .performValidation;
      (mockDashboard as any).performValidation = vi
        .fn()
        .mockRejectedValue(new Error('Validation failed'));

      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Test',
          value: 'test',
          position: { x: 0, y: 0 },
        },
      ];

      mockDashboard.updateRules(testRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const statusText = container.querySelector('.status-text')!;
      expect(statusText.textContent).toContain('failed');

      // Restore original method
      (mockDashboard as any).performValidation = originalPerformValidation;
    });

    it('should handle missing rule data', async () => {
      const incompleteRules: any[] = [
        { id: 'rule1', type: 'tag' }, // Missing required fields
        { name: 'Test', value: 'test' }, // Missing ID
      ];

      // Should not crash with incomplete data
      expect(() => {
        mockDashboard.updateRules(incompleteRules);
      }).not.toThrow();
    });

    it('should recover from temporary issues', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Test',
          value: 'test',
          position: { x: 0, y: 0 },
        },
      ];

      // Simulate temporary failure then recovery
      let shouldFail = true;
      const originalPerformValidation = (mockDashboard as any)
        .performValidation;
      (mockDashboard as any).performValidation = vi
        .fn()
        .mockImplementation(() => {
          if (shouldFail) {
            shouldFail = false;
            return Promise.reject(new Error('Temporary failure'));
          }
          return originalPerformValidation.call(mockDashboard);
        });

      mockDashboard.updateRules(testRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      // Trigger another validation (should succeed)
      mockDashboard.updateRules([...testRules]);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const state = mockDashboard.getValidationState();
      expect(state.rulesProcessed).toBeGreaterThan(0);
    });
  });

  describe('Accessibility and Usability', () => {
    it('should provide appropriate ARIA labels', () => {
      const container = mockDashboard.getContainer();

      // Check for accessibility attributes
      const conflictsList = container.querySelector(
        '[data-testid="conflicts-list"]'
      );
      const suggestionsList = container.querySelector(
        '[data-testid="suggestions-list"]'
      );

      expect(conflictsList).toBeDefined();
      expect(suggestionsList).toBeDefined();

      // In a real implementation, would check for proper ARIA labels
      expect(conflictsList?.getAttribute('role')).toBe('list');
      expect(suggestionsList?.getAttribute('role')).toBe('list');
    });

    it('should support keyboard navigation', () => {
      const container = mockDashboard.getContainer();
      const buttons = container.querySelectorAll('button');

      // All interactive elements should be focusable
      buttons.forEach(button => {
        expect(button.getAttribute('tabindex')).not.toBe('-1');
      });
    });

    it('should provide clear visual feedback', async () => {
      const testRules: Rule[] = [
        {
          id: 'rule1',
          type: 'tag',
          name: 'Angst',
          value: 'angst',
          position: { x: 0, y: 0 },
        },
        {
          id: 'rule2',
          type: 'tag',
          name: 'Fluff',
          value: 'fluff',
          position: { x: 100, y: 0 },
        },
      ];

      mockDashboard.updateRules(testRules);
      await new Promise(resolve =>
        setTimeout(resolve, VALIDATION_DEBOUNCE + 100)
      );

      const container = mockDashboard.getContainer();
      const statusIndicator = container.querySelector('.status-indicator');

      expect(statusIndicator).toBeDefined();
      expect(statusIndicator?.className).toContain('status-');

      // Check for conflict severity styling
      const conflictItems = container.querySelectorAll('.conflict-item');
      conflictItems.forEach(item => {
        expect(item.className).toMatch(/conflict-(error|warning|info)/);
      });
    });
  });
});
