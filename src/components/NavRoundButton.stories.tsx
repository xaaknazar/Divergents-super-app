import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { NavRoundButton } from './NavRoundButton';

const meta = { title: 'Навигация/NavRoundButton', component: NavRoundButton, args: { icon: 'chevron.left', accessibilityLabel: 'Назад', onPress: fn() },
} satisfies Meta<typeof NavRoundButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const LightSurface: Story = { args: { scheme: 'light' } };
export const Disabled: Story = { args: { onPress: undefined } };
