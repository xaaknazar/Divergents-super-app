import React from 'react';
import { LayoutChangeEvent,View,ViewStyle } from 'react-native';

/** Layout only. Never forwards arbitrary View props or a style object. */
export interface WrapperProps {
  children?: React.ReactNode;
  dir?: 'row' | 'column';
  gap?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  paddingTop?: number;
  paddingBottom?: number;
  margin?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  marginTop?: number;
  marginBottom?: number;
  flex?: number;
  grow?: number;
  shrink?: number;
  basis?: ViewStyle['flexBasis'];
  width?: ViewStyle['width'];
  maxWidth?: ViewStyle['maxWidth'];
  align?: ViewStyle['alignItems'];
  alignSelf?: ViewStyle['alignSelf'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function Wrapper({ children, dir = 'column', gap, padding, paddingHorizontal,
  paddingVertical, paddingTop, paddingBottom, margin, marginHorizontal,
  marginVertical, marginTop, marginBottom, flex, grow, shrink, basis,
  align, alignSelf, justify, width, maxWidth, wrap = false, testID, onLayout }: WrapperProps) {
  return <View testID={testID} onLayout={onLayout} style={{
    flexDirection: dir, gap, padding, paddingHorizontal, paddingVertical,
    paddingTop, paddingBottom, margin, marginHorizontal, marginVertical,
    marginTop, marginBottom, flex, flexGrow: grow, flexShrink: shrink,
    flexBasis: basis, alignItems: align, alignSelf, justifyContent: justify,
    flexWrap: wrap ? 'wrap' : 'nowrap', minWidth: 0, width, maxWidth,
  }}>{children}</View>;
}
