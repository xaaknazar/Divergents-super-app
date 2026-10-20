import React from 'react';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { ScreenDescription } from './ScreenDescription';
import { Wrapper } from './Wrapper';

/** Available without a server response or cached challenge page. */
export function ReadingLocalPause({ onPause }: { onPause: () => void }) {
  return <ContentBlock>
    <Wrapper gap={12}>
      <ScreenDescription text="На этом телефоне идёт ваш сеанс чтения. Можно снять ограничения, не дожидаясь загрузки челленджа. Сохранённый подход останется на телефоне." />
      <Button label="Пауза — снять ограничения" icon="pause.fill" size="large" onPress={onPause}
        accessibilityHint="Поставить чтение на паузу на этом устройстве без ожидания сервера" />
    </Wrapper>
  </ContentBlock>;
}
