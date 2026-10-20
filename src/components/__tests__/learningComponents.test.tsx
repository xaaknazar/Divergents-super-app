import { act,fireEvent,render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { sampleCourses } from '../../storybook/courseFixtures';
import { lightTheme } from '../../theme/tokens';
import { CourseCardPremium } from '../CourseCardPremium';
import { CourseCatalogGrid } from '../CourseCatalogGrid';
import { CourseCoverProps } from '../CourseCover';
import { FeaturedCard } from '../FeaturedCard';
import { HeaderIcon } from '../HeaderIcon';
import { LearningShortcut } from '../LearningShortcut';
import { ListSkeleton } from '../ListSkeleton';
import { NavBarLarge } from '../NavBarLarge';
import { NavHeader,NavHeaderProps } from '../NavHeader';
import { NavRoundButton } from '../NavRoundButton';
import { OwnedCourseShelf } from '../OwnedCourseShelf';
import { PressableScale } from '../PressableScale';
import { ProfileAvatarButton,ProfileAvatarButtonProps } from '../ProfileAvatarButton';
import { ProgressiveBlurProps } from '../ProgressiveBlur';
import { Screen,ScreenProps } from '../Screen';
import { Skeleton,SkeletonProps } from '../Skeleton';
import { Wrapper } from '../Wrapper';
import { tabDockContentInset } from '../../lib/tabDockLayout';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../theme/tokens');
  return { T: tokens.lightTheme, ty: tokens.ty, textScale: 1, reduceMotion: true, reduceTransparency: true };
} }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true,
  default: () => ({ width: 390, height: 844, fontScale: 1, scale: 3 }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hSelect: jest.fn() }));
jest.mock('../../state/LanguageContext', () => ({ tr: (value: string) => value }));

type Assert<T extends true> = T;
type Sealed<P> = Extract<keyof P, 'style' | 'className' | 'contentStyle' | 'color' | 'tint' | 'bg' | 'height' | 'width' | 'radius' | 'scaleTo'> extends never ? true : false;
type ScreenContract = Assert<Sealed<ScreenProps>>;
type HeaderContract = Assert<Sealed<NavHeaderProps>>;
type AvatarContract = Assert<Sealed<ProfileAvatarButtonProps>>;
type BlurContract = Assert<Sealed<ProgressiveBlurProps>>;
type CoverContract = Assert<Sealed<CourseCoverProps>>;
type SkeletonContract = Assert<Sealed<SkeletonProps>>;
type IconContract = Assert<Sealed<React.ComponentProps<typeof HeaderIcon>>>;
type LargeHeaderContract = Assert<Sealed<React.ComponentProps<typeof NavBarLarge>>>;
type RoundButtonContract = Assert<Sealed<React.ComponentProps<typeof NavRoundButton>>>;
type ScaleContract = Assert<Sealed<React.ComponentProps<typeof PressableScale>>>;
type CardContract = Assert<Sealed<React.ComponentProps<typeof CourseCardPremium>>>;
type FeaturedContract = Assert<Sealed<React.ComponentProps<typeof FeaturedCard>>>;
const hostWith = (view: Awaited<ReturnType<typeof render>>, prop: string) => {
  const found = view.container.queryAll(node => node.props[prop] !== undefined)[0];
  if (!found) throw new Error(`No rendered host with ${prop}`);
  return found;
};

it('keeps failed avatar fallback local and retries when the photo changes', async () => {
  const onPress = jest.fn();
  const view = await render(<ProfileAvatarButton photoUrl="photo-one" onPress={onPress} />);
  await fireEvent(hostWith(view, 'onError'), 'error', { nativeEvent: { error: 'missing image' } });
  expect(view.container.queryAll(node => !!node.props.onError)).toHaveLength(0);
  await view.rerender(<ProfileAvatarButton photoUrl="photo-two" onPress={onPress} />);
  expect(JSON.stringify(hostWith(view, 'onError').props.source)).toContain('photo-two');
  await fireEvent.press(view.getByRole('button', { name: 'Профиль' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('retains safe areas and owns scroll content padding', async () => {
  const rogue = { bg: 'magenta', contentStyle: { paddingBottom: 900 } };
  const view = await render(<Screen {...rogue} aurora={false}><Wrapper /></Screen>);
  expect(StyleSheet.flatten(hostWith(view, 'contentContainerStyle').props.contentContainerStyle)).toEqual({ paddingTop: 44, paddingBottom: tabDockContentInset(34) });
  await view.rerender(<Screen topInset={false} bottomInset={false} tabPadding={false} aurora={false}><Wrapper /></Screen>);
  expect(StyleSheet.flatten(hostWith(view, 'contentContainerStyle').props.contentContainerStyle)).toEqual({ paddingTop: 0, paddingBottom: 0 });
});

it('leaves the page background visible behind detail headers by default', async () => {
  const view = await render(<NavHeader title="Reading challenge" onBack={jest.fn()} />);
  const painted = view.container.queryAll(node => {
    const style = StyleSheet.flatten(node.props.style);
    return style?.backgroundColor && style.backgroundColor !== 'transparent';
  });
  expect(painted).toHaveLength(0);
});

it('keeps pull-to-refresh busy until its promise settles', async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  const onRefresh = jest.fn(() => pending);
  const view = await render(<Screen onRefresh={onRefresh} aurora={false}><Wrapper /></Screen>);
  await act(async () => { void hostWith(view, 'refreshControl').props.refreshControl.props.onRefresh(); });
  expect(hostWith(view, 'refreshControl').props.refreshControl.props.refreshing).toBe(true);
  await act(async () => { resolve(); await pending; });
  expect(hostWith(view, 'refreshControl').props.refreshControl.props.refreshing).toBe(false);
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

it('adapts the catalog to its container, including compact Storybook canvases', async () => {
  const onCoursePress = jest.fn();
  const view = await render(<CourseCatalogGrid courses={sampleCourses} ownedProgress={{}} onCoursePress={onCoursePress} />);
  expect(view.container.queryAll(node => StyleSheet.flatten(node.props.style)?.width === '48.5%')).toHaveLength(3);
  await fireEvent(view.getByTestId('course-catalog-layout'), 'layout', { nativeEvent: { layout: { width: 320 } } });
  expect(view.container.queryAll(node => StyleSheet.flatten(node.props.style)?.width === '48.5%')).toHaveLength(0);
  expect(view.getAllByRole('button')).toHaveLength(3);
  await fireEvent.press(view.getAllByRole('button')[0]);
  expect(onCoursePress).toHaveBeenCalledWith(sampleCourses[0].id);
});

it('sizes owned cards to the available horizontal shelf width', async () => {
  const view = await render(<OwnedCourseShelf courses={sampleCourses} progress={{}} onCoursePress={jest.fn()} />);
  await fireEvent(hostWith(view, 'horizontal'), 'layout', { nativeEvent: { layout: { width: 280 } } });
  expect(view.container.queryAll(node => StyleSheet.flatten(node.props.style)?.width === 248)).toHaveLength(3);
});

it.each(['plain', 'frosted', 'hero', 'overlay'] as const)('preserves back actions for %s', async variant => {
  const onBack = jest.fn();
  const view = await render(<NavHeader title="Курс" variant={variant} onBack={onBack} />);
  await fireEvent.press(view.getByRole('button', { name: 'Назад' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('ignores untyped header and skeleton overrides', async () => {
  const rogue = { tint: 'magenta', style: { backgroundColor: 'magenta' }, w: 1, h: 1, radius: 0 };
  const view = await render(<><NavHeader {...rogue} title="Курс" /><Skeleton {...rogue} variant="body" /></>);
  expect(StyleSheet.flatten(view.getByRole('header').props.style).color).toBe(lightTheme.label);
  expect(JSON.stringify(view.toJSON())).not.toContain('magenta');
});

it('exposes list loading without private avatar/text placeholders in accessibility', async () => {
  const view = await render(<ListSkeleton rows={3} />);
  expect(view.getByLabelText('Загрузка списка').props.accessibilityState.busy).toBe(true);
  expect(view.container.queryAll(node => node.props.accessibilityElementsHidden === true)).toHaveLength(9);
});

it('preserves download shortcut copy and navigation', async () => {
  const onPress = jest.fn();
  const view = await render(<LearningShortcut kind="downloads" count={4} onPress={onPress} />);
  await fireEvent.press(view.getByRole('button', { name: 'Скачанные уроки. 4 · доступны без интернета' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
