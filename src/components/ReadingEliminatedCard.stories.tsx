import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingEliminatedCard } from './ReadingEliminatedCard';
const meta = { title: 'Reading/Year/ReadingEliminatedCard', component: ReadingEliminatedCard,
  args: { flags: 5, personalDay: 12, busy: false, onRestart: () => {} } } satisfies Meta<typeof ReadingEliminatedCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
/** Сервер без сброса: только пояснение. */
export const WithoutRestart: Story = { args: { onRestart: undefined } };
