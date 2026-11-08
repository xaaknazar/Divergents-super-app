import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { MiniPlayerCard } from './MiniPlayerCard';
const meta = {
  title: 'Обучение/MiniPlayerCard', component: MiniPlayerCard,
  args: { title: 'Тренинг', courseTitle: '4 параметра руководителя', kind: 'lesson', playing: true,
    progress: 0.35, onOpen: fn(), onToggle: fn(), onClose: fn() },
  parameters: { reduceTransparency: false },
} satisfies Meta<typeof MiniPlayerCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playing: Story = {};
export const Paused: Story = { args: { playing: false } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const DownloadedAudio: Story = { args: { kind: 'download' } };
export const Compact: Story = { args: { title: 'Очень длинное название текущего урока', courseTitle: 'Полный курс личностного развития' }, parameters: { viewport: 'compact' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
