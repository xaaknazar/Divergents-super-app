import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Открыта ли клавиатура. Нужно, чтобы нижняя панель с кнопкой не добавляла
 * отступ под «домашнюю полоску», когда она и так поднята над клавиатурой.
 */
export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // На iOS ловим «will»: панель должна ехать вместе с клавиатурой, а не после.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvent, () => setShown(true));
    const h = Keyboard.addListener(hideEvent, () => setShown(false));
    return () => { s.remove(); h.remove(); };
  }, []);
  return shown;
}
