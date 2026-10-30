import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingChallengeShelf } from './ReadingChallengeShelf';
const meta = { title: 'Reading/Shelf', component: ReadingChallengeShelf,
  args: { items: [{ id: 'demo-active', title: 'Одна книга ближе', startDate: '2026-11-01', durationDays: 21, phase: 'active', membership: 'approved' },
    { id: 'demo-new', title: 'Читаем вместе', startDate: '2026-12-01', durationDays: 30, phase: 'upcoming', membership: null }],
    error: false, onRetry: () => {}, onOpen: () => {} },
} satisfies Meta<typeof ReadingChallengeShelf>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Offline: Story = { args: { error: true } };
export const OfflineDark: Story = { args: { error: true }, parameters: { scheme: 'dark' } };
export const FirstLoadFailed: Story = { args: { error: true, items: [] } };
export const ReleaseDisabled: Story = { args: { items: [] } };
