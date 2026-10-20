import React from 'react';
import { ContentBlock,ContentBlockProps } from './ContentBlock';
import { PressableScale } from './PressableScale';

export interface ActionBlockProps extends Omit<ContentBlockProps, 'accessibilityLiveRegion'> {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}
export function ActionBlock({ children, onPress, disabled, accessibilityLabel, accessibilityHint, size, elevated }: ActionBlockProps) {
  return <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}>
    <ContentBlock size={size} elevated={elevated}>{children}</ContentBlock>
  </PressableScale>;
}
