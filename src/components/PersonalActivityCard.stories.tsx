import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { PersonalActivityCard } from './PersonalActivityCard';
const meta = { title: 'Компоненты/PersonalActivityCard', component: PersonalActivityCard,
  
  args: { icon: 'map.fill', eyebrow: 'Заявка на рассмотрении', title: 'Демо · Выходные в горах', subtitle: 'Алматы · 12 октября', onPress: fn() },
} satisfies Meta<typeof PersonalActivityCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const YourTrip: Story = { args: { eyebrow: 'Ваша поездка', title: 'Выходные в горах', subtitle: '18 октября · Алматы' } };
export const SportDark: Story = { args: { icon: 'figure.run', eyebrow: 'Вы записаны', title: 'Утренняя пробежка', subtitle: 'Парк · 13 октября, 07:00' }, parameters: { scheme: 'dark' } };
