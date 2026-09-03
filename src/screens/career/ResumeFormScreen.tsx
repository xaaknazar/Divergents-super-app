import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton } from '../../components/ui';
import { RESUME_STEPS, ResumeField, ResumeStep } from '../../data/resumeSchema';
import { isFieldMissing } from '../../data/resumeAccess';
import { isValidPhone } from '../../data/phone';
import { ResumeFieldInput, isTextLikeField } from '../../components/ResumeField';
import { AssessmentsBlock } from '../../components/AssessmentsBlock';
import { ProfilePhotoField } from '../../components/ProfilePhotoField';
import { useResume } from '../../state/useResume';
import { useLang, tr } from '../../state/LanguageContext';
import { useKeyboardShown } from '../../state/useKeyboard';
// Registered in BOTH the Career stack and the Profile stack, so its props are
// typed permissively (it only needs navigation.goBack + route.params.step).
// This lets "Редактировать анкету" opened from Profile close back to Profile.
type Props = { navigation: { goBack: () => void }; route: { params?: { step?: number } } };

type Errors = Record<string, string>;
type Answers = Record<string, any>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Текст ошибки для поля или undefined, если всё в порядке. Одна функция и для
 * проверки перед «Далее», и для снятия ошибки при вводе — чтобы правила не
 * расходились.
 */
function fieldError(field: ResumeField, value: unknown): string | undefined {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (field.key === 'email') {
    if (!raw && field.optional) return undefined;
    if (!raw) return 'Заполните это поле';
    return EMAIL_RE.test(raw) ? undefined : 'Укажите корректный email';
  }
  if (field.optional) return undefined;
  if (field.key === 'phone') {
    if (!raw) return 'Заполните это поле';
    return isValidPhone(raw) ? undefined : 'Номер должен быть полным: +7 (777) 123-45-67';
  }
  if (isFieldMissing(field, value)) return field.type === 'date' ? 'Выберите дату рождения' : 'Заполните это поле';
  return undefined;
}

function stepErrors(step: ResumeStep, answers: Answers): Errors {
  const out: Errors = {};
  for (const f of step.fields) {
    const e = fieldError(f, answers[f.key]);
    if (e) out[f.key] = e;
  }
  return out;
}

/** Первое поле шага (в порядке схемы), у которого есть ошибка. */
const firstErrorKey = (step: ResumeStep, errs: Errors) => step.fields.find((f) => errs[f.key])?.key;

export function ResumeFormScreen({ navigation, route }: Props) {
  const { T, ty } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const kbShown = useKeyboardShown();
  const { answers, mergedAnswers, setField, completeness, submit, submitting, dirty } = useResume();
  // Почта из Clerk подтверждена кодом. Менять её в анкете нельзя: иначе вход и
  // анкета указывают на разных людей, а сервер связывает их именно по почте.
  const { user } = useUser();
  const verifiedEmail = user?.primaryEmailAddress?.verification?.status === 'verified'
    ? user.primaryEmailAddress.emailAddress
    : null;
  useEffect(() => {
    // Техническая подстановка, а не правка человека — не делает анкету «несохранённой».
    if (verifiedEmail && answers.email !== verifiedEmail) setField('email', verifiedEmail, { silent: true });
  }, [verifiedEmail, answers.email]);
  const total = RESUME_STEPS.length;
  const [step, setStep] = useState(Math.min(Math.max(route.params?.step ?? 0, 0), total - 1));
  const s = RESUME_STEPS[step];
  const last = step === total - 1;

  // Ошибки показываем только после «Далее»/«Сохранить» — не красим форму
  // красным, пока человек ещё ничего не трогал.
  const [errors, setErrors] = useState<Errors>({});
  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Record<string, number>>({});
  const pendingScroll = useRef<string | null>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  // Проверяем по объединению локальных ответов и сервера: анкету могли
  // заполнить на сайте, и требовать ввести это заново было бы нечестно.
  const check: Answers = { ...mergedAnswers, ...(verifiedEmail ? { email: verifiedEmail } : {}) };

  // Состояние каждого шага для степпера: заполнен / начат / не тронут.
  const stepStates = useMemo(() => RESUME_STEPS.map((st) => {
    const errs = stepErrors(st, check);
    if (!Object.keys(errs).length) return 'complete' as const;
    const started = st.fields.some((f) => !f.optional && !isFieldMissing(f, check[f.key]));
    return started ? 'started' as const : 'untouched' as const;
  }), [mergedAnswers, verifiedEmail]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstIncomplete = stepStates.findIndex((st) => st !== 'complete');
  const remaining = Object.keys(stepErrors(s, check)).length;

  const scrollToField = (key: string) => {
    const y = fieldY.current[key];
    if (y == null) { pendingScroll.current = key; return; }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  const go = (n: number, errs: Errors = {}) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    fieldY.current = {};
    setErrors(errs);
    setStep(n);
    const key = firstErrorKey(RESUME_STEPS[n], errs);
    if (key) pendingScroll.current = key; else scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  /** Проверяет шаг; при ошибках показывает их и прокручивает к первой. */
  const validateStep = (i: number): boolean => {
    const errs = stepErrors(RESUME_STEPS[i], check);
    setErrors(errs);
    const key = firstErrorKey(RESUME_STEPS[i], errs);
    if (key) { scrollToField(key); return false; }
    return true;
  };

  // Назад — свободно. Вперёд — через ту же проверку, что и «Далее», и не дальше
  // первого незаполненного шага: иначе степпер был бы тихим обходом проверки.
  const onStepPress = (i: number) => {
    if (i === step) return;
    if (i < step) { go(i); return; }
    if (!validateStep(step)) return;
    const target = firstIncomplete >= 0 && firstIncomplete < i ? firstIncomplete : i;
    go(target, target !== i ? stepErrors(RESUME_STEPS[target], check) : {});
  };

  const next = () => { if (validateStep(step)) go(step + 1); };

  const finish = async () => {
    // Полнота 100%: не общий Alert, а переход к первому незаполненному шагу с
    // подсветкой его полей.
    if (firstIncomplete >= 0) {
      if (firstIncomplete === step) { validateStep(step); return; }
      go(firstIncomplete, stepErrors(RESUME_STEPS[firstIncomplete], check));
      return;
    }
    const ok = await submit();
    // Truthful messaging: there is no automatic retry/queue. On success the data
    // is in Talentslab; on failure it stays saved locally and the user can open
    // the form and tap "Сохранить" again to retry.
    Alert.alert(
      ok ? tr('Анкета сохранена') : tr('Сохранено в приложении'),
      ok
        ? tr('Данные отправлены в Talentslab.')
        : tr('Нет связи с Talentslab. Анкета сохранена в приложении — откройте её и нажмите «Сохранить» ещё раз, когда появится связь.'),
      [{ text: tr('Готово'), onPress: () => navigation.goBack() }],
    );
  };

  // Локально всё уже сохранено; спрашиваем только про то, что не ушло на сервер.
  const close = () => {
    if (!dirty) { navigation.goBack(); return; }
    Alert.alert(
      tr('Изменения не отправлены'),
      tr('Закрыть без сохранения?'),
      [
        { text: tr('Сохранить'), onPress: () => { finish(); } },
        { text: tr('Закрыть'), style: 'destructive', onPress: () => navigation.goBack() },
        { text: tr('Отмена'), style: 'cancel' },
      ],
    );
  };

  const onChangeField = (f: ResumeField, v: any) => {
    setField(f.key, v);
    // Ошибка снимается сразу, как только значение стало годным.
    if (errors[f.key] && !fieldError(f, v)) {
      setErrors((p) => { const n = { ...p }; delete n[f.key]; return n; });
    }
  };

  // Цепочка фокуса «Далее → следующее текстовое поле» в пределах шага.
  const textKeys = s.fields
    .filter((f) => isTextLikeField(f) && !(f.key === 'email' && verifiedEmail))
    .map((f) => f.key);
  const focusAfter = (key: string) => {
    const i = textKeys.indexOf(key);
    const nextKey = i >= 0 ? textKeys[i + 1] : undefined;
    if (nextKey) inputRefs.current[nextKey]?.focus();
  };

  const stepColor = (i: number) => {
    const st = stepStates[i];
    if (st === 'complete') return T.brand;
    if (st === 'started') return T.orange;
    return i === step ? T.brandTintedStrong : T.fillSecondary;
  };
  const stepStatusText = (i: number) => stepStates[i] === 'complete' ? 'заполнен' : stepStates[i] === 'started' ? 'заполнен частично' : 'не заполнен';

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Header */}
      <NavHeader title={`${tr('Анкета')} · ${completeness}%`} backLabel={tr('Закрыть')} onBack={close} />

      {/* Stepper: полоска 4pt остаётся визуальной, а область нажатия — 44pt. */}
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 2 }}>
        {RESUME_STEPS.map((st, i) => (
          <Pressable
            key={st.key}
            onPress={() => onStepPress(i)}
            accessibilityRole="button"
            accessibilityLabel={`${tr('Шаг')} ${i + 1}: ${st.title}`}
            accessibilityValue={{ text: tr(stepStatusText(i)) }}
            accessibilityState={{ selected: i === step }}
            style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
          >
            <View style={{ height: i === step ? 6 : 4, borderRadius: 3, backgroundColor: stepColor(i) }} />
          </Pressable>
        ))}
      </View>

      {/* Панель с кнопкой — обычный элемент потока, а не absolute: только так
          KeyboardAvoidingView может поднять её над клавиатурой. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={s.icon} size={20} color={T.brand} />
            </View>
            <View>
              <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]} numberOfLines={1}>{tr('Шаг')} {step + 1} {tr('из')} {total}</Text>
              <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{s.title}</Text>
            </View>
          </View>

          {s.key === 'personal' ? <ProfilePhotoField /> : null}

          {s.fields.map((f) => {
            const textIdx = textKeys.indexOf(f.key);
            return (
              <View
                key={f.key}
                onLayout={(e) => {
                  fieldY.current[f.key] = e.nativeEvent.layout.y;
                  if (pendingScroll.current === f.key) { pendingScroll.current = null; scrollToField(f.key); }
                }}
              >
                <ResumeFieldInput
                  field={f}
                  value={f.key === 'email' && verifiedEmail ? verifiedEmail : answers[f.key]}
                  onChange={(v) => onChangeField(f, v)}
                  locked={f.key === 'email' && !!verifiedEmail}
                  lockNote={f.key === 'email' && verifiedEmail ? tr('Почта подтверждена при входе — изменить её нельзя.') : undefined}
                  error={errors[f.key] ? tr(errors[f.key]) : undefined}
                  inputRef={textIdx >= 0 ? (r) => { inputRefs.current[f.key] = r; } : undefined}
                  returnKeyType={textIdx >= 0 && textIdx < textKeys.length - 1 ? 'next' : 'done'}
                  onSubmitEditing={textIdx >= 0 ? () => focusAfter(f.key) : undefined}
                />
              </View>
            );
          })}

          {s.key === 'assessments' ? <AssessmentsBlock /> : null}
        </ScrollView>

        {/* Footer */}
        <View style={{ padding: 16, paddingBottom: kbShown ? 12 : insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {remaining > 0 ? (
            <Text accessibilityLiveRegion="polite" style={[ty.footnote, { color: Object.keys(errors).length ? T.redText : T.labelSecondary, marginBottom: 10, textAlign: 'center' }]}>
              {tr('Осталось заполнить')}: {remaining}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {step > 0 ? (
              <PrimaryButton label={tr('Назад')} color="transparent" style={{ flex: 1 }} onPress={() => go(step - 1)} />
            ) : null}
            {last ? (
              <PrimaryButton label={tr('Сохранить')} icon="checkmark" loading={submitting} style={{ flex: 2 }} onPress={finish} />
            ) : (
              <PrimaryButton label={tr('Далее')} icon="arrow.right" style={{ flex: 2 }} onPress={next} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
