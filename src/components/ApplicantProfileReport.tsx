import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { mbtiName, TalentProfile } from '../data/talentslab';
import { applicantResumeSections } from '../data/applicantResume';
import { ApplicantReportSection } from './ApplicantReportSection';
import { ContentBlock } from './ContentBlock';
import { MemberAvatar } from './MemberAvatar';
import { GardnerChart } from './GardnerChart';
import { SF } from './SFIcon';
import { Wrapper } from './Wrapper';

/** Mobile adaptation of the Talentslab report. Data comes only from the authorized API response. */
export function ApplicantProfileReport({ profile, fallbackName, fallbackEmail }: {
  profile: TalentProfile; fallbackName: string; fallbackEmail?: string;
}) {
  const { T, ty } = useTheme();
  const r = profile.resume;
  const name = r?.full_name || profile.fullName || fallbackName;
  const contacts = [r?.current_city || profile.currentCity, r?.phone || profile.phone,
    r?.email || profile.email || fallbackEmail, r?.instagram].filter(Boolean);
  const sections = applicantResumeSections(r);
  return <Wrapper gap={28}>
    <ContentBlock>
      <Wrapper gap={18}>
        <Wrapper dir="row" gap={16} align="center" wrap>
          <MemberAvatar name={name} avatar={profile.photoUrl} size={80} />
          <View style={styles.identity}>
            <Text accessibilityRole="header" style={[ty.title2, { color: T.brandText }]}>{name}</Text>
          </View>
        </Wrapper>
        {contacts.length ? <Wrapper gap={8}>{contacts.map((contact, i) =>
          <Text selectable key={i} style={[ty.subhead, { color: T.labelSecondary }]}>{contact}</Text>)}</Wrapper> : null}
      </Wrapper>
    </ContentBlock>
    {sections.map(section => <ApplicantReportSection key={section.title} {...section} />)}
    {profile.mbtiType ? <ApplicantReportSection title="Психометрические данные" rows={[{
      label: 'Тип личности · MBTI', value: [profile.mbtiType, profile.mbtiName || mbtiName(profile.mbtiType)].filter(Boolean).join(' · '),
    }]} /> : null}
    {profile.gardner.length ? <Wrapper gap={12}>
      <Text accessibilityRole="header" style={[ty.title3, styles.heading, { color: T.label }]}>Множественный интеллект</Text>
      <GardnerChart data={profile.gardner} />
    </Wrapper> : null}
    {profile.reports.length ? <ApplicantReportSection title="Отчёты Talentslab">
      {profile.reports.map((report, i) => <Pressable key={`${report.url}-${i}`} accessibilityRole="link"
        accessibilityLabel={report.title || 'Открыть отчёт'}
        onPress={() => {
          if (!/^https?:\/\//i.test(report.url)) { Alert.alert('Не удалось открыть отчёт', 'Ссылка на отчёт недоступна.'); return; }
          Linking.openURL(report.url).catch(() => Alert.alert('Не удалось открыть отчёт', 'Попробуйте ещё раз позже.'));
        }} style={({ pressed }) => [styles.report, { opacity: pressed ? 0.6 : 1 }]}>
        <SF name="doc.fill" size={22} color={T.brandText} />
        <Text style={[ty.subheadEm, styles.reportTitle, { color: T.brandText }]}>{report.title || 'Открыть отчёт'}</Text>
        <SF name="chevron.forward" size={14} color={T.labelSecondary} />
      </Pressable>)}
    </ApplicantReportSection> : null}
    {!sections.length && !profile.mbtiType && !profile.gardner.length && !profile.reports.length ?
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>В анкете пока указаны только основные данные.</Text> : null}
  </Wrapper>;
}
const styles = StyleSheet.create({
  identity: { flexGrow: 1, flexShrink: 1, flexBasis: 180 }, heading: { paddingHorizontal: 4 },
  report: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48 }, reportTitle: { flex: 1 },
});
