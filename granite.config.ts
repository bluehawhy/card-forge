import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';

const brandIcons = {
  light:
    'https://static.toss.im/appsintoss/84735/e0d62bc7-cb85-4cea-b450-6520d3cb1c75.png',
  dark:
    'https://static.toss.im/appsintoss/84735/59e4219f-a208-4d49-ac84-788ae9f7b08e.png',
} as const;

export default defineConfig({
  scheme: 'intoss',
  appName: 'card-forge',
  plugins: [
    appsInToss({
      brand: {
        displayName: '카드대장간',
        primaryColor: '#3182F6',
        // The SDK accepts one icon URL. The dark variant is configured in the
        // Apps in Toss console and kept in brandIcons for configuration parity.
        icon: brandIcons.light,
      },
      permissions: [],
    }),
  ],
});
