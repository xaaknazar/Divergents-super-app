import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { MapSearchHeader } from '../MapSearchHeader';
import { NavBarLarge } from '../NavBarLarge';
import { ProfileAvatarButton, ProfileAvatarButtonProps } from '../ProfileAvatarButton';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../state/LanguageContext', () => ({ tr: (value: string) => value }));
jest.mock('../../lib/haptics', () => ({ hSelect: jest.fn() }));

type Assert<T extends true> = T;
type SealedProfile = Assert<Extract<keyof ProfileAvatarButtonProps,
  'style' | 'className' | 'size' | 'width' | 'height' | 'variant'> extends never ? true : false>;

function expectUniformProfile(view: Awaited<ReturnType<typeof render>>) {
  const buttons = view.getAllByRole('button', { name: /^Профиль/ });
  for (const button of buttons) {
    const style = StyleSheet.flatten(button.props.style);
    expect(style).toMatchObject({ width: 52, height: 52, minWidth: 52, maxWidth: 52,
      minHeight: 52, maxHeight: 52, flexShrink: 0, flexGrow: 0, borderRadius: 26 });
    // The outer 52 pt circle stays visible, even without a progress ring.
    expect(style.backgroundColor).toBeTruthy();
    expect(style.backgroundColor).not.toBe('transparent');
  }
  for (const face of view.getAllByTestId('profile-avatar-face')) {
    expect(StyleSheet.flatten(face.props.style)).toMatchObject({ width: 42, height: 42, borderRadius: 21 });
  }
  return buttons;
}

it.each(['light', 'dark'] as const)('keeps one surface and target size for every profile state in %s', async scheme => {
  const states: ProfileAvatarButtonProps[] = [
    {}, { name: 'Алия', progress: 0 }, { name: 'Алия Бек', progress: 50 },
    { name: 'Алия Бек', progress: 100 }, { photoUrl: 'photo', progress: 60, badge: 14 },
  ];
  for (const textSize of ['md', 'xl'] as const) {
    for (const reduceTransparency of [true, false]) {
      const view = await render(<ThemePreviewProvider scheme={scheme} textSize={textSize} reduceTransparency={reduceTransparency}>
        <>{states.map((props, index) => <ProfileAvatarButton key={index} {...props} onPress={jest.fn()} />)}</>
      </ThemePreviewProvider>);
      expect(expectUniformProfile(view)).toHaveLength(states.length);
      await view.unmount();
    }
  }
});

it('uses the same profile button on titled tabs and the map, preserving every action', async () => {
  const profile = { name: 'Алия', progress: 0, badge: 0 };
  const actions = Array.from({ length: 5 }, () => jest.fn());
  const view = await render(<ThemePreviewProvider>
    <>{['Обучение', 'Divergents AI', 'Сообщество', 'Карьера'].map((title, index) =>
      <NavBarLarge key={title} title={title} trailing={<ProfileAvatarButton {...profile} onPress={actions[index]} />} />)}
      <MapSearchHeader city="Петропавловск-Камчатский" country="Россия" cityPickerOpen={false}
        onChooseCity={jest.fn()} searchValue="" searchPlaceholder="Поиск мест" onSearchChange={jest.fn()}
        profile={profile} onOpenProfile={actions[4]} />
    </>
  </ThemePreviewProvider>);
  const buttons = expectUniformProfile(view);
  expect(buttons).toHaveLength(5);
  const surfaces = buttons.map(button => StyleSheet.flatten(button.props.style));
  surfaces.forEach(style => expect(style).toEqual(surfaces[0]));
  for (const button of buttons) await fireEvent.press(button);
  actions.forEach(onPress => expect(onPress).toHaveBeenCalledTimes(1));
});

it('ignores old or untyped size and surface overrides', async () => {
  const overrides = { variant: 'plain', size: 30, style: { width: 30, height: 30, backgroundColor: 'magenta' } };
  const view = await render(<ThemePreviewProvider>
    <ProfileAvatarButton {...overrides} onPress={jest.fn()} />
  </ThemePreviewProvider>);
  expectUniformProfile(view);
  expect(JSON.stringify(view.toJSON())).not.toContain('magenta');
});

it('announces disabled state without changing its dimensions', async () => {
  const view = await render(<ThemePreviewProvider><ProfileAvatarButton name="Алия" /></ThemePreviewProvider>);
  const [button] = expectUniformProfile(view);
  expect(button.props.accessibilityState.disabled).toBe(true);
});
