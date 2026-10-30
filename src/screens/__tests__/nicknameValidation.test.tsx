import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ResumeFormScreen } from '../career/ResumeFormScreen';
import { NicknameGateScreen } from '../NicknameGateScreen';
import { useResume } from '../../state/useResume';
import { checkPublicNickname } from '../../data/nicknameAvailability';
import { NICKNAME_TAKEN_MESSAGE } from '../../data/nickname';

jest.mock('../../state/useResume', () => ({ useResume: jest.fn() }));
jest.mock('../../data/nicknameAvailability', () => ({ checkPublicNickname: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: async () => 'token' }), useUser: () => ({ user: null }), useClerk: () => ({ signOut: jest.fn() }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../theme/tokens') }));
jest.mock('../../state/LanguageContext', () => ({ useLang: () => {}, tr: (value: string) => value }));
jest.mock('../../state/signOut', () => ({ signOutAndClear: jest.fn() }));
jest.mock('../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../components/Logo', () => ({ Logo: () => null }));
jest.mock('../../components/ProfilePhotoField', () => ({ ProfilePhotoField: () => null }));
jest.mock('../../components/AssessmentsBlock', () => ({ AssessmentsBlock: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: require('react-native').View }));
jest.mock('../../data/resumeSchema', () => ({ RESUME_STEPS: [
  { key: 'personal', title: 'Личные данные', fields: [{ key: 'nickname', label: 'Псевдоним', type: 'text' }] },
  { key: 'other', title: 'О себе', fields: [{ key: 'hobbies', label: 'Увлечения', type: 'text' }] },
] }));
const submitResult = jest.fn();
const setField = jest.fn();
const navigation = { goBack: jest.fn(), dispatch: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(checkPublicNickname).mockResolvedValue(true);
  submitResult.mockResolvedValue({ ok: true });
  jest.mocked(useResume).mockReturnValue({ answers: { nickname: 'Beknazar', hobbies: 'Спорт' }, mergedAnswers: { nickname: 'Beknazar', hobbies: 'Спорт' }, completeness: 100, dirty: true, submitting: false, setField, submitResult } as any);
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('shows a taken nickname under the field and prevents going to the next step', async () => {
  jest.mocked(checkPublicNickname).mockResolvedValue(false);
  const view = await render(<ResumeFormScreen navigation={navigation} route={{}} />);
  await fireEvent.press(view.getByText('Далее'));
  expect(view.getByText(NICKNAME_TAKEN_MESSAGE)).toBeTruthy();
  expect(submitResult).not.toHaveBeenCalled();
  expect(navigation.goBack).not.toHaveBeenCalled();
  await fireEvent.changeText(view.getByDisplayValue('Beknazar'), 'Beknazar01');
  expect(view.queryByText(NICKNAME_TAKEN_MESSAGE)).toBeNull();
});

it('handles a save-time collision after a successful availability check without claiming success or closing', async () => {
  submitResult.mockResolvedValue({ ok: false, reason: 'nickname_taken' });
  const view = await render(<ResumeFormScreen navigation={navigation} route={{ params: { step: 1 } }} />);
  await fireEvent.press(view.getByText('Сохранить'));
  expect(view.getByText(NICKNAME_TAKEN_MESSAGE)).toBeTruthy();
  expect(view.getByDisplayValue('Beknazar')).toBeTruthy();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(navigation.goBack).not.toHaveBeenCalled();
});

it('allows an unchanged owned nickname and reports a genuinely successful save', async () => {
  const view = await render(<ResumeFormScreen navigation={navigation} route={{ params: { step: 1 } }} />);
  await fireEvent.press(view.getByText('Сохранить'));
  expect(submitResult).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledWith('Анкета сохранена', expect.any(String), expect.any(Array));
});

it('the nickname gate displays a final server collision directly, without another network check', async () => {
  jest.useFakeTimers();
  submitResult.mockResolvedValue({ ok: false, reason: 'nickname_taken' });
  const view = await render(<NicknameGateScreen />);
  await act(async () => { jest.advanceTimersByTime(500); });
  await fireEvent(view.getByLabelText('Псевдоним'), 'submitEditing');
  expect(view.getByText(NICKNAME_TAKEN_MESSAGE)).toBeTruthy();
  expect(checkPublicNickname).toHaveBeenCalledTimes(1);
});

it('ignores an old taken response when the gate input has since become invalid', async () => {
  jest.useFakeTimers();
  let resolve!: (value: boolean) => void;
  jest.mocked(checkPublicNickname).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const view = await render(<NicknameGateScreen />);
  await act(async () => { jest.advanceTimersByTime(500); });
  await fireEvent.changeText(view.getByLabelText('Псевдоним'), 'B');
  await act(async () => { resolve(false); });
  expect(view.queryByText(NICKNAME_TAKEN_MESSAGE)).toBeNull();
  expect(view.queryByText('Псевдоним свободен')).toBeNull();
});
