import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { LearningResumeCard } from './LearningResumeCard';

const meta = { title: 'Обучение/LearningResumeCard', component: LearningResumeCard,
  args: { title: 'Максимизация талантов Gallup', caption: 'Урок 15 из 34 · Significance', progress: 42, onPress: fn() },
} satisfies Meta<typeof LearningResumeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const NoLesson: Story = { args: { caption: 'Саморазвитие · 34 урока', progress: 8 } };
export const LongTitle: Story = { args: { title: 'Курс «Учимся разбираться в людях» — продвинутый уровень для руководителей', progress: 77 } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
