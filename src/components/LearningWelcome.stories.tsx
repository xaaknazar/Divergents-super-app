import type { Meta,StoryObj } from '@storybook/react-native';
import { LearningWelcome } from './LearningWelcome';

const meta = { title: 'Обучение/LearningWelcome', component: LearningWelcome, args: { displayName: 'Участник', courseCount: 12 },
} satisfies Meta<typeof LearningWelcome>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Guest: Story = { args: { displayName: null, courseCount: 0 } };
export const LongName: Story = { args: { displayName: 'Очень длинное имя участника сообщества' }, parameters: { textSize: 'xl', viewport: 'compact' } };
