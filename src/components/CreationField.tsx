import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Wrapper } from './Wrapper';
import { FieldError } from './FieldError';

/** Shared field rhythm for event and challenge creation. */
export function CreationField({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  const { T, ty } = useTheme();
  return <Wrapper marginTop={14}>
    <Text style={[ty.footnote, { color: error ? T.redText : T.labelSecondary, marginBottom: 6, marginLeft: 4,
      textTransform: 'uppercase', letterSpacing: 0.4 }]}>{label}</Text>
    {children}
    {hint ? <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 6, marginLeft: 4 }]}>{hint}</Text> : null}
    <FieldError message={error} />
  </Wrapper>;
}
