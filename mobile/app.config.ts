import type { ExpoConfig } from 'expo/config';
import brand from './src/constants/brand.json';

const config: ExpoConfig = {
  name: brand.appName,
  slug: 'surgalt',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'surgalt',
  userInterfaceStyle: 'light',
  android: {
    adaptiveIcon: {
      backgroundColor: '#7A5CF5',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#7A5CF5',
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
      },
    ],
    'expo-secure-store',
    ['expo-audio', { microphonePermission: 'Баавгайтай ярилцахад микрофон хэрэгтэй.' }],
    ['expo-camera', { cameraPermission: 'Найзынхаа QR кодыг уншихад камер хэрэгтэй.', microphonePermission: false, recordAudioAndroid: false }],
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
};

export default config;
