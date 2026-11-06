import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { HeaderTextButton } from './HeaderTextButton';

const meta = { parameters: { reduceTransparency: false }, title: 'Навигация/HeaderTextButton', component: HeaderTextButton, args: { label: 'Прочитать все', onPress: fn() },
} satisfies Meta<typeof HeaderTextButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const WithIcon: Story = { args: { label: 'Сбросить', icon: 'arrow.counterclockwise' } };
export const Busy: Story = { args: { label: 'Сохранить', busy: true } };
export const Disabled: Story = { args: { onPress: undefined } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
