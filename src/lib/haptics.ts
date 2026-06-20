import * as Haptics from 'expo-haptics';
export const hTap = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} };
export const hSelect = () => { try { Haptics.selectionAsync(); } catch {} };
export const hSuccess = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} };
