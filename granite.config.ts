import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  scheme: 'intoss',
  appName: 'card-forge',
  plugins: [
    appsInToss({
      brand: {
        displayName: 'card-forge', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
        primaryColor: '#3182F6', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
        icon: 'https://static.toss.im/appsintoss/84735/e0d62bc7-cb85-4cea-b450-6520d3cb1c75.png',
      },
      permissions: [],
    }),
  ],
});
