import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingPublicationReview } from './ReadingPublicationReview';
import { nextReadingDate } from '../data/readingCreation';
const meta = { title: 'Reading/Publication', component: ReadingPublicationReview,
  args: { draft: { title: 'Одна книга ближе', startDate: nextReadingDate(), durationDays: 21,
    teams: [{ name: 'Книжный клуб', captainNickname: 'Reader', capacity: 20 }] }, busy: false, onRetry: () => {} },
} satisfies Meta<typeof ReadingPublicationReview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Sending: Story = { args: { busy: true } };
export const Offline: Story = { args: { error: 'Нет подтверждения сервера. Проверьте публикацию повторно.' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
