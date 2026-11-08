import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { MapActionButton } from './MapActionButton';
const meta = { title: 'Карта/MapActionButton', component: MapActionButton,
  args: { icon: 'location.fill', label: 'Моё местоположение', onPress: fn(), onLongPress: fn() },
} satisfies Meta<typeof MapActionButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Location: Story = {};
export const Add: Story = { args: { primary: true, icon: 'plus', label: 'Добавить место' } };
export const Moderation: Story = { args: { icon: 'checkmark.seal.fill', label: 'Заявки на метки', badge: 12 } };
export const Dark: Story = { parameters: { scheme: 'dark', reduceTransparency: false } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
