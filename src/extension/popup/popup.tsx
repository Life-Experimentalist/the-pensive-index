/**
 * Extension Popup Entry Point
 * Initializes React application for popup interface
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import ExtensionPopup from './ExtensionPopup';

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('popup-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<ExtensionPopup />);
  }
});

// Handle popup close events
window.addEventListener('beforeunload', () => {
  // Save any pending state before closing
  console.log('Popup closing');
});
