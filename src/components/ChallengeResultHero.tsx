import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as pl from '../data/plural';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { Logo } from './Logo';
import { SF } from './SFIcon';
import { AWARD_GOLD, AWARD_GOLD_DEEP } from './AwardBadge';
import { Wrapper } from './Wrapper';
export function ChallengeResultHero({ title, sequence, won, teamName, durationDays, canClaim, claimed, claiming, onClaim }: {
 title: string; sequence?: number | null; won: boolean; teamName?: string; durationDays: number; canClaim: boolean; claimed: boolean; claiming: boolean; onClaim: () => void;
}) {
 const { T, ty } = useTheme();
 return <Wrapper marginHorizontal={16} marginTop={16}><LinearGradient
        colors={won ? [AWARD_GOLD, '#E08A00'] : [T.brand, T.brandAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, borderCurve: 'continuous', padding: 18, overflow: 'hidden' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={26} body="#fff" head="#fff" />
          {/* «1-й челлендж» — то, как о нём говорят сами участники. Название
              оставляем рядом: у следующих челленджей оно будет разным. */}
          <Text style={[ty.footnoteEm, { color: 'rgba(255,255,255,0.9)', flex: 1 }]}>
            {sequence ? `${sequence}-${tr('й челлендж')}` : ''}
            {sequence && title ? ' · ' : ''}
            {title}
          </Text>
        </View>

        <Text style={[ty.title1, { color: '#fff', marginTop: 10 }]}>
          {won ? tr('1 место!') : tr('Челлендж завершён')}
        </Text>

        {won ? (
          <>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.95)', marginTop: 4 }]}>
              {tr('Команда')} «{teamName}» {tr('победила')}.
            </Text>

            {/* Награда — это подарок, и его забирают. Значок, появившийся сам,
                читается как часть интерфейса; нажатая кнопка — как награда. */}
            {canClaim ? (
              <Pressable
                onPress={() => { onClaim(); }}
                disabled={claiming}
                accessibilityRole="button"
                accessibilityLabel={claiming ? tr('Получаем…') : tr('Получить награду')}
                accessibilityState={{ disabled: claiming, busy: claiming }}
                style={({ pressed }) => ({
                  marginTop: 14, minHeight: 48, borderRadius: 14, borderCurve: 'continuous',
                  backgroundColor: pressed ? 'rgba(255,255,255,0.82)' : '#fff',
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  opacity: claiming ? 0.7 : 1,
                })}
              >
                <SF name="trophy.fill" size={18} color={AWARD_GOLD_DEEP} />
                <Text style={[ty.headline, { color: AWARD_GOLD_DEEP }]}>
                  {claiming ? tr('Получаем…') : tr('Получить награду')}
                </Text>
              </Pressable>
            ) : claimed ? (
              <View style={{
                marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
                alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12,
                borderRadius: 12, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.22)',
              }}>
                <SF name="trophy.fill" size={16} color="#fff" />
                <Text style={[ty.footnoteEm, { color: '#fff' }]}>
                  {tr('Награда у вас — она рядом с вашим ником')}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>
            {pl.days(durationDays)} {tr('позади')}. {tr('Вот что у вас получилось')}.
          </Text>
        )}
      </LinearGradient></Wrapper>;
}
