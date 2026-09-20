// Окно итогов при запуске приложения.
//
// ЗАЧЕМ ОКНО, А НЕ ЭКРАН. Итоги показываются ОДИН раз и сами: человек
// пятнадцать дней отмечался, челлендж кончился — он заслужил увидеть результат
// без поиска по меню. Дальше итоги никуда не денутся, они лежат в профиле, в
// «Моих челленджах».
//
// КОГДА ПОКАЗЫВАЕМ. Только после того, как организатор объявил итоги
// (announcedAt с сервера). До объявления цифры могут ещё уточняться —
// поздравлять рано.
//
// ПОКАЗЫВАЕМ ОДИН РАЗ. Отметка «видел» лежит на устройстве: на сервере ей
// место только если бы окно надо было синхронизировать между телефонами, а
// ради поздравления городить это незачем.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';

import { useTheme } from '../theme/ThemeContext';
import { loadJSON, saveJSON } from '../state/persist';
import { fetchMyChallengeHistory, fetchChallengeResults, ChallengeResults } from '../data/community';
import { ChallengeResultsContent } from '../screens/community/ChallengeResultsScreen';
import { hSuccess } from '../lib/haptics';
import { tr } from '../state/LanguageContext';

const SEEN_KEY = 'dvg.challengeResultsSeen.v1';

export function ChallengeResultsModal() {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken, isSignedIn } = useAuth();
  const [data, setData] = useState<ChallengeResults | null>(null);
  const [open, setOpen] = useState(false);
  // Показали — и хватит. А вот ПРОВЕРЯТЬ приходится не один раз за запуск:
  // человек может держать приложение в фоне сутками, и если первая проверка
  // случилась до объявления итогов, второй бы уже не было — окно не появилось
  // бы никогда. Поэтому перепроверяем при возвращении, но не чаще чем раз в
  // пять минут: два лишних запроса на холостом ходу никому не нужны.
  const shownRef = useRef(false);
  const lastCheckRef = useRef(0);
  const RECHECK_MS = 5 * 60_000;

  const check = useCallback(async () => {
    if (shownRef.current || !isSignedIn) return;
    if (Date.now() - lastCheckRef.current < RECHECK_MS) return;
    lastCheckRef.current = Date.now();
    try {
      const token = await getToken();
      if (!token) return;
      const history = await fetchMyChallengeHistory(token);
      const ready = history.filter((h) => h.finished && h.announcedAt && h.result);
      if (!ready.length) return;

      const seen = (await loadJSON<string[]>(SEEN_KEY, [])) ?? [];
      const fresh = ready.find((h) => !seen.includes(h.challengeId));
      if (!fresh) return;

      const res = await fetchChallengeResults(fresh.challengeId, token);
      if (!res) return;
      setData(res);
      setOpen(true);
      shownRef.current = true;
      if (res.team?.isWinner) hSuccess();
      saveJSON(SEEN_KEY, [...seen, fresh.challengeId]);
    } catch {
      // Поздравление — не то, ради чего стоит показывать ошибку. Не вышло —
      // итоги останутся в профиле.
    }
  }, [getToken, isSignedIn]);

  useEffect(() => { check(); }, [check]);

  // Приложение было открыто, когда объявили итоги: проверяем и при
  // возвращении из фона — но только если ещё ни разу не проверяли.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [check]);

  if (!data) return null;

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 90 }}>
          <ChallengeResultsContent data={data} compact />
        </ScrollView>

        {/* Кнопка закрытия — поверх, а не в конце списка: итоги длинные, и
            искать выход прокруткой человек не должен. */}
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator,
        }}>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={tr('Закрыть итоги')}
            style={({ pressed }) => ({
              minHeight: 50, borderRadius: 16, borderCurve: 'continuous',
              backgroundColor: pressed ? T.brandAccent : T.brand,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Text style={[ty.headline, { color: '#fff' }]}>{tr('Спасибо!')}</Text>
          </Pressable>
          <Text style={[ty.caption2, { color: T.labelSecondary, textAlign: 'center', marginTop: 8 }]}>
            {tr('Итоги останутся в профиле — раздел «Челленджи»')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
