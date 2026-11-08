import { Alert } from 'react-native';

export const EVENT_APPLICATION_DISCLOSURE = 'Организатор увидит ваше публичное имя и сможет принять или отклонить заявку. Анкета, полное имя и контакты доступны только администраторам Divergents. О решении придёт уведомление в приложении. Если вас примут, но вы не придёте или нарушите правила встречи, организатор сможет поставить отметку с пояснением. Она будет видна в вашем профиле и при рассмотрении будущих заявок. Если планы изменились — отмените участие до начала встречи.';

export function confirmEventApplication(): Promise<boolean> {
  return new Promise(resolve => Alert.alert('Отправить заявку?', EVENT_APPLICATION_DISCLOSURE, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Отправить', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
