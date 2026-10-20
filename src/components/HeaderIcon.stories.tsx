import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { HeaderIcon } from './HeaderIcon';

const meta = { title: 'Навигация/HeaderIcon', component: HeaderIcon, args: { name: 'bell', label: 'Уведомления', onPress: fn() },
} satisfies Meta<typeof HeaderIcon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const WithBadge: Story = { args: { badge: 12 } };
export const ManyNotifications: Story = { args: { badge: 120 } };
export const Disabled: Story = { args: { onPress: undefined } };
export const MapControl: Story = { args: { variant: 'floating', name: 'location.fill', label: 'Моё местоположение' } };
export const PrimaryAction: Story = { args: { variant: 'primary', name: 'plus', label: 'Добавить место' } };
