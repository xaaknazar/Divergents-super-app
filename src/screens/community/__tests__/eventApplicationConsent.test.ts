import { Alert } from 'react-native';
import { confirmEventApplication, EVENT_APPLICATION_DISCLOSURE } from '../eventApplicationConsent';

afterEach(() => jest.restoreAllMocks());
it('requires an explicit send confirmation and explains the privacy boundary', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, message, buttons) => {
    expect(message).toBe(EVENT_APPLICATION_DISCLOSURE);
    expect(message).toContain('только администраторам');
    buttons?.find(b => b.text === 'Отправить')?.onPress?.();
  });
  expect(await confirmEventApplication()).toBe(true);
});
it('cancellation does not authorize submission', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.find(b => b.style === 'cancel')?.onPress?.());
  expect(await confirmEventApplication()).toBe(false);
});
