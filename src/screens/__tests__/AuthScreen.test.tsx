import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

// Synthetic test identifier, never a deployed reviewer account.
const EMAIL = 'reviewer@example.invalid';
const screen = () => render(<AuthScreen navigation={{} as any} route={{ key: 'auth', name: 'Auth' }} />);
beforeEach(() => {
  jest.resetAllMocks();
  mockCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'session-test' });
  mockActivate.mockResolvedValue(undefined);
  mockPrepare.mockResolvedValue(undefined);
  mockSignUp.mockResolvedValue({});
});

it('keeps email-code sign-in as the default', async () => {
  mockCreate.mockResolvedValue({ supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'email-test' }] });
  const view = await screen();
  expect(view.queryByLabelText('Пароль')).toBeNull();
  expect(view.queryByRole('button', { name: 'Войти по паролю' })).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Email'), EMAIL);
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить' }));
  expect(mockCreate).toHaveBeenCalledWith({ identifier: EMAIL });
  expect(mockPrepare).toHaveBeenCalledWith({ strategy: 'email_code', emailAddressId: 'email-test' });
  expect(mockActivate).not.toHaveBeenCalled();
});

it('keeps registration on the email-code flow', async () => {
  const view = await screen();
  await fireEvent.changeText(view.getByLabelText('Email'), EMAIL);
  await fireEvent.press(view.getByRole('radio', { name: 'Регистрация' }));
  expect(view.queryByLabelText('Пароль')).toBeNull();
  expect(view.queryByRole('button', { name: 'Войти по паролю' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить' }));
  expect(mockSignUp).toHaveBeenCalledWith({ emailAddress: EMAIL });
  expect(mockPrepare).toHaveBeenCalledWith({ strategy: 'email_code' });
  expect(mockCreate).not.toHaveBeenCalled();
});

it('keeps unknown provider errors and submitted identifiers out of logs and UI', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockCreate.mockRejectedValue({ errors: [{ code: 'unknown_provider_error', message: EMAIL }] });
  const view = await screen();
  await fireEvent.changeText(view.getByLabelText('Email'), EMAIL);
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить' }));
  expect(view.getByText('err_generic')).toBeTruthy();
  expect(warn).not.toHaveBeenCalled();
  expect(mockActivate).not.toHaveBeenCalled();
  expect(mockSignUp).not.toHaveBeenCalled();
  warn.mockRestore();
});
