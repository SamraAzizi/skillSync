// src/components/ThemeTest.tsx
import { useTheme } from '@/providers/ThemeProvider';

export function ThemeTest() {
  const { theme } = useTheme();
  
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm font-mono p-2 bg-card rounded">
        Current theme: <span className="font-bold">{theme}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-primary text-primary-foreground rounded-lg">
          Primary Color
        </div>
        <div className="p-4 bg-secondary text-secondary-foreground rounded-lg">
          Secondary Color
        </div>
        <div className="p-4 bg-muted text-muted-foreground rounded-lg">
          Muted
        </div>
        <div className="p-4 bg-card text-card-foreground rounded-lg border">
          Card
        </div>
      </div>
      
      <div className="p-4 gradient-hero text-white rounded-lg">
        Hero Gradient
      </div>
    </div>
  );
}