import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useResume } from './useResume';
import { openResume } from '../navigation/ref';
import {
  ResumeArea, AREA_TITLE, missingForArea, missingSummary, MissingStep,
} from '../data/resumeAccess';

/**
 * Можно ли человеку подавать заявки и откликаться — и что показать, если нет.
 *
 * Проверка живёт в одном месте, потому что точек четыре (челлендж, поездка,
 * спорт, вакансия) и разъехавшиеся правила читались бы как случайные.
 */
export function useResumeAccess() {
  const { mergedAnswers, hydrated } = useResume();

  const missing = useCallback(
    (area: ResumeArea): MissingStep[] => missingForArea(area, mergedAnswers),
    [mergedAnswers],
  );

  const can = useCallback((area: ResumeArea) => missing(area).length === 0, [missing]);

  /**
   * Проверяет доступ и, если не хватает данных, объясняет и открывает анкету на
   * первом незаполненном шаге. Возвращает true, если действие можно продолжать.
   */
  const require = useCallback((area: ResumeArea): boolean => {
    // Пока анкета не поднялась из хранилища, не мешаем: иначе первое касание
    // после запуска упиралось бы в ложную «незаполненность».
    if (!hydrated) return true;
    const gaps = missing(area);
    if (!gaps.length) return true;
    Alert.alert(
      AREA_TITLE[area],
      `Заполните анкету:\n\n${missingSummary(gaps)}`,
      [
        { text: 'Позже', style: 'cancel' },
        { text: 'Заполнить', onPress: () => openResume(gaps[0].index) },
      ],
    );
    return false;
  }, [hydrated, missing]);

  return { can, missing, require, hydrated };
}
