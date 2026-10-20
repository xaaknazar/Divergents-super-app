import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { SectionHeader } from './SectionHeader';

const meta = {
  title: 'Списки/SectionHeader', component: SectionHeader,
  args: { title: 'Продолжить обучение', action: 'Все курсы', onAction: fn() },
} satisfies Meta<typeof SectionHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithAction: Story = {};
export const TitleOnly: Story = { args: { action: undefined, onAction: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
