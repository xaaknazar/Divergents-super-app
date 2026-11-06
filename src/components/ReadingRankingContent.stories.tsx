import type { Meta, StoryObj } from '@storybook/react-native';
import { individualReadingFixture } from '../storybook/readingFixtures';
import { ReadingRankingContent } from './ReadingRankingContent';
const meta = { title: 'Reading/Ranking', component: ReadingRankingContent, args: { data: individualReadingFixture, onHistory: () => {} },
  parameters: { canvasLayout: 'content' } } satisfies Meta<typeof ReadingRankingContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
/** Вторая вкладка. */
export const AveragePace: Story = { args: { initialMetric: 'pace' } };
export const DifferentLeaders: Story = { args: { data: { ...individualReadingFixture,
  ranking: individualReadingFixture.ranking.map(member => member.userId === 'r1' ? { ...member, pages: 82, daysParticipated: 2 } : member),
} } };
export const Empty: Story = { args: { data: { ...individualReadingFixture, ranking: [], me: null } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };

/** Фото из профиля и запасные инициалы видны вместе; узкий экран сохраняет фото. */
export const ProfilePhotos: Story = { args: { data: { ...individualReadingFixture,
  me: { ...individualReadingFixture.me!, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces' },
  ranking: individualReadingFixture.ranking.map((member, index) => ({ ...member,
    avatar: index === 0 ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces'
      : member.userId === individualReadingFixture.me!.userId
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces' : null,
  })),
} } };
export const ProfilePhotosNarrow: Story = { args: ProfilePhotos.args, parameters: { viewport: 'compact', textSize: 'xl' } };

const newcomer = { ...individualReadingFixture.me!, userId: 'newcomer', name: 'Новый читатель',
  daysParticipated: 1, readingDays: 1, completedDays: 1, pages: 200, averagePages: 200, flags: 0 };
export const NewcomerPace: Story = { args: { initialMetric: 'pace', data: {
  ...individualReadingFixture, me: newcomer, ranking: [...individualReadingFixture.ranking, newcomer],
} } };
export const NewcomerNarrow: Story = { args: NewcomerPace.args, parameters: { viewport: 'compact', textSize: 'xl' } };
export const NewcomerDark: Story = { args: NewcomerPace.args, parameters: { scheme: 'dark' } };
export const OnlyNewcomers: Story = { args: { initialMetric: 'pace', data: {
  ...individualReadingFixture, me: newcomer, ranking: [newcomer],
} } };
