import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { MapCityButton } from './MapCityButton';

const meta = {
  title: 'Карта/MapCityButton', component: MapCityButton,
  args: { city: 'Алматы', country: 'Казахстан', onPress: fn() },
} satisfies Meta<typeof MapCityButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Expanded: Story = { args: { expanded: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LongCity: Story = { args: { city: 'Усть-Каменогорск' }, parameters: { viewport: 'compact' } };
export const LargeText: Story = { ...LongCity, parameters: { viewport: 'compact', textSize: 'xl' } };
export const WithoutCountry: Story = { args: { country: undefined } };
