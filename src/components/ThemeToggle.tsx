// src/components/ThemeToggle.tsx - FIXED VERSION
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    console.log('========== THEME TOGGLE CLICKED ==========');
    console.log('Current theme:', theme);
    
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Will change to:', newTheme);
    
    // Force immediate visual feedback
    console.log('HTML before:', document.documentElement.className);
    setTheme(newTheme);
    console.log('HTML after:', document.documentElement.className);
    
    // Force a re-check
    setTimeout(() => {
      console.log('Delayed check - HTML:', document.documentElement.className);
      console.log('Delayed check - localStorage:', localStorage.getItem('skillSync-theme'));
    }, 100);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-lg p-3 text-sm font-medium bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:border-primary/40 hover:from-primary/20 hover:to-secondary/20 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-5 w-5" />
          <span className="ml-2 hidden md:inline">Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5 text-yellow-500" />
          <span className="ml-2 hidden md:inline">Light Mode</span>
        </>
      )}
    </button>
  );
}