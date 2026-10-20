import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useChannel } from '../state/ChannelContext';
import { tr } from '../state/LanguageContext';
import { Trip, ChallengeListItem, daysUntil, teamsNeed } from '../data/community';
import { Channel } from '../data/channel';
import { imgUrl } from '../data/api';
import * as pl from '../data/plural';
import { CommunityStackParams } from '../navigation/types';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { Wrapper } from './Wrapper';
type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
const HERO_TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

export function PersonalActivityCard({ icon, eyebrow, title, subtitle, onPress }: {
  icon: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { T, ty } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${eyebrow}: ${title}`}
      style={({ pressed }) => ({
        minHeight: 68, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16,
        borderCurve: 'continuous',
        backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View style={{ width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: T.brandTinted }}>
        <SF name={icon} size={19} color={T.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.caption2Em, { color: T.brand, textTransform: 'uppercase', letterSpacing: 0.25 }]} numberOfLines={1}>{eyebrow}</Text>
        <Text style={[ty.subheadEm, { color: T.label, marginTop: 1 }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <SF name="chevron.forward" size={13} color={T.labelTertiary} />
    </Pressable>
  );
}
