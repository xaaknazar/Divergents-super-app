import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import type { ApplicantResumeSection } from '../data/applicantResume';

/** Report typography owns the label/value hierarchy. Long answers never share a narrow column. */
export function ApplicantReportSection({ title, rows = [], children }: {
  title: string; rows?: ApplicantResumeSection['rows']; children?: React.ReactNode;
}) {
  const { T, ty } = useTheme();
  return <Wrapper gap={12}>
    <Text accessibilityRole="header" style={[ty.title3, styles.heading, { color: T.label }]}>{title}</Text>
    <ContentBlock>
      <Wrapper gap={20}>
        {rows.map((row, index) => <View key={`${row.label}-${index}`} style={styles.answer}>
          <Text style={[ty.footnote, { color: T.labelSecondary }]}>{row.label}</Text>
          <Text selectable style={[ty.body, { color: T.label }]}>{row.value}</Text>
        </View>)}
        {children}
      </Wrapper>
    </ContentBlock>
  </Wrapper>;
}
const styles = StyleSheet.create({ heading: { paddingHorizontal: 4 }, answer: { gap: 5 } });
