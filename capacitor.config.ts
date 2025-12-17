import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillsync.app',
  appName: 'SkillSync',
  webDir: 'dist',
  server: {
    url: 'https://c03ddc13-e4d5-49d8-9cf6-327913be54b0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
