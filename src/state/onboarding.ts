import * as SecureStore from 'expo-secure-store';
const KEY = 'dvg.onboarded';
export async function isOnboarded(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(KEY)) === '1'; } catch { return false; }
}
export async function markOnboarded(): Promise<void> {
  try { await SecureStore.setItemAsync(KEY, '1'); } catch {}
}
