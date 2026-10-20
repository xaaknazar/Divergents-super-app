import type { Meta,StoryObj } from '@storybook/react-native';
import { CreationSuccess } from './CreationSuccess';
import { nextReadingDate, readingDateLabel } from '../data/readingCreation';
const meta = { title: 'Создание/CreationSuccess', component: CreationSuccess,
  parameters: { canvasLayout: 'screen', reduceMotion: false },
  args: { kind: 'meetup', title: 'Встреча за кофе', dateLabel: '20 октября 2026 г., 19:00',
    locationLabel: 'Алматы · Парк', coordinate: { latitude: 43.258, longitude: 76.953 },
    summary: 'Демонстрационные данные · Участие бесплатно', destination: 'detail', onOpen: () => {}, onClose: () => {} },
} satisfies Meta<typeof CreationSuccess>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Meetup: Story = {};
export const Sport: Story = { args: { kind: 'sport', title: 'Утренний бег' } };
export const Trip: Story = { args: { kind: 'trip', title: 'Поездка в горы' } };
export const Challenge: Story = { args: { kind: 'challenge', title: '21 день развития', dateLabel: '20 октября 2026 г.',
  locationLabel: undefined, coordinate: undefined, summary: 'Демонстрационные данные · Длительность: 21 дн.' } };
export const ReadingChallenge: Story = { args: { kind: 'challenge', celebrate: true, title: 'Одна книга ближе', dateLabel: `${readingDateLabel(nextReadingDate())} · 00:00, Казахстан`,
  locationLabel: undefined, coordinate: undefined, summary: 'Демонстрационные данные · 21 дн. · Команд: 2 · 60 минут чтения в день' } };
export const Channel: Story = { args: { kind: 'channel', title: 'Книжный клуб', dateLabel: undefined,
  locationLabel: undefined, coordinate: undefined, summary: 'Демонстрационные данные' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
export const WithoutServerId: Story = { args: { destination: 'collection' } };
export const WithoutCoordinates: Story = { args: { coordinate: undefined } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' },
  args: { title: 'Большая встреча участников сообщества: обсуждаем книги, привычки и планы на следующий месяц' } };
