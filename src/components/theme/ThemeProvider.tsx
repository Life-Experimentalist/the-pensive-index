'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const root = window.document.documentElement;

      // Remove existing theme classes
      root.classList.remove('light', 'dark');

      let resolvedTheme: 'light' | 'dark' = 'light';

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light';
        resolvedTheme = systemTheme;
      } else {
        resolvedTheme = theme;
      }

      // Add theme class
      root.classList.add(resolvedTheme);
      setActualTheme(resolvedTheme);

      // Set meta theme-color for browser chrome
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          resolvedTheme === 'dark' ? '#1f2937' : '#ffffff'
        );
      }

      // Disable Dark Reader if dark mode is active
      if (resolvedTheme === 'dark') {
        // Add meta tag to tell Dark Reader to disable itself
        let darkReaderMeta = document.querySelector(
          'meta[name="darkreader-lock"]'
        );
        if (!darkReaderMeta) {
          darkReaderMeta = document.createElement('meta');
          darkReaderMeta.setAttribute('name', 'darkreader-lock');
          document.head.appendChild(darkReaderMeta);
        }

        // Set data attribute for Dark Reader
        root.setAttribute('data-darkreader-mode', 'dynamic');
        root.setAttribute('data-darkreader-scheme', 'dark');
      } else {
        // Remove Dark Reader attributes in light mode
        const darkReaderMeta = document.querySelector(
          'meta[name="darkreader-lock"]'
        );
        if (darkReaderMeta) {
          darkReaderMeta.remove();
        }
        root.removeAttribute('data-darkreader-mode');
        root.removeAttribute('data-darkreader-scheme');
      }
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
