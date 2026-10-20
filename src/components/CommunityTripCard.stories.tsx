import type { Meta,StoryObj } from '@storybook/react-native';
import { navigation,trip } from '../storybook/communityFixtures';
import { CommunityTripCard } from './CommunityTripCard';
const meta = { title: 'Компоненты/CommunityTripCard', component: CommunityTripCard,
  
  args: { trip, navigation },
} satisfies Meta<typeof CommunityTripCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
/** Поездка с ночёвкой — палатка вместо гор. */
export const TwoDays: Story = { args: { trip: { ...trip, title: 'Кольсай и Каинды', region: 'Алматинская область', difficulty: 'Средняя', days: 2, meta: 'Алматинская область · 2 дня', date: '1 ноября' } } };
