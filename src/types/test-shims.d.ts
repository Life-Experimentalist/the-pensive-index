/* Test shims to bridge type gaps during triage. Remove or replace with stricter types later. */
import '@playwright/test';

declare global {
  var context: any;
  interface Window {
    extractStoryMetadata?: any;
    validateExtractedMetadata?: any;
  }
}

declare module '@playwright/test' {
  interface Locator {
    // loose signatures to match tests that use Testing Library-like helpers on locators
    waitForSelector?(selector: string): Promise<void>;
    getByDisplayValue?(value: string | RegExp): Locator;
    toHaveText?: any;
    click(selectorOrOptions?: any, options?: any): Promise<void>;
  }

  interface Page {
    getByDisplayValue?(value: string | RegExp): Locator;
    setOfflineMode?(mode: boolean): Promise<void>;
  }

  interface Browser {
    runtime?: any;
  }
}

export {};
