import type { Meta, StoryObj } from '@storybook/react-native';
import { ActivityCalculatorSheet } from './ActivityCalculatorSheet';
const meta = { title: 'Challenges/ActivityCalculator', component: ActivityCalculatorSheet,
  args: { current: 5000, phoneSteps: 5600, gender: 'Женский', onClose: () => {}, onSave: () => {} }, parameters: { canvasLayout: 'screen' },
} satisfies Meta<typeof ActivityCalculatorSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Male: Story = { args: { gender: 'Мужской' } };
export const Unknown: Story = { args: { gender: null, phoneSteps: null, current: 0 } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
