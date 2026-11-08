import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { meetup } from '../storybook/communityFixtures';
import { CommunityMeetupCard } from './CommunityMeetupCard';
const meta = { title: 'Сообщество/CommunityMeetupCard', component: CommunityMeetupCard,
  args: { meetup, onPress: fn() },
} satisfies Meta<typeof CommunityMeetupCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CityWithoutVenue: Story = { args: { meetup: { ...meetup, place: '' } } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' },
  args: { meetup: { ...meetup, title: 'Встреча сообщества: кофе, общение и новые знакомства' } } };
