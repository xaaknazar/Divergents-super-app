import type { Meta,StoryObj } from '@storybook/react-native';
import { CareerComingSoon } from './CareerComingSoon';
const meta = { title: 'Карьера/CareerComingSoon', component: CareerComingSoon,
  args: { badge: 'Скоро', title: 'Раздел в разработке', description: 'Мы дорабатываем «Карьеру»: вакансии и подбор по вашим талантам. Раздел появится в одном из следующих обновлений приложения.' },
} satisfies Meta<typeof CareerComingSoon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
