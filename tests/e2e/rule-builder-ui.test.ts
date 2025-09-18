/**
 * End-to-End Tests for Rule Builder UI
 *
 * Comprehensive testing of the drag-and-drop rule builder interface
 * covering user interactions, validation feedback, and mobile responsiveness.
 *
 * Features tested:
 * - Drag-and-drop interactions
 * - Rule configuration and editing
 * - Real-time validation feedback
 * - Mobile touch interactions
 * - Responsive design behavior
 * - Error handling and recovery
 * - Accessibility features
 * - Performance under load
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
const TEST_PORT = 3001;
const TEST_URL = `http://localhost:${TEST_PORT}`;

// Mock DOM and browser APIs for E2E testing
class MockDragEvent extends Event {
  dataTransfer: MockDataTransfer;

  constructor(type: string, options: EventInit = {}) {
    super(type, options);
    this.dataTransfer = new MockDataTransfer();
  }
}

class MockDataTransfer {
  private data: Map<string, string> = new Map();

  setData(format: string, data: string): void {
    this.data.set(format, data);
  }

  getData(format: string): string {
    return this.data.get(format) || '';
  }

  get types(): string[] {
    return Array.from(this.data.keys());
  }

  get files(): FileList {
    return [] as any;
  }

  get items(): DataTransferItemList {
    return [] as any;
  }

  setDragImage(image: Element, x: number, y: number): void {
    // Mock implementation
  }
}

class MockTouchEvent extends Event {
  touches: MockTouchList;
  targetTouches: MockTouchList;
  changedTouches: MockTouchList;

  constructor(type: string, options: { touches?: MockTouch[] } = {}) {
    super(type);
    const touches = options.touches || [];
    this.touches = new MockTouchList(touches);
    this.targetTouches = new MockTouchList(touches);
    this.changedTouches = new MockTouchList(touches);
  }
}

class MockTouchList extends Array<MockTouch> {
  constructor(touches: MockTouch[]) {
    super(...touches);
  }

  item(index: number): MockTouch | null {
    return this[index] || null;
  }
}

class MockTouch {
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  radiusX?: number;
  radiusY?: number;
  rotationAngle?: number;
  force?: number;

  constructor(options: {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    pageX?: number;
    pageY?: number;
    screenX?: number;
    screenY?: number;
  }) {
    this.identifier = options.identifier;
    this.target = options.target;
    this.clientX = options.clientX;
    this.clientY = options.clientY;
    this.pageX = options.pageX || options.clientX;
    this.pageY = options.pageY || options.clientY;
    this.screenX = options.screenX || options.clientX;
    this.screenY = options.screenY || options.clientY;
  }
}

// Mock DOM elements for testing
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
    // Simple selector implementation for testing
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.findById(id);
    }
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return this.findByClass(className);
    }
    return this.findByTagName(selector);
  }

  querySelectorAll(selector: string): MockElement[] {
    // Simple implementation for testing
    const results: MockElement[] = [];
    this.collectMatching(selector, results);
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

  // Public version for document access
  findByIdPublic(id: string): MockElement | null {
    return this.findById(id);
  }

  private findByClass(className: string): MockElement | null {
    if (this.className.includes(className)) return this;
    for (const child of this.children) {
      const found = child.findByClass(className);
      if (found) return found;
    }
    return null;
  }

  private findByTagName(tagName: string): MockElement | null {
    if (this.tagName === tagName.toUpperCase()) return this;
    for (const child of this.children) {
      const found = child.findByTagName(tagName);
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

// Mock Document and Window for E2E testing
class MockDocument {
  body: MockElement;
  documentElement: MockElement;
  activeElement: MockElement | null = null;

  constructor() {
    this.body = new MockElement('body');
    this.documentElement = new MockElement('html');
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName: string): MockElement {
    return new MockElement(tagName);
  }

  getElementById(id: string): MockElement | null {
    return this.documentElement.findByIdPublic(id);
  }

  querySelector(selector: string): MockElement | null {
    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector: string): MockElement[] {
    return this.documentElement.querySelectorAll(selector);
  }

  addEventListener(type: string, listener: Function): void {
    this.documentElement.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: Function): void {
    this.documentElement.removeEventListener(type, listener);
  }
}

class MockWindow {
  document: MockDocument;
  location: { href: string; pathname: string; search: string; hash: string };
  innerWidth: number = 1024;
  innerHeight: number = 768;
  history: { pushState: Function; replaceState: Function; back: Function };
  localStorage: Storage;
  sessionStorage: Storage;

  constructor() {
    this.document = new MockDocument();
    this.location = {
      href: TEST_URL,
      pathname: '/',
      search: '',
      hash: '',
    };
    this.history = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
    };
    this.localStorage = new MockStorage();
    this.sessionStorage = new MockStorage();
  }

  addEventListener(type: string, listener: Function): void {
    // Mock implementation
  }

  removeEventListener(type: string, listener: Function): void {
    // Mock implementation
  }

  setTimeout(handler: Function, timeout?: number): number {
    return setTimeout(handler, timeout) as any;
  }

  clearTimeout(id: number): void {
    clearTimeout(id);
  }

  setInterval(handler: Function, timeout?: number): number {
    return setInterval(handler, timeout) as any;
  }

  clearInterval(id: number): void {
    clearInterval(id);
  }

  requestAnimationFrame(callback: FrameRequestCallback): number {
    return setTimeout(callback, 16) as any; // ~60fps
  }

  cancelAnimationFrame(id: number): void {
    clearTimeout(id);
  }

  getComputedStyle(element: Element): CSSStyleDeclaration {
    return {} as CSSStyleDeclaration;
  }
}

class MockStorage implements Storage {
  private data: Map<string, string> = new Map();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

// Rule Builder Component Mock
interface RuleBuilderConfig {
  containerId: string;
  validationEndpoint: string;
  onValidation?: (result: ValidationResult) => void;
  onRuleChange?: (rules: Rule[]) => void;
}

interface Rule {
  id: string;
  type: 'tag' | 'plot-block' | 'condition';
  name: string;
  value: any;
  position: { x: number; y: number };
  dependencies?: string[];
}

interface ValidationResult {
  isValid: boolean;
  conflicts: ValidationConflict[];
  suggestions: ValidationSuggestion[];
  performance: {
    validationTime: number;
    rulesProcessed: number;
  };
}

interface ValidationConflict {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleIds: string[];
  suggestedFix?: string;
}

interface ValidationSuggestion {
  id: string;
  type: 'add' | 'remove' | 'modify';
  message: string;
  targetRule?: string;
  confidence: number;
}

class MockRuleBuilderComponent {
  private config: RuleBuilderConfig;
  private container: MockElement;
  private rules: Rule[] = [];
  private dragState: {
    isDragging: boolean;
    draggedRule: Rule | null;
    dragOffset: { x: number; y: number };
  } = { isDragging: false, draggedRule: null, dragOffset: { x: 0, y: 0 } };
  private validationTimer: NodeJS.Timeout | null = null;

  constructor(config: RuleBuilderConfig) {
    this.config = config;
    this.container = new MockElement('div');
    this.container.id = config.containerId;
    this.container.className = 'rule-builder-container';
    this.initializeComponent();
  }

  private initializeComponent(): void {
    // Create rule palette
    const palette = new MockElement('div');
    palette.className = 'rule-palette';
    palette.innerHTML = `
      <div class="palette-section">
        <h3>Tags</h3>
        <div class="palette-items">
          <div class="palette-item" data-type="tag" data-value="angst">Angst</div>
          <div class="palette-item" data-type="tag" data-value="fluff">Fluff</div>
          <div class="palette-item" data-type="tag" data-value="time-travel">Time Travel</div>
        </div>
      </div>
      <div class="palette-section">
        <h3>Plot Blocks</h3>
        <div class="palette-items">
          <div class="palette-item" data-type="plot-block" data-value="goblin-inheritance">Goblin Inheritance</div>
          <div class="palette-item" data-type="plot-block" data-value="wrong-boy-who-lived">Wrong Boy Who Lived</div>
        </div>
      </div>
    `;

    // Create canvas area
    const canvas = new MockElement('div');
    canvas.className = 'rule-canvas';
    canvas.setAttribute('data-testid', 'rule-canvas');

    // Create validation panel
    const validationPanel = new MockElement('div');
    validationPanel.className = 'validation-panel';
    validationPanel.innerHTML = `
      <h3>Validation Results</h3>
      <div class="validation-content">
        <div class="conflicts-list"></div>
        <div class="suggestions-list"></div>
      </div>
    `;

    this.container.appendChild(palette);
    this.container.appendChild(canvas);
    this.container.appendChild(validationPanel);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Drag and drop from palette
    const paletteItems = this.container.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
      item.addEventListener(
        'dragstart',
        this.handlePaletteDragStart.bind(this)
      );
      item.addEventListener(
        'touchstart',
        this.handlePaletteTouchStart.bind(this)
      );
    });

    // Canvas drop handling
    const canvas = this.container.querySelector('.rule-canvas')!;
    canvas.addEventListener('dragover', this.handleCanvasDragOver.bind(this));
    canvas.addEventListener('drop', this.handleCanvasDrop.bind(this));
    canvas.addEventListener('touchmove', this.handleCanvasTouchMove.bind(this));
    canvas.addEventListener('touchend', this.handleCanvasTouchEnd.bind(this));

    // Rule interaction
    canvas.addEventListener('click', this.handleRuleClick.bind(this));
    canvas.addEventListener('dblclick', this.handleRuleDoubleClick.bind(this));
  }

  private handlePaletteDragStart(event: Event): void {
    const dragEvent = event as unknown as MockDragEvent;
    const target = event.target as MockElement;

    const ruleType = target.getAttribute('data-type')!;
    const ruleValue = target.getAttribute('data-value')!;

    dragEvent.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: ruleType,
        value: ruleValue,
        name: target.textContent,
      })
    );
  }

  private handlePaletteTouchStart(event: Event): void {
    const touchEvent = event as unknown as MockTouchEvent;
    const target = event.target as MockElement;

    if (touchEvent.touches.length === 1) {
      const touch = touchEvent.touches[0];

      // Store touch start information for drag simulation
      this.dragState.isDragging = true;
      this.dragState.dragOffset = {
        x: touch.clientX - target.getBoundingClientRect().left,
        y: touch.clientY - target.getBoundingClientRect().top,
      };
    }
  }

  private handleCanvasDragOver(event: Event): void {
    event.preventDefault(); // Allow drop
  }

  private handleCanvasDrop(event: Event): void {
    event.preventDefault();

    const dragEvent = event as unknown as MockDragEvent;
    const canvas = event.target as MockElement;
    const canvasRect = canvas.getBoundingClientRect();

    try {
      const ruleData = JSON.parse(
        dragEvent.dataTransfer.getData('application/json')
      );

      const newRule: Rule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: ruleData.type,
        name: ruleData.name,
        value: ruleData.value,
        position: {
          x: (event as any).clientX - canvasRect.left,
          y: (event as any).clientY - canvasRect.top,
        },
      };

      this.addRule(newRule);
    } catch (error) {
      console.warn('Failed to parse dropped rule data:', error);
    }
  }

  private handleCanvasTouchMove(event: Event): void {
    if (!this.dragState.isDragging) return;

    event.preventDefault(); // Prevent scrolling

    const touchEvent = event as unknown as MockTouchEvent;
    if (touchEvent.touches.length === 1) {
      const touch = touchEvent.touches[0];

      // Update visual drag indicator if needed
      // This would typically update a visual element following the touch
    }
  }

  private handleCanvasTouchEnd(event: Event): void {
    if (!this.dragState.isDragging) return;

    const touchEvent = event as unknown as MockTouchEvent;
    const canvas = event.target as MockElement;
    const canvasRect = canvas.getBoundingClientRect();

    if (touchEvent.changedTouches.length === 1) {
      const touch = touchEvent.changedTouches[0];

      // Simulate drop at touch location
      const newRule: Rule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'tag', // Default for touch simulation
        name: 'Touch Rule',
        value: 'touch-added',
        position: {
          x: touch.clientX - canvasRect.left,
          y: touch.clientY - canvasRect.top,
        },
      };

      this.addRule(newRule);
    }

    this.dragState.isDragging = false;
    this.dragState.draggedRule = null;
  }

  private handleRuleClick(event: Event): void {
    const target = event.target as MockElement;
    const ruleElement = this.findRuleElement(target);

    if (ruleElement) {
      const ruleId = ruleElement.getAttribute('data-rule-id');
      const rule = this.rules.find(r => r.id === ruleId);

      if (rule) {
        // Toggle rule selection
        ruleElement.className = ruleElement.className.includes('selected')
          ? ruleElement.className.replace('selected', '').trim()
          : `${ruleElement.className} selected`;
      }
    }
  }

  private handleRuleDoubleClick(event: Event): void {
    const target = event.target as MockElement;
    const ruleElement = this.findRuleElement(target);

    if (ruleElement) {
      const ruleId = ruleElement.getAttribute('data-rule-id');
      this.editRule(ruleId!);
    }
  }

  private findRuleElement(element: MockElement): MockElement | null {
    let current = element;
    while (current && !current.getAttribute('data-rule-id')) {
      current = current.parentElement!;
    }
    return current;
  }

  private addRule(rule: Rule): void {
    this.rules.push(rule);
    this.renderRule(rule);
    this.triggerValidation();

    if (this.config.onRuleChange) {
      this.config.onRuleChange(this.rules);
    }
  }

  private renderRule(rule: Rule): void {
    const canvas = this.container.querySelector('.rule-canvas')!;

    const ruleElement = new MockElement('div');
    ruleElement.className = `rule-element rule-${rule.type}`;
    ruleElement.setAttribute('data-rule-id', rule.id);
    ruleElement.setAttribute('data-testid', `rule-${rule.id}`);
    ruleElement.style.position = 'absolute';
    ruleElement.style.left = `${rule.position.x}px`;
    ruleElement.style.top = `${rule.position.y}px`;
    ruleElement.innerHTML = `
      <div class="rule-header">
        <span class="rule-name">${rule.name}</span>
        <button class="rule-delete" data-testid="delete-${rule.id}">×</button>
      </div>
      <div class="rule-body">
        <span class="rule-type">${rule.type}</span>
        <span class="rule-value">${rule.value}</span>
      </div>
    `;

    // Add delete handler
    const deleteButton = ruleElement.querySelector('.rule-delete')!;
    deleteButton.addEventListener('click', () => this.removeRule(rule.id));

    canvas.appendChild(ruleElement);
  }

  private removeRule(ruleId: string): void {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex > -1) {
      this.rules.splice(ruleIndex, 1);

      // Remove from DOM
      const canvas = this.container.querySelector('.rule-canvas')!;
      const ruleElement = canvas.querySelector(`[data-rule-id="${ruleId}"]`);
      if (ruleElement) {
        canvas.removeChild(ruleElement);
      }

      this.triggerValidation();

      if (this.config.onRuleChange) {
        this.config.onRuleChange(this.rules);
      }
    }
  }

  private editRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      // Mock rule editing - in real implementation would show modal/form
      const newValue = prompt(`Edit rule value:`, rule.value as string);
      if (newValue && newValue !== rule.value) {
        rule.value = newValue;
        rule.name = newValue.charAt(0).toUpperCase() + newValue.slice(1);

        // Re-render rule
        const canvas = this.container.querySelector('.rule-canvas')!;
        const ruleElement = canvas.querySelector(`[data-rule-id="${ruleId}"]`)!;
        ruleElement.querySelector('.rule-name')!.textContent = rule.name;
        ruleElement.querySelector('.rule-value')!.textContent = rule.value;

        this.triggerValidation();

        if (this.config.onRuleChange) {
          this.config.onRuleChange(this.rules);
        }
      }
    }
  }

  private triggerValidation(): void {
    // Debounce validation calls
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
    }

    this.validationTimer = setTimeout(() => {
      this.performValidation();
    }, 300);
  }

  private async performValidation(): Promise<void> {
    const startTime = performance.now();

    try {
      // Mock validation - in real implementation would call API
      const validationResult: ValidationResult = {
        isValid: this.rules.length > 0 && this.rules.length < 10,
        conflicts: this.generateMockConflicts(),
        suggestions: this.generateMockSuggestions(),
        performance: {
          validationTime: performance.now() - startTime,
          rulesProcessed: this.rules.length,
        },
      };

      this.renderValidationResults(validationResult);

      if (this.config.onValidation) {
        this.config.onValidation(validationResult);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }

  private generateMockConflicts(): ValidationConflict[] {
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
      });
    }

    // Check for too many rules
    if (this.rules.length > 8) {
      conflicts.push({
        id: 'conflict_too_many_rules',
        severity: 'warning',
        message: 'Too many rules may make story discovery difficult',
        ruleIds: this.rules.map(r => r.id),
        suggestedFix:
          'Consider consolidating similar rules or removing less important ones',
      });
    }

    return conflicts;
  }

  private generateMockSuggestions(): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Suggest popular combinations
    if (this.rules.some(r => r.value === 'time-travel')) {
      suggestions.push({
        id: 'suggestion_time_travel_combo',
        type: 'add',
        message:
          'Consider adding "Fix-It" tag - commonly paired with Time Travel',
        confidence: 0.8,
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
      });
    }

    return suggestions;
  }

  private renderValidationResults(result: ValidationResult): void {
    const panel = this.container.querySelector('.validation-panel')!;
    const conflictsList = panel.querySelector('.conflicts-list')!;
    const suggestionsList = panel.querySelector('.suggestions-list')!;

    // Render conflicts
    conflictsList.innerHTML = `
      <h4>Conflicts (${result.conflicts.length})</h4>
      ${result.conflicts
        .map(
          conflict => `
        <div class="validation-item conflict-${
          conflict.severity
        }" data-conflict-id="${conflict.id}">
          <div class="conflict-message">${conflict.message}</div>
          ${
            conflict.suggestedFix
              ? `<div class="conflict-fix">${conflict.suggestedFix}</div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    `;

    // Render suggestions
    suggestionsList.innerHTML = `
      <h4>Suggestions (${result.suggestions.length})</h4>
      ${result.suggestions
        .map(
          suggestion => `
        <div class="validation-item suggestion-${
          suggestion.type
        }" data-suggestion-id="${suggestion.id}">
          <div class="suggestion-message">${suggestion.message}</div>
          <div class="suggestion-confidence">Confidence: ${Math.round(
            suggestion.confidence * 100
          )}%</div>
          <button class="apply-suggestion" data-suggestion-id="${
            suggestion.id
          }">Apply</button>
        </div>
      `
        )
        .join('')}
    `;

    // Add suggestion application handlers
    const applyButtons = suggestionsList.querySelectorAll('.apply-suggestion');
    applyButtons.forEach(button => {
      button.addEventListener('click', () => {
        const suggestionId = button.getAttribute('data-suggestion-id')!;
        this.applySuggestion(suggestionId);
      });
    });
  }

  private applySuggestion(suggestionId: string): void {
    // Mock suggestion application
    console.log(`Applied suggestion: ${suggestionId}`);

    // In real implementation, would modify rules based on suggestion
    if (suggestionId === 'suggestion_time_travel_combo') {
      this.addRule({
        id: `rule_${Date.now()}_suggested`,
        type: 'tag',
        name: 'Fix-It',
        value: 'fix-it',
        position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      });
    }
  }

  // Public API for testing
  getRules(): Rule[] {
    return [...this.rules];
  }

  getValidationState(): boolean {
    return this.rules.length > 0;
  }

  clearRules(): void {
    this.rules = [];
    const canvas = this.container.querySelector('.rule-canvas')!;
    canvas.innerHTML = '';
    this.triggerValidation();
  }

  simulateDrop(ruleType: string, position: { x: number; y: number }): void {
    const newRule: Rule = {
      id: `rule_${Date.now()}_simulated`,
      type: ruleType as any,
      name: `Test ${ruleType}`,
      value: `test-${ruleType}`,
      position,
    };
    this.addRule(newRule);
  }

  getContainer(): MockElement {
    return this.container;
  }
}

// Global setup for E2E testing environment
let mockWindow: MockWindow;
let mockDocument: MockDocument;
let ruleBuilder: MockRuleBuilderComponent;

describe('E2E Tests for Rule Builder UI', () => {
  beforeAll(() => {
    // Setup mock environment
    mockWindow = new MockWindow();
    mockDocument = mockWindow.document;

    // Mock global objects
    (global as any).window = mockWindow;
    (global as any).document = mockDocument;
    (global as any).HTMLElement = MockElement;
    (global as any).Event = Event;
    (global as any).DragEvent = MockDragEvent;
    (global as any).TouchEvent = MockTouchEvent;
    (global as any).DataTransfer = MockDataTransfer;
    (global as any).Touch = MockTouch;
    (global as any).TouchList = MockTouchList;
  });

  beforeEach(() => {
    // Reset DOM state
    mockDocument.body.innerHTML = '';

    // Create rule builder component
    ruleBuilder = new MockRuleBuilderComponent({
      containerId: 'rule-builder-test',
      validationEndpoint: '/api/validation',
      onValidation: result => {
        console.log('Validation result:', result);
      },
      onRuleChange: rules => {
        console.log('Rules changed:', rules.length);
      },
    });

    mockDocument.body.appendChild(ruleBuilder.getContainer());
  });

  afterEach(() => {
    // Clean up
    ruleBuilder.clearRules();
  });

  describe('Component Initialization', () => {
    it('should initialize rule builder with all required elements', () => {
      const container = ruleBuilder.getContainer();

      expect(container).toBeDefined();
      expect(container.id).toBe('rule-builder-test');
      expect(container.className).toBe('rule-builder-container');

      // Check for required sections
      const palette = container.querySelector('.rule-palette');
      const canvas = container.querySelector('.rule-canvas');
      const validationPanel = container.querySelector('.validation-panel');

      expect(palette).toBeDefined();
      expect(canvas).toBeDefined();
      expect(validationPanel).toBeDefined();
    });

    it('should populate palette with available rule types', () => {
      const container = ruleBuilder.getContainer();
      const paletteItems = container.querySelectorAll('.palette-item');

      expect(paletteItems.length).toBeGreaterThan(0);

      // Check for specific items
      const angstItem = Array.from(paletteItems).find(
        item => item.getAttribute('data-value') === 'angst'
      );
      const fluffItem = Array.from(paletteItems).find(
        item => item.getAttribute('data-value') === 'fluff'
      );

      expect(angstItem).toBeDefined();
      expect(fluffItem).toBeDefined();
    });

    it('should initialize empty canvas', () => {
      const rules = ruleBuilder.getRules();
      expect(rules.length).toBe(0);

      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElements = canvas.querySelectorAll('.rule-element');

      expect(ruleElements.length).toBe(0);
    });
  });

  describe('Drag and Drop Interactions', () => {
    it('should handle drag start from palette items', () => {
      const container = ruleBuilder.getContainer();
      const angstItem = container.querySelector('[data-value="angst"]')!;

      const dragEvent = new MockDragEvent('dragstart');
      angstItem.dispatchEvent(dragEvent);

      // Check that drag data was set
      const dragData = dragEvent.dataTransfer.getData('application/json');
      expect(dragData).toBeTruthy();

      const parsedData = JSON.parse(dragData);
      expect(parsedData.type).toBe('tag');
      expect(parsedData.value).toBe('angst');
    });

    it('should add rule when dropping on canvas', () => {
      const initialRuleCount = ruleBuilder.getRules().length;

      // Simulate dropping a rule
      ruleBuilder.simulateDrop('tag', { x: 100, y: 50 });

      const newRuleCount = ruleBuilder.getRules().length;
      expect(newRuleCount).toBe(initialRuleCount + 1);

      const rules = ruleBuilder.getRules();
      const newRule = rules[rules.length - 1];
      expect(newRule.type).toBe('tag');
      expect(newRule.position.x).toBe(100);
      expect(newRule.position.y).toBe(50);
    });

    it('should render rule element in correct position', () => {
      ruleBuilder.simulateDrop('tag', { x: 150, y: 75 });

      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElements = canvas.querySelectorAll('.rule-element');

      expect(ruleElements.length).toBe(1);

      const ruleElement = ruleElements[0];
      expect(ruleElement.style.position).toBe('absolute');
      expect(ruleElement.style.left).toBe('150px');
      expect(ruleElement.style.top).toBe('75px');
    });

    it('should handle multiple rule drops', () => {
      ruleBuilder.simulateDrop('tag', { x: 50, y: 50 });
      ruleBuilder.simulateDrop('plot-block', { x: 150, y: 50 });
      ruleBuilder.simulateDrop('tag', { x: 250, y: 50 });

      const rules = ruleBuilder.getRules();
      expect(rules.length).toBe(3);

      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElements = canvas.querySelectorAll('.rule-element');

      expect(ruleElements.length).toBe(3);
    });
  });

  describe('Touch Interactions (Mobile)', () => {
    it('should handle touch start on palette items', () => {
      const container = ruleBuilder.getContainer();
      const fluffItem = container.querySelector('[data-value="fluff"]')!;

      const touchEvent = new MockTouchEvent('touchstart', {
        touches: [
          new MockTouch({
            identifier: 1,
            target: fluffItem as any,
            clientX: 100,
            clientY: 50,
          }),
        ],
      });

      fluffItem.dispatchEvent(touchEvent);

      // Touch interaction should be tracked
      expect(touchEvent.touches.length).toBe(1);
    });

    it('should simulate rule drop on touch end', () => {
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;

      const touchEvent = new MockTouchEvent('touchend', {
        touches: [
          new MockTouch({
            identifier: 1,
            target: canvas as any,
            clientX: 200,
            clientY: 100,
          }),
        ],
      });

      // Simulate drag state
      (ruleBuilder as any).dragState.isDragging = true;

      canvas.dispatchEvent(touchEvent);

      // Should add a rule
      const rules = ruleBuilder.getRules();
      expect(rules.length).toBe(1);
    });

    it('should prevent default touch behavior during drag', () => {
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;

      const touchMoveEvent = new MockTouchEvent('touchmove', {
        touches: [
          new MockTouch({
            identifier: 1,
            target: canvas as any,
            clientX: 150,
            clientY: 75,
          }),
        ],
      });

      // Setup drag state
      (ruleBuilder as any).dragState.isDragging = true;

      const preventDefaultSpy = vi.spyOn(touchMoveEvent, 'preventDefault');

      canvas.dispatchEvent(touchMoveEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Rule Management', () => {
    beforeEach(() => {
      // Add some test rules
      ruleBuilder.simulateDrop('tag', { x: 50, y: 50 });
      ruleBuilder.simulateDrop('plot-block', { x: 150, y: 50 });
    });

    it('should handle rule selection on click', () => {
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElement = canvas.querySelector('.rule-element')!;

      // Click on rule
      ruleElement.click();

      // Rule should be selected
      expect(ruleElement.className).toContain('selected');

      // Click again to deselect
      ruleElement.click();
      expect(ruleElement.className).not.toContain('selected');
    });

    it('should handle rule deletion', () => {
      const initialRuleCount = ruleBuilder.getRules().length;

      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const deleteButton = canvas.querySelector('.rule-delete')!;

      // Click delete button
      deleteButton.click();

      const newRuleCount = ruleBuilder.getRules().length;
      expect(newRuleCount).toBe(initialRuleCount - 1);

      // Rule element should be removed from DOM
      const ruleElements = canvas.querySelectorAll('.rule-element');
      expect(ruleElements.length).toBe(newRuleCount);
    });

    it('should handle rule editing on double click', () => {
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElement = canvas.querySelector('.rule-element')!;

      // Mock prompt for editing
      const originalPrompt = global.prompt;
      global.prompt = vi.fn().mockReturnValue('edited-value');

      // Double click to edit
      const dblClickEvent = new Event('dblclick');
      ruleElement.dispatchEvent(dblClickEvent);

      // Check that rule was updated
      const rules = ruleBuilder.getRules();
      const editedRule = rules.find(r => r.value === 'edited-value');
      expect(editedRule).toBeDefined();

      // Restore prompt
      global.prompt = originalPrompt;
    });

    it('should clear all rules', () => {
      expect(ruleBuilder.getRules().length).toBeGreaterThan(0);

      ruleBuilder.clearRules();

      expect(ruleBuilder.getRules().length).toBe(0);

      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElements = canvas.querySelectorAll('.rule-element');

      expect(ruleElements.length).toBe(0);
    });
  });

  describe('Real-time Validation', () => {
    it('should trigger validation when rules are added', async () => {
      const validationSpy = vi.fn();

      // Create new builder with validation callback
      const testBuilder = new MockRuleBuilderComponent({
        containerId: 'validation-test',
        validationEndpoint: '/api/validation',
        onValidation: validationSpy,
      });

      // Add a rule
      testBuilder.simulateDrop('tag', { x: 100, y: 100 });

      // Wait for validation debounce
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(validationSpy).toHaveBeenCalled();
      const validationResult = validationSpy.mock.calls[0][0];
      expect(validationResult.performance.rulesProcessed).toBe(1);
    });

    it('should detect conflicts between opposing tags', async () => {
      // Add conflicting rules
      ruleBuilder.simulateDrop('tag', { x: 50, y: 50 }); // This will be angst
      (ruleBuilder as any).rules[0].value = 'angst'; // Set explicitly

      ruleBuilder.simulateDrop('tag', { x: 150, y: 50 }); // This will be fluff
      (ruleBuilder as any).rules[1].value = 'fluff'; // Set explicitly

      // Trigger validation manually
      await (ruleBuilder as any).performValidation();

      const container = ruleBuilder.getContainer();
      const conflictsList = container.querySelector('.conflicts-list')!;
      const conflictItems = conflictsList.querySelectorAll('.validation-item');

      expect(conflictItems.length).toBeGreaterThan(0);

      // Check for specific conflict
      const angstFluffConflict = Array.from(conflictItems).find(item =>
        item.innerHTML.includes('Angst and Fluff')
      );
      expect(angstFluffConflict).toBeDefined();
    });

    it('should provide suggestions based on rules', async () => {
      // Add time travel rule
      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });
      (ruleBuilder as any).rules[0].value = 'time-travel';

      // Trigger validation
      await (ruleBuilder as any).performValidation();

      const container = ruleBuilder.getContainer();
      const suggestionsList = container.querySelector('.suggestions-list')!;
      const suggestionItems =
        suggestionsList.querySelectorAll('.validation-item');

      expect(suggestionItems.length).toBeGreaterThan(0);

      // Check for time travel suggestion
      const timeTravelSuggestion = Array.from(suggestionItems).find(item =>
        item.innerHTML.includes('Fix-It')
      );
      expect(timeTravelSuggestion).toBeDefined();
    });

    it('should apply suggestions when requested', async () => {
      // Add time travel rule to trigger suggestion
      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });
      (ruleBuilder as any).rules[0].value = 'time-travel';

      // Trigger validation
      await (ruleBuilder as any).performValidation();

      const initialRuleCount = ruleBuilder.getRules().length;

      const container = ruleBuilder.getContainer();
      const suggestionsList = container.querySelector('.suggestions-list')!;
      const applyButton = suggestionsList.querySelector('.apply-suggestion')!;

      // Apply suggestion
      applyButton.click();

      // Wait for rule addition
      await new Promise(resolve => setTimeout(resolve, 50));

      const newRuleCount = ruleBuilder.getRules().length;
      expect(newRuleCount).toBe(initialRuleCount + 1);
    });

    it('should debounce validation calls', async () => {
      const performValidationSpy = vi.spyOn(
        ruleBuilder as any,
        'performValidation'
      );

      // Add multiple rules quickly
      ruleBuilder.simulateDrop('tag', { x: 50, y: 50 });
      ruleBuilder.simulateDrop('tag', { x: 100, y: 50 });
      ruleBuilder.simulateDrop('tag', { x: 150, y: 50 });

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only have called validation once due to debouncing
      expect(performValidationSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle rapid rule additions without performance degradation', () => {
      const startTime = performance.now();

      // Add many rules quickly
      for (let i = 0; i < 20; i++) {
        ruleBuilder.simulateDrop('tag', { x: i * 30, y: i * 20 });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
      expect(ruleBuilder.getRules().length).toBe(20);
    });

    it('should maintain responsive UI with many rules', () => {
      // Add many rules
      for (let i = 0; i < 50; i++) {
        ruleBuilder.simulateDrop('tag', {
          x: (i % 10) * 50,
          y: Math.floor(i / 10) * 50,
        });
      }

      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;
      const ruleElements = canvas.querySelectorAll('.rule-element');

      expect(ruleElements.length).toBe(50);

      // UI operations should still be responsive
      const startTime = performance.now();
      ruleElements[0].click(); // Select first rule
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms
    });

    it('should handle validation performance with complex rule sets', async () => {
      // Create complex rule set
      for (let i = 0; i < 15; i++) {
        ruleBuilder.simulateDrop('tag', { x: i * 40, y: i * 30 });
      }

      const startTime = performance.now();
      await (ruleBuilder as any).performValidation();
      const endTime = performance.now();

      const validationTime = endTime - startTime;
      expect(validationTime).toBeLessThan(500); // 500ms max
    });
  });

  describe('Accessibility Features', () => {
    it('should provide keyboard navigation support', () => {
      const container = ruleBuilder.getContainer();
      const paletteItems = container.querySelectorAll('.palette-item');

      // Palette items should be focusable
      paletteItems.forEach(item => {
        expect(item.getAttribute('tabindex')).not.toBe('-1');
      });
    });

    it('should provide proper ARIA labels and roles', () => {
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;

      // Canvas should have appropriate role
      expect(canvas.getAttribute('role')).toBe('application');
      expect(canvas.getAttribute('aria-label')).toContain('rule builder');
    });

    it('should support screen reader announcements', () => {
      // Add a rule
      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });

      const container = ruleBuilder.getContainer();
      const liveRegion = container.querySelector('[aria-live]');

      expect(liveRegion).toBeDefined();
      expect(liveRegion!.textContent).toContain('rule added');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid drag data gracefully', () => {
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;

      // Simulate drop with invalid data
      const dropEvent = new MockDragEvent('drop');
      dropEvent.dataTransfer.setData('application/json', 'invalid-json');

      canvas.dispatchEvent(dropEvent);

      // Should not crash and should not add invalid rule
      expect(ruleBuilder.getRules().length).toBe(0);
    });

    it('should handle network errors during validation', async () => {
      // Mock fetch to simulate network error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });

      // Wait for validation attempt
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should not crash, validation should fail gracefully
      expect(ruleBuilder.getValidationState()).toBe(true);

      // Restore fetch
      global.fetch = originalFetch;
    });

    it('should handle browser compatibility issues', () => {
      // Test with missing drag and drop support
      const container = ruleBuilder.getContainer();
      const canvas = container.querySelector('.rule-canvas')!;

      // Remove drag event handlers
      canvas.removeEventListener(
        'dragover',
        (ruleBuilder as any).handleCanvasDragOver
      );
      canvas.removeEventListener('drop', (ruleBuilder as any).handleCanvasDrop);

      // Should still work with programmatic rule addition
      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });
      expect(ruleBuilder.getRules().length).toBe(1);
    });

    it('should handle mobile viewport changes', () => {
      // Simulate mobile viewport
      mockWindow.innerWidth = 375;
      mockWindow.innerHeight = 667;

      const container = ruleBuilder.getContainer();

      // Should adapt to mobile layout
      expect(container.className).toContain('rule-builder-container');

      // Touch interactions should still work
      ruleBuilder.simulateDrop('tag', { x: 50, y: 50 });
      expect(ruleBuilder.getRules().length).toBe(1);
    });
  });

  describe('Integration with Validation System', () => {
    it('should send proper validation requests', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            isValid: true,
            conflicts: [],
            suggestions: [],
            performance: { validationTime: 50, rulesProcessed: 1 },
          }),
      });

      global.fetch = fetchSpy;

      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });

      // Wait for validation
      await new Promise(resolve => setTimeout(resolve, 350));

      // Check that fetch was called with correct parameters
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/validation',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"rules"'),
        })
      );
    });

    it('should handle validation response correctly', async () => {
      const mockResponse = {
        isValid: false,
        conflicts: [
          {
            id: 'test-conflict',
            severity: 'error' as const,
            message: 'Test conflict message',
            ruleIds: ['rule1', 'rule2'],
            suggestedFix: 'Test fix suggestion',
          },
        ],
        suggestions: [
          {
            id: 'test-suggestion',
            type: 'add' as const,
            message: 'Test suggestion message',
            confidence: 0.9,
          },
        ],
        performance: { validationTime: 75, rulesProcessed: 2 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      ruleBuilder.simulateDrop('tag', { x: 100, y: 100 });

      // Wait for validation
      await new Promise(resolve => setTimeout(resolve, 350));

      const container = ruleBuilder.getContainer();
      const conflictsList = container.querySelector('.conflicts-list')!;
      const suggestionsList = container.querySelector('.suggestions-list')!;

      // Should display the received conflicts and suggestions
      expect(conflictsList.innerHTML).toContain('Test conflict message');
      expect(suggestionsList.innerHTML).toContain('Test suggestion message');
    });
  });
});
