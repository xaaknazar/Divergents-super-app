import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { sport } from '../storybook/communityFixtures';
import { CommunitySportCard } from './CommunitySportCard';
const meta = { title: 'Сообщество/CommunitySportCard', component: CommunitySportCard,
  args: { activity: sport, onPress: fn() },
} satisfies Meta<typeof CommunitySportCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Run: Story = {};
export const Football: Story = { args: { activity: { ...sport, id: 'demo-football', title: 'Футбол по субботам', place: 'Манеж, Алматы', date: '18 октября, 10:00', icon: 'soccerball' } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
