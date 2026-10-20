import type { Meta,StoryObj } from '@storybook/react-native';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Основа/ProgressBar', component: ProgressBar,
  args: { value: 0.65, accessibilityLabel: 'Пройдено уроков' },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    tone: { control: 'select', options: ['brand', 'success'] },
    size: { control: 'select', options: ['thin', 'regular', 'prominent'] },
  },
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 1, tone: 'success' } };
export const Download: Story = { args: { size: 'thin', accessibilityLabel: 'Загрузка' } };
export const Program: Story = { args: { size: 'prominent' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
