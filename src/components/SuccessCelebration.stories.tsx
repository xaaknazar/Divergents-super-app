import type { Meta,StoryObj } from '@storybook/react-native';
import { SuccessCelebration } from './SuccessCelebration';
const meta = { title: 'Создание/SuccessCelebration', component: SuccessCelebration,
  parameters: { reduceMotion: false },
} satisfies Meta<typeof SuccessCelebration>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Animated: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
