// src/components/ThemeProvider.tsx - DEBUG VERSION
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'light',
  setTheme: () => null,
});

export function ThemeProvider({ 
  children, 
  defaultTheme = 'light' 
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Initialize theme on mount
  useEffect(() => {
    console.log('🔵 ThemeProvider MOUNTING');
    
    const savedTheme = localStorage.getItem('skillSync-theme') as Theme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    console.log('📝 LocalStorage theme:', savedTheme);
    console.log('🌙 System prefers dark:', systemPrefersDark);
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      console.log('✅ Using saved theme:', savedTheme);
      setThemeState(savedTheme);
    } else if (systemPrefersDark) {
      console.log('✅ Using system dark mode');
      setThemeState('dark');
    } else {
      console.log('✅ Using default theme:', defaultTheme);
      setThemeState(defaultTheme);
    }
    
    setMounted(true);
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    if (!mounted) return;
    
    console.log('🎨 Applying theme:', theme);
    console.log('📋 Before - HTML class:', document.documentElement.className);
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark');
    // Add current theme
    document.documentElement.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('skillSync-theme', theme);
    
    console.log('📋 After - HTML class:', document.documentElement.className);
    console.log('💾 Saved to localStorage:', theme);
    
    // Visual debug
    console.log('🎯 Theme applied successfully!');
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    console.log('🔄 setTheme called with:', newTheme);
    console.log('📊 Current theme before change:', theme);
    setThemeState(newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {/* Debug overlay */}
      <div className="fixed bottom-4 left-4 z-50 p-3 bg-black/80 text-white text-xs rounded-lg font-mono">
        <div>Theme: <span className="font-bold">{theme}</span></div>
        <div>HTML Class: <span className="font-bold">{document.documentElement.className}</span></div>
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  console.log('🪝 useTheme called, theme:', context.theme);
  return context;
};