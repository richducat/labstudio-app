import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fit.labstudio.app',
  appName: 'Lab Studio',
  webDir: 'www',
  zoomEnabled: false,
  server: {
    url: 'https://app.labstudio.fit',
    cleartext: false,
    allowNavigation: ['app.labstudio.fit', '*.vercel.app'],
  },
};

export default config;
