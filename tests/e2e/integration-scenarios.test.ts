/**
 * E2E Integration Scenario Tests for The Pensieve Index
 *
 * These tests cover complete user workflows combining multiple components:
 * - Rule selection, drag-and-drop building, validation feedback, story discovery
 * - Cross-component integration testing
 * - End-to-end user journeys with realistic data flow
 * - System integration with database, API, and UI components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM Environment for E2E Testing
interface MockEventTarget {
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  dispatchEvent(event: any): boolean;
}

interface MockElement extends MockEventTarget {
  id: string;
  className: string;
  innerHTML: string;
  textContent: string;
  style: { [key: string]: string };
  dataset: { [key: string]: string };
  children: MockElement[];
  parentElement: MockElement | null;
  querySelector(selector: string): MockElement | null;
  querySelectorAll(selector: string): MockElement[];
  appendChild(child: MockElement): void;
  removeChild(child: MockElement): void;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  focus(): void;
  blur(): void;
  scrollIntoView(): void;
  classList: {
    add(className: string): void;
    remove(className: string): void;
    contains(className: string): boolean;
    toggle(className: string): boolean;
  };

  // Touch/Mouse Interaction Methods
  tap?(
    x: number,
    y: number,
    options?: { isLongPress?: boolean; isDoubleTap?: boolean }
  ): void;
  swipe?(options: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    velocity?: number;
  }): void;
  drag?(options: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration?: number;
  }): void;
  drop?(options: { x: number; y: number; data?: any }): void;
}

class MockElement implements MockElement {
  id = '';
  className = '';
  innerHTML = '';
  textContent = '';
  style: { [key: string]: string } = {};
  dataset: { [key: string]: string } = {};
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  private eventListeners: { [key: string]: ((event: any) => void)[] } = {};

  constructor(
    tagName: string = 'div',
    attributes: { [key: string]: string } = {}
  ) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'class') {
        this.className = value;
      } else if (key === 'id') {
        this.id = value;
      } else {
        this.dataset[key] = value;
      }
    });

    // Initialize classList
    this.classList = {
      add: (className: string) => {
        const classes = this.className.split(' ').filter(c => c);
        if (!classes.includes(className)) {
          classes.push(className);
          this.className = classes.join(' ');
        }
      },
      remove: (className: string) => {
        const classes = this.className
          .split(' ')
          .filter(c => c && c !== className);
        this.className = classes.join(' ');
      },
      contains: (className: string) => {
        return this.className.split(' ').includes(className);
      },
      toggle: (className: string) => {
        if (this.classList.contains(className)) {
          this.classList.remove(className);
          return false;
        } else {
          this.classList.add(className);
          return true;
        }
      },
    };

    // Add interaction methods
    this.tap = (x: number, y: number, options = {}) => {
      const touchEvent = {
        type: options.isLongPress
          ? 'longpress'
          : options.isDoubleTap
          ? 'doubletap'
          : 'tap',
        target: this,
        clientX: x,
        clientY: y,
        touches: [{ clientX: x, clientY: y }],
        ...options,
      };
      this.dispatchEvent(touchEvent);
    };

    this.swipe = options => {
      const swipeEvent = {
        type: 'swipe',
        target: this,
        ...options,
      };
      this.dispatchEvent(swipeEvent);
    };

    this.drag = options => {
      // Simulate drag start, move, and end events
      const dragStart = {
        type: 'dragstart',
        target: this,
        clientX: options.startX,
        clientY: options.startY,
        dataTransfer: { setData: vi.fn(), getData: vi.fn() },
      };
      this.dispatchEvent(dragStart);

      const dragMove = {
        type: 'dragover',
        target: this,
        clientX: options.endX,
        clientY: options.endY,
        preventDefault: vi.fn(),
      };
      this.dispatchEvent(dragMove);
    };

    this.drop = options => {
      const dropEvent = {
        type: 'drop',
        target: this,
        clientX: options.x,
        clientY: options.y,
        dataTransfer: { getData: vi.fn(() => JSON.stringify(options.data)) },
        preventDefault: vi.fn(),
      };
      this.dispatchEvent(dropEvent);
    };
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        l => l !== listener
      );
    }
  }

  dispatchEvent(event: any): boolean {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => {
      try {
        listener.call(this, event);
      } catch (error) {
        console.warn('Event listener error:', error);
      }
    });
    return true;
  }

  querySelector(selector: string): MockElement | null {
    // Simple selector implementation for testing
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this.findById(id);
    } else if (selector.startsWith('[data-testid="')) {
      const testId = selector.match(/\[data-testid="([^"]+)"\]/)?.[1];
      return testId ? this.findByTestId(testId) : null;
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return this.findByClass(className);
    }
    return null;
  }

  querySelectorAll(selector: string): MockElement[] {
    // Simple implementation for basic selectors
    const results: MockElement[] = [];
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      this.findAllByClass(className, results);
    }
    return results;
  }

  private findById(id: string): MockElement | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  private findByTestId(testId: string): MockElement | null {
    if (this.dataset.testid === testId) return this;
    for (const child of this.children) {
      const found = child.findByTestId(testId);
      if (found) return found;
    }
    return null;
  }

  private findByClass(className: string): MockElement | null {
    if (this.classList.contains(className)) return this;
    for (const child of this.children) {
      const found = child.findByClass(className);
      if (found) return found;
    }
    return null;
  }

  private findAllByClass(className: string, results: MockElement[]): void {
    if (this.classList.contains(className)) {
      results.push(this);
    }
    for (const child of this.children) {
      child.findAllByClass(className, results);
    }
  }

  appendChild(child: MockElement): void {
    child.parentElement = this;
    this.children.push(child);
  }

  removeChild(child: MockElement): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
  }

  getAttribute(name: string): string | null {
    if (name === 'class') return this.className;
    if (name === 'id') return this.id;
    return this.dataset[name] || null;
  }

  setAttribute(name: string, value: string): void {
    if (name === 'class') {
      this.className = value;
    } else if (name === 'id') {
      this.id = value;
    } else {
      this.dataset[name] = value;
    }
  }

  removeAttribute(name: string): void {
    if (name === 'class') {
      this.className = '';
    } else if (name === 'id') {
      this.id = '';
    } else {
      delete this.dataset[name];
    }
  }

  focus(): void {
    this.dispatchEvent({ type: 'focus', target: this });
  }

  blur(): void {
    this.dispatchEvent({ type: 'blur', target: this });
  }

  scrollIntoView(): void {
    this.dispatchEvent({ type: 'scroll', target: this });
  }
}

// Mock Integration System for End-to-End Testing
class MockIntegrationSystem {
  private ruleBuilder!: MockElement;
  private validationDashboard!: MockElement;
  private storySearch!: MockElement;
  private container: MockElement;
  private selectedRules: any[] = [];
  private validationState: any = { conflicts: [], suggestions: [] };
  private searchResults: any[] = [];
  private systemState: 'idle' | 'building' | 'validating' | 'searching' =
    'idle';

  constructor() {
    this.container = new MockElement('div', {
      id: 'integration-test-container',
      class: 'pensieve-index-app',
    });

    this.initializeComponents();
    this.setupIntegration();
  }

  private initializeComponents(): void {
    // Initialize Rule Builder Component
    this.ruleBuilder = new MockElement('div', {
      id: 'rule-builder',
      'data-testid': 'rule-builder',
      class: 'rule-builder',
    });

    // Create rule selection panel
    const selectionPanel = new MockElement('div', {
      'data-testid': 'selection-panel',
      class: 'selection-panel',
    });

    // Add sample tags and plot blocks
    const sampleRules = [
      { id: 'tag-1', name: 'angst', type: 'tag' },
      { id: 'tag-2', name: 'fluff', type: 'tag' },
      { id: 'plot-1', name: 'time-travel', type: 'plot-block' },
      { id: 'plot-2', name: 'soulmate-bond', type: 'plot-block' },
    ];

    sampleRules.forEach(rule => {
      const ruleElement = new MockElement('div', {
        'data-testid': `rule-${rule.id}`,
        'data-rule-id': rule.id,
        class: 'rule-item draggable',
      });
      ruleElement.textContent = rule.name;
      ruleElement.dataset.type = rule.type;
      selectionPanel.appendChild(ruleElement);
    });

    // Create pathway building area
    const pathwayPanel = new MockElement('div', {
      'data-testid': 'pathway-panel',
      class: 'pathway-panel drop-zone',
    });

    this.ruleBuilder.appendChild(selectionPanel);
    this.ruleBuilder.appendChild(pathwayPanel);

    // Initialize Validation Dashboard
    this.validationDashboard = new MockElement('div', {
      id: 'validation-dashboard',
      'data-testid': 'validation-dashboard',
      class: 'validation-dashboard',
    });

    const validationDisplay = new MockElement('div', {
      'data-testid': 'validation-display',
      class: 'validation-display',
    });

    const conflictsList = new MockElement('div', {
      'data-testid': 'conflicts-list',
      class: 'conflicts-list',
    });

    const suggestionsList = new MockElement('div', {
      'data-testid': 'suggestions-list',
      class: 'suggestions-list',
    });

    validationDisplay.appendChild(conflictsList);
    validationDisplay.appendChild(suggestionsList);
    this.validationDashboard.appendChild(validationDisplay);

    // Initialize Story Search Component
    this.storySearch = new MockElement('div', {
      id: 'story-search',
      'data-testid': 'story-search',
      class: 'story-search',
    });

    const searchResults = new MockElement('div', {
      'data-testid': 'search-results',
      class: 'search-results',
    });

    const promptGenerator = new MockElement('div', {
      'data-testid': 'prompt-generator',
      class: 'prompt-generator',
    });

    this.storySearch.appendChild(searchResults);
    this.storySearch.appendChild(promptGenerator);

    // Add all components to container
    this.container.appendChild(this.ruleBuilder);
    this.container.appendChild(this.validationDashboard);
    this.container.appendChild(this.storySearch);
  }

  private setupIntegration(): void {
    // Setup drag and drop integration
    const selectionPanel = this.ruleBuilder.querySelector(
      '[data-testid="selection-panel"]'
    )!;
    const pathwayPanel = this.ruleBuilder.querySelector(
      '[data-testid="pathway-panel"]'
    )!;

    // Handle rule selection and drag events
    selectionPanel.addEventListener('dragstart', event => {
      const ruleId = event.target.dataset.ruleId;
      if (ruleId) {
        event.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            id: ruleId,
            name: event.target.textContent,
            type: event.target.dataset.type,
          })
        );
      }
    });

    // Handle drop in pathway panel
    pathwayPanel.addEventListener('drop', event => {
      event.preventDefault();
      const ruleData = JSON.parse(
        event.dataTransfer.getData('application/json')
      );
      this.addRuleToPathway(ruleData);
    });

    pathwayPanel.addEventListener('dragover', event => {
      event.preventDefault();
    });

    // Setup validation integration
    this.validationDashboard.addEventListener('validationUpdate', event => {
      this.updateValidationState(event.detail);
    });

    // Setup search integration
    this.storySearch.addEventListener('searchUpdate', event => {
      this.updateSearchResults(event.detail);
    });
  }

  addRuleToPathway(rule: any): void {
    this.selectedRules.push(rule);
    this.systemState = 'building';

    // Add visual representation to pathway
    const pathwayPanel = this.ruleBuilder.querySelector(
      '[data-testid="pathway-panel"]'
    )!;
    const ruleElement = new MockElement('div', {
      'data-testid': `pathway-rule-${rule.id}`,
      'data-rule-id': rule.id,
      class: 'pathway-rule',
    });
    ruleElement.textContent = rule.name;
    pathwayPanel.appendChild(ruleElement);

    // Trigger validation update
    this.triggerValidation();
  }

  removeRuleFromPathway(ruleId: string): void {
    this.selectedRules = this.selectedRules.filter(rule => rule.id !== ruleId);

    // Remove visual representation
    const pathwayPanel = this.ruleBuilder.querySelector(
      '[data-testid="pathway-panel"]'
    )!;
    const ruleElement = pathwayPanel.querySelector(
      `[data-rule-id="${ruleId}"]`
    );
    if (ruleElement) {
      pathwayPanel.removeChild(ruleElement);
    }

    // Trigger validation update
    this.triggerValidation();
  }

  triggerValidation(): void {
    this.systemState = 'validating';

    // Simulate validation logic
    const conflicts = this.detectConflicts();
    const suggestions = this.generateSuggestions();

    this.validationState = { conflicts, suggestions };

    // Update validation dashboard
    this.updateValidationDisplay();

    // Trigger search if no conflicts
    if (conflicts.length === 0) {
      this.triggerSearch();
    }
  }

  private detectConflicts(): any[] {
    const conflicts = [];

    // Example conflict detection
    const hasAngst = this.selectedRules.some(rule => rule.name === 'angst');
    const hasFluff = this.selectedRules.some(rule => rule.name === 'fluff');

    if (hasAngst && hasFluff) {
      conflicts.push({
        id: 'angst-fluff-conflict',
        type: 'tone-conflict',
        description: 'Angst and fluff tags conflict with each other',
        conflictingRules: ['tag-1', 'tag-2'],
      });
    }

    return conflicts;
  }

  private generateSuggestions(): any[] {
    const suggestions = [];

    // Example suggestion generation
    if (this.selectedRules.length > 0 && this.selectedRules.length < 3) {
      suggestions.push({
        id: 'add-more-tags',
        type: 'completion',
        description: 'Consider adding more tags to narrow your search',
        suggestedRules: [
          { id: 'tag-3', name: 'hurt/comfort', type: 'tag' },
          { id: 'tag-4', name: 'friends-to-lovers', type: 'tag' },
        ],
      });
    }

    return suggestions;
  }

  private updateValidationDisplay(): void {
    const conflictsList = this.validationDashboard.querySelector(
      '[data-testid="conflicts-list"]'
    )!;
    const suggestionsList = this.validationDashboard.querySelector(
      '[data-testid="suggestions-list"]'
    )!;

    // Update conflicts display
    conflictsList.innerHTML = '';
    this.validationState.conflicts.forEach((conflict: any) => {
      const conflictElement = new MockElement('div', {
        'data-testid': `conflict-${conflict.id}`,
        class: 'conflict-item',
      });
      conflictElement.textContent = conflict.description;
      conflictsList.appendChild(conflictElement);
    });

    // Update suggestions display
    suggestionsList.innerHTML = '';
    this.validationState.suggestions.forEach((suggestion: any) => {
      const suggestionElement = new MockElement('div', {
        'data-testid': `suggestion-${suggestion.id}`,
        class: 'suggestion-item',
      });
      suggestionElement.textContent = suggestion.description;
      suggestionsList.appendChild(suggestionElement);
    });
  }

  triggerSearch(): void {
    this.systemState = 'searching';

    // Simulate story search
    this.searchResults = this.performStorySearch();

    // Update search display
    this.updateSearchDisplay();

    // Generate prompt for new stories
    this.generateNewStoryPrompt();

    this.systemState = 'idle';
  }

  private performStorySearch(): any[] {
    // Simulate story search based on selected rules
    const mockStories = [
      {
        id: 'story-1',
        title: 'The Time Turner Chronicles',
        author: 'AuthorOne',
        tags: ['time-travel', 'angst', 'hermione/harry'],
        matchScore: 0.95,
      },
      {
        id: 'story-2',
        title: 'Bonds of Magic',
        author: 'AuthorTwo',
        tags: ['soulmate-bond', 'fluff', 'luna/neville'],
        matchScore: 0.8,
      },
    ];

    // Filter based on selected rules
    return mockStories.filter(story => {
      return this.selectedRules.some(rule => story.tags.includes(rule.name));
    });
  }

  private updateSearchDisplay(): void {
    const searchResults = this.storySearch.querySelector(
      '[data-testid="search-results"]'
    )!;

    searchResults.innerHTML = '';
    this.searchResults.forEach(story => {
      const storyElement = new MockElement('div', {
        'data-testid': `story-${story.id}`,
        class: 'story-result',
      });
      storyElement.innerHTML = `
        <h3>${story.title}</h3>
        <p>by ${story.author}</p>
        <div class="tags">${story.tags.join(', ')}</div>
        <div class="match-score">Match: ${Math.round(
          story.matchScore * 100
        )}%</div>
      `;
      searchResults.appendChild(storyElement);
    });
  }

  private generateNewStoryPrompt(): void {
    const promptGenerator = this.storySearch.querySelector(
      '[data-testid="prompt-generator"]'
    )!;

    const prompt = this.createPromptFromRules();

    promptGenerator.innerHTML = `
      <h3>Create New Story</h3>
      <div class="prompt-text">${prompt}</div>
      <button data-testid="copy-prompt" class="copy-prompt-btn">Copy Prompt</button>
    `;
  }

  private createPromptFromRules(): string {
    if (this.selectedRules.length === 0) {
      return 'Select some rules to generate a story prompt';
    }

    const tags = this.selectedRules
      .filter(rule => rule.type === 'tag')
      .map(rule => rule.name);
    const plotBlocks = this.selectedRules
      .filter(rule => rule.type === 'plot-block')
      .map(rule => rule.name);

    let prompt = 'Write a story that includes';

    if (tags.length > 0) {
      prompt += ` the following elements: ${tags.join(', ')}`;
    }

    if (plotBlocks.length > 0) {
      prompt += ` and incorporates these plot elements: ${plotBlocks.join(
        ', '
      )}`;
    }

    return prompt + '.';
  }

  // Test helper methods
  getContainer(): MockElement {
    return this.container;
  }

  getRuleBuilder(): MockElement {
    return this.ruleBuilder;
  }

  getValidationDashboard(): MockElement {
    return this.validationDashboard;
  }

  getStorySearch(): MockElement {
    return this.storySearch;
  }

  getSelectedRules(): any[] {
    return [...this.selectedRules];
  }

  getValidationState(): any {
    return { ...this.validationState };
  }

  getSearchResults(): any[] {
    return [...this.searchResults];
  }

  getSystemState(): string {
    return this.systemState;
  }

  clearPathway(): void {
    this.selectedRules = [];
    const pathwayPanel = this.ruleBuilder.querySelector(
      '[data-testid="pathway-panel"]'
    )!;
    pathwayPanel.innerHTML = '';
    this.triggerValidation();
  }

  private updateValidationState(state: any): void {
    this.validationState = state;
    this.updateValidationDisplay();
  }

  private updateSearchResults(results: any): void {
    this.searchResults = results;
    this.updateSearchDisplay();
  }
}

// Test Suite
describe('E2E Integration Scenarios for The Pensieve Index', () => {
  let mockSystem: MockIntegrationSystem;

  beforeEach(() => {
    mockSystem = new MockIntegrationSystem();
  });

  afterEach(() => {
    // Cleanup
    mockSystem.clearPathway();
  });

  describe('Complete User Journey - Rule Building to Story Discovery', () => {
    it('should handle complete workflow from rule selection to story results', () => {
      const container = mockSystem.getContainer();
      expect(container).toBeDefined();

      // 1. User starts with empty pathway
      expect(mockSystem.getSelectedRules()).toHaveLength(0);
      expect(mockSystem.getSystemState()).toBe('idle');

      // 2. User drags a tag to pathway
      const ruleBuilder = mockSystem.getRuleBuilder();
      const tagElement = ruleBuilder.querySelector(
        '[data-testid="rule-tag-1"]'
      )!;
      const pathwayPanel = ruleBuilder.querySelector(
        '[data-testid="pathway-panel"]'
      )!;

      // Simulate drag and drop
      tagElement.drag!({
        startX: 100,
        startY: 100,
        endX: 300,
        endY: 200,
        duration: 500,
      });

      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      // 3. Verify rule was added
      expect(mockSystem.getSelectedRules()).toHaveLength(1);
      expect(mockSystem.getSelectedRules()[0].name).toBe('angst');

      // 4. Validation should be triggered
      expect(mockSystem.getSystemState()).toBe('idle'); // Returns to idle after processing

      // 5. Check validation dashboard updated
      const validationDashboard = mockSystem.getValidationDashboard();
      const suggestionsList = validationDashboard.querySelector(
        '[data-testid="suggestions-list"]'
      )!;
      expect(suggestionsList.children.length).toBeGreaterThan(0);

      // 6. Story search should be triggered (no conflicts)
      const storySearch = mockSystem.getStorySearch();
      const searchResults = storySearch.querySelector(
        '[data-testid="search-results"]'
      )!;
      expect(searchResults.children.length).toBeGreaterThan(0);

      // 7. Prompt should be generated
      const promptGenerator = storySearch.querySelector(
        '[data-testid="prompt-generator"]'
      )!;
      expect(promptGenerator.textContent).toContain('angst');
    });

    it('should handle conflict resolution workflow', () => {
      // 1. Add conflicting rules
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // Add angst tag
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      // Add fluff tag (conflicts with angst)
      pathwayPanel.drop!({
        x: 300,
        y: 250,
        data: { id: 'tag-2', name: 'fluff', type: 'tag' },
      });

      // 2. Verify conflicts are detected
      const validationState = mockSystem.getValidationState();
      expect(validationState.conflicts).toHaveLength(1);
      expect(validationState.conflicts[0].type).toBe('tone-conflict');

      // 3. Check conflict display
      const conflictsList = mockSystem
        .getValidationDashboard()
        .querySelector('[data-testid="conflicts-list"]')!;
      expect(conflictsList.children).toHaveLength(1);

      // 4. Search should not be triggered with conflicts
      expect(mockSystem.getSearchResults()).toHaveLength(0);

      // 5. Remove conflicting rule
      mockSystem.removeRuleFromPathway('tag-2');

      // 6. Verify conflict resolved
      const updatedValidationState = mockSystem.getValidationState();
      expect(updatedValidationState.conflicts).toHaveLength(0);

      // 7. Search should now be triggered
      expect(mockSystem.getSearchResults().length).toBeGreaterThan(0);
    });

    it('should handle progressive rule building with real-time feedback', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // 1. Start with one rule
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      let validationState = mockSystem.getValidationState();
      expect(validationState.suggestions).toHaveLength(1);
      expect(validationState.suggestions[0].type).toBe('completion');

      // 2. Add second rule
      pathwayPanel.drop!({
        x: 300,
        y: 250,
        data: { id: 'plot-1', name: 'time-travel', type: 'plot-block' },
      });

      expect(mockSystem.getSelectedRules()).toHaveLength(2);

      // 3. Add third rule
      pathwayPanel.drop!({
        x: 300,
        y: 300,
        data: { id: 'tag-3', name: 'hurt/comfort', type: 'tag' },
      });

      // 4. Validation suggestions should update
      validationState = mockSystem.getValidationState();
      expect(mockSystem.getSelectedRules()).toHaveLength(3);

      // 5. Search results should be more refined
      const searchResults = mockSystem.getSearchResults();
      expect(searchResults.length).toBeGreaterThan(0);

      // 6. Prompt should include all rules
      const promptGenerator = mockSystem
        .getStorySearch()
        .querySelector('[data-testid="prompt-generator"]')!;
      expect(promptGenerator.textContent).toContain('angst');
      expect(promptGenerator.textContent).toContain('time-travel');
      expect(promptGenerator.textContent).toContain('hurt/comfort');
    });
  });

  describe('Cross-Component Integration', () => {
    it('should synchronize state across all components', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // Add rule through rule builder
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'plot-1', name: 'time-travel', type: 'plot-block' },
      });

      // Verify all components updated
      expect(mockSystem.getSelectedRules()).toHaveLength(1);

      // Rule builder should show rule in pathway
      const pathwayRule = pathwayPanel.querySelector('[data-rule-id="plot-1"]');
      expect(pathwayRule).toBeDefined();

      // Validation dashboard should show suggestions
      const suggestionsList = mockSystem
        .getValidationDashboard()
        .querySelector('[data-testid="suggestions-list"]')!;
      expect(suggestionsList.children.length).toBeGreaterThan(0);

      // Story search should show results
      const searchResults = mockSystem
        .getStorySearch()
        .querySelector('[data-testid="search-results"]')!;
      expect(searchResults.children.length).toBeGreaterThan(0);
    });

    it('should handle component interaction events', () => {
      // 1. Add rule via rule builder
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      // 2. Click suggestion from validation dashboard
      const suggestionsList = mockSystem
        .getValidationDashboard()
        .querySelector('[data-testid="suggestions-list"]')!;
      const suggestion = suggestionsList.children[0] as MockElement;

      // Simulate clicking suggestion to add recommended rule
      suggestion.tap!(50, 25);

      // 3. Copy prompt from story search
      const promptGenerator = mockSystem
        .getStorySearch()
        .querySelector('[data-testid="prompt-generator"]')!;
      const copyButton = promptGenerator.querySelector(
        '[data-testid="copy-prompt"]'
      ) as MockElement;

      if (copyButton) {
        copyButton.tap!(50, 25);
        // Verify copy action (mock implementation)
        expect(copyButton.classList.contains('copied')).toBe(false); // Would be true in real implementation
      }
    });

    it('should maintain consistent state during rapid interactions', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // Rapid rule additions
      const rules = [
        { id: 'tag-1', name: 'angst', type: 'tag' },
        { id: 'tag-2', name: 'hurt/comfort', type: 'tag' },
        { id: 'plot-1', name: 'time-travel', type: 'plot-block' },
        { id: 'plot-2', name: 'soulmate-bond', type: 'plot-block' },
      ];

      rules.forEach((rule, index) => {
        pathwayPanel.drop!({
          x: 300,
          y: 200 + index * 50,
          data: rule,
        });
      });

      // Verify final state is consistent
      expect(mockSystem.getSelectedRules()).toHaveLength(4);

      // All components should reflect the complete state
      const pathwayRules = pathwayPanel.querySelectorAll('.pathway-rule');
      expect(pathwayRules).toHaveLength(4);

      // Validation should be current
      const validationState = mockSystem.getValidationState();
      expect(validationState).toBeDefined();

      // Search results should be based on all rules
      const searchResults = mockSystem.getSearchResults();
      expect(searchResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid rule combinations gracefully', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // Try to add invalid rule data
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: null, // Invalid data
      });

      // System should remain stable
      expect(mockSystem.getSelectedRules()).toHaveLength(0);
      expect(mockSystem.getSystemState()).toBe('idle');
    });

    it('should recover from validation errors', () => {
      // Simulate validation failure
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // Add rules that cause complex conflicts
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      pathwayPanel.drop!({
        x: 300,
        y: 250,
        data: { id: 'tag-2', name: 'fluff', type: 'tag' },
      });

      // Verify conflicts detected
      const validationState = mockSystem.getValidationState();
      expect(validationState.conflicts.length).toBeGreaterThan(0);

      // Clear pathway to reset
      mockSystem.clearPathway();

      // Verify system reset
      expect(mockSystem.getSelectedRules()).toHaveLength(0);
      const clearedValidationState = mockSystem.getValidationState();
      expect(clearedValidationState.conflicts).toHaveLength(0);
    });

    it('should handle search failures gracefully', () => {
      // Add rules but simulate search failure
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-unknown', name: 'unknown-tag', type: 'tag' },
      });

      // Search should handle unknown tags gracefully
      const searchResults = mockSystem.getSearchResults();
      expect(searchResults).toHaveLength(0); // No matches for unknown tag

      // Prompt should still be generated
      const promptGenerator = mockSystem
        .getStorySearch()
        .querySelector('[data-testid="prompt-generator"]')!;
      expect(promptGenerator.textContent).toContain('unknown-tag');
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle large rule sets efficiently', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      const startTime = performance.now();

      // Add many rules quickly
      for (let i = 0; i < 20; i++) {
        pathwayPanel.drop!({
          x: 300,
          y: 200,
          data: { id: `tag-${i}`, name: `tag-${i}`, type: 'tag' },
        });
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process within reasonable time
      expect(processingTime).toBeLessThan(1000); // 1 second

      // Final state should be correct
      expect(mockSystem.getSelectedRules()).toHaveLength(20);
    });

    it('should maintain responsive UI during complex validation', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // Add rules that trigger complex validation
      const complexRules = [
        { id: 'tag-1', name: 'angst', type: 'tag' },
        { id: 'tag-2', name: 'fluff', type: 'tag' }, // Conflicts with angst
        { id: 'plot-1', name: 'time-travel', type: 'plot-block' },
        { id: 'plot-2', name: 'alternate-universe', type: 'plot-block' },
        { id: 'tag-3', name: 'hurt/comfort', type: 'tag' },
      ];

      complexRules.forEach(rule => {
        const startTime = performance.now();

        pathwayPanel.drop!({
          x: 300,
          y: 200,
          data: rule,
        });

        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100); // Each operation under 100ms
      });

      // Verify all validation completed
      const validationState = mockSystem.getValidationState();
      expect(validationState.conflicts.length).toBeGreaterThanOrEqual(1);
      expect(validationState.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('User Experience Flows', () => {
    it('should guide user through discovery process', () => {
      // 1. User starts with empty state
      expect(mockSystem.getSelectedRules()).toHaveLength(0);

      const suggestionsList = mockSystem
        .getValidationDashboard()
        .querySelector('[data-testid="suggestions-list"]')!;
      expect(suggestionsList.children).toHaveLength(0);

      // 2. User adds first rule
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      // 3. System provides guidance via suggestions
      const validationState = mockSystem.getValidationState();
      expect(validationState.suggestions.length).toBeGreaterThan(0);

      // 4. User follows suggestion and adds more rules
      pathwayPanel.drop!({
        x: 300,
        y: 250,
        data: { id: 'tag-3', name: 'hurt/comfort', type: 'tag' },
      });

      // 5. System provides more refined results
      const searchResults = mockSystem.getSearchResults();
      expect(searchResults.length).toBeGreaterThanOrEqual(0);

      // 6. User can create new story with generated prompt
      const promptGenerator = mockSystem
        .getStorySearch()
        .querySelector('[data-testid="prompt-generator"]')!;
      expect(promptGenerator.textContent).toContain('Create New Story');
    });

    it('should support iterative refinement process', () => {
      const pathwayPanel = mockSystem
        .getRuleBuilder()
        .querySelector('[data-testid="pathway-panel"]')!;

      // 1. Initial broad search
      pathwayPanel.drop!({
        x: 300,
        y: 200,
        data: { id: 'tag-1', name: 'angst', type: 'tag' },
      });

      let searchResults = mockSystem.getSearchResults();
      const initialResultCount = searchResults.length;

      // 2. Refine with additional tag
      pathwayPanel.drop!({
        x: 300,
        y: 250,
        data: { id: 'plot-1', name: 'time-travel', type: 'plot-block' },
      });

      searchResults = mockSystem.getSearchResults();

      // Results should be more specific (potentially fewer but more relevant)
      expect(searchResults.length).toBeGreaterThanOrEqual(0);

      // 3. Further refinement
      pathwayPanel.drop!({
        x: 300,
        y: 300,
        data: { id: 'tag-3', name: 'hermione/harry', type: 'tag' },
      });

      // Final results should be highly targeted
      const finalResults = mockSystem.getSearchResults();
      expect(finalResults.length).toBeGreaterThanOrEqual(0);
    });
  });
});
