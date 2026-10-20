import { registerRootComponent } from 'expo';

// Storybook is opt-in, development-only; normal startup and providers are unchanged.
const Entry = __DEV__ && process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true'
  ? require('./.rnstorybook').default
  : require('./App').default;
registerRootComponent(Entry);
