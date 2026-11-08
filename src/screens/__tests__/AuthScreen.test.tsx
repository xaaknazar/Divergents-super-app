import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { AuthScreen } from '../AuthScreen';

const mockCreate = jest.fn();
const mockPrepare = jest.fn();
const mockActivate = jest.fn();
const mockSignUp = jest.fn();
const mockFinishRegistration = jest.fn();
const mockStartRegistration = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({
  useSignIn: () => ({ isLoaded: true, signIn: { create: mockCreate, prepareFirstFactor: mockPrepare }, setActive: mockActivate }),
  useSignUp: () => ({ isLoaded: true, signUp: { create: mockSignUp, prepareEmailAddressVerification: mockPrepare } }),
  useSSO: () => ({ startSSOFlow: jest.fn() }),
}));
jest.mock('../../state/AppFlowContext', () => ({ useAppFlow: () => ({ startRegistration: mockStartRegistration, finishRegistration: mockFinishRegistration }) }));
jest.mock('../../state/LanguageContext', () => ({
  tr: (text: string) => text,
  useLang: () => ({ lang: 'ru', setLang: jest.fn(), t: (key: string) => ({
    email: 'Email', cont: 'Продолжить', tab_signin: 'Вход', tab_signup: 'Регистрация',
  } as Record<string, string>)[key] ?? key }),
}));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../theme/tokens') }));
jest.mock('../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../components/Logo', () => ({ Logo: () => null }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.invalid' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openBrowserAsync: jest.fn() }));
jest.mock('expo-auth-session', () => ({ makeRedirectUri: jest.fn() }));

// Synthetic credentials, never a deployed reviewer account.
const EMAIL = 'reviewer@example.invalid';
const PASSWORD = 'synthetic-test-value';
const screen = () => render(<AuthScreen navigation={{} as any} route={{ key: 'auth', name: 'Auth' }} />);
beforeEach(() => {
  jest.resetAllMocks();
  mockCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'session-test' });
  mockActivate.mockResolvedValue(undefined);
  mockPrepare.mockResolvedValue(undefined);
  mockSignUp.mockResolvedValue({});
});

async function passwordForm() {
  const view = await screen();
  await fireEvent.changeText(view.getByLabelText('Email'), ` ${EMAIL} `);
  await fireEvent.press(view.getByRole('button', { name: 'Войти по паролю' }));
  await fireEvent.changeText(view.getByLabelText('Пароль'), PASSWORD);
  return view;
}

it('keeps email-code sign-in as the default', async () => {
  mockCreate.mockResolvedValue({ supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'email-test' }] });
  const view = await screen();
  expect(view.queryByLabelText('Пароль')).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Email'), EMAIL);
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить' }));
  expect(mockCreate).toHaveBeenCalledWith({ identifier: EMAIL });
  expect(mockPrepare).toHaveBeenCalledWith({ strategy: 'email_code', emailAddressId: 'email-test' });
  expect(mockActivate).not.toHaveBeenCalled();
});

it('activates only the complete Clerk session and clears the password', async () => {
  const view = await passwordForm();
  expect(view.getByLabelText('Пароль').props.secureTextEntry).toBe(true);
  await fireEvent.press(view.getByRole('button', { name: 'Войти' }));
  expect(mockCreate).toHaveBeenCalledWith({ identifier: EMAIL, password: PASSWORD });
  expect(mockActivate).toHaveBeenCalledWith({ session: 'session-test' });
  expect(mockFinishRegistration).toHaveBeenCalledTimes(1);
  expect(mockSignUp).not.toHaveBeenCalled();
  expect(view.getByLabelText('Пароль').props.value).toBe('');
});

it('rejects an incorrect password without creating an account or logging the provider response', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockCreate.mockRejectedValue({ errors: [{ code: 'form_password_incorrect', message: PASSWORD }] });
  const view = await passwordForm();
  await fireEvent.press(view.getByRole('button', { name: 'Войти' }));
  expect(view.getByText(/Неверная почта или пароль/)).toBeTruthy();
  expect(mockActivate).not.toHaveBeenCalled();
  expect(mockSignUp).not.toHaveBeenCalled();
  expect(mockFinishRegistration).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  expect(view.getByLabelText('Пароль').props.value).toBe('');
  warn.mockRestore();
});

it('keeps unknown provider errors and submitted credentials out of logs and UI', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockCreate.mockRejectedValue({ errors: [{ code: 'unknown_provider_error', message: PASSWORD }] });
  const view = await passwordForm();
  await fireEvent.press(view.getByRole('button', { name: 'Войти' }));
  expect(view.getByText(/Не удалось войти по паролю/)).toBeTruthy();
  expect(view.queryByText(PASSWORD)).toBeNull();
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

it.each([
  { status: 'needs_second_factor', createdSessionId: 'unverified-session' },
  { status: 'needs_new_password', createdSessionId: null },
  { status: 'complete', createdSessionId: null },
])('never activates an incomplete or missing session: $status', async (result) => {
  mockCreate.mockResolvedValue(result);
  const view = await passwordForm();
  await fireEvent.press(view.getByRole('button', { name: 'Войти' }));
  expect(mockActivate).not.toHaveBeenCalled();
  expect(mockFinishRegistration).not.toHaveBeenCalled();
  expect(view.getByText(/Нужен дополнительный шаг/)).toBeTruthy();
});

it('clears the secret and visibility when switching back to email-code sign-in', async () => {
  const view = await passwordForm();
  await fireEvent.press(view.getByRole('button', { name: 'Показать пароль' }));
  expect(view.getByLabelText('Пароль').props.secureTextEntry).toBe(false);
  await fireEvent.press(view.getByRole('button', { name: 'Войти по коду из письма' }));
  expect(view.queryByLabelText('Пароль')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Войти по паролю' }));
  expect(view.getByLabelText('Пароль').props.value).toBe('');
  expect(view.getByLabelText('Пароль').props.secureTextEntry).toBe(true);
});

it('keeps registration passwordless after switching from password sign-in', async () => {
  const view = await passwordForm();
  await fireEvent.press(view.getByRole('radio', { name: 'Регистрация' }));
  expect(view.queryByLabelText('Пароль')).toBeNull();
  expect(view.queryByRole('button', { name: 'Войти по паролю' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить' }));
  expect(mockSignUp).toHaveBeenCalledWith({ emailAddress: EMAIL });
  expect(mockPrepare).toHaveBeenCalledWith({ strategy: 'email_code' });
  expect(mockCreate).not.toHaveBeenCalled();
});

it('blocks duplicate submissions and method changes while sign-in is pending', async () => {
  let resolve!: (value: unknown) => void;
  mockCreate.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const view = await passwordForm();
  const submit = view.getByLabelText('Пароль').props.onSubmitEditing;
  await act(async () => { void submit(); void submit(); });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(view.getByRole('button', { name: 'Войти по коду из письма' })).toBeDisabled();
  expect(view.getByRole('radio', { name: 'Регистрация' })).toBeDisabled();
  expect(view.getByLabelText('Email').props.editable).toBe(false);
  await act(async () => { resolve({ status: 'complete', createdSessionId: 'session-test' }); });
  expect(mockActivate).toHaveBeenCalledTimes(1);
});

it('does not finish registration when activating a session fails', async () => {
  mockActivate.mockRejectedValue(new Error('offline'));
  const view = await passwordForm();
  await fireEvent.press(view.getByRole('button', { name: 'Войти' }));
  expect(mockFinishRegistration).not.toHaveBeenCalled();
  expect(view.getByText(/Не удалось войти по паролю/)).toBeTruthy();
});
