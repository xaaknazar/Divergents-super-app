import { LogBox } from 'react-native';
// Existing simulator dev clients may lack the notifications persistence module.
LogBox.ignoreLogs(['[expo-notifications] Error reading persisted']);
import { view } from './storybook.requires';

// Storybook must not depend on the signed-in app's Keychain/persistence. RN 9
// requires an explicit storage adapter even for an isolated simulator preview.
const session = new Map<string, string>();
export default view.getStorybookUI({
  onDeviceUI: process.env.EXPO_PUBLIC_STORYBOOK_HIDE_UI !== 'true',
  initialSelection: process.env.EXPO_PUBLIC_STORYBOOK_STORY || undefined,
  storage: {
  getItem: async key => session.get(key) ?? null,
  setItem: async (key, value) => { session.set(key, value); },
} });
