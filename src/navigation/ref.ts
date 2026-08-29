import { createNavigationContainerRef } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef<any>();

/** Normalize backend notification targets into the current tab payload shape. */
export function normalizeTabTarget(tab: string, screen: string, params?: unknown) {
  return { screen: tab, params: { screen, params } };
}
