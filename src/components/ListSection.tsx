import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ListRow } from './ListRow';

export function ListSection({
  header, footer, children,
}: { header?: string; footer?: string; children: React.ReactNode }) {
  const { T, ty } = useTheme();
  return (
    <View>
      {header ? (
        <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{header}</Text>
      ) : null}
      <View style={{ backgroundColor: T.cardBg, borderRadius: 10, borderCurve: 'continuous', overflow: 'hidden' }}>
        {React.Children.toArray(children).filter(child => React.isValidElement(child)).map((child, index) => <React.Fragment key={React.isValidElement(child) ? child.key ?? index : index}>
          {index > 0 && React.isValidElement(child) && child.type === ListRow ? <View accessible={false} style={{ height: 0.5, marginLeft: 16, backgroundColor: T.separator }} /> : null}
          {child}
        </React.Fragment>)}
      </View>
      {footer ? (
        <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingTop: 6 }]}>{footer}</Text>
      ) : null}
    </View>
  );
}
