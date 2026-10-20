import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingChallengeForm } from './ReadingChallengeForm';
import { nextReadingDate } from '../data/readingCreation';
const meta = { title: 'Reading/Create', component: ReadingChallengeForm,
  args: { busy: false, onSubmit: () => {}, onCancel: () => {} }, parameters: { canvasLayout: 'screen' },
} satisfies Meta<typeof ReadingChallengeForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const DarkLargeText: Story = { parameters: { scheme: 'dark', viewport: 'compact', textSize: 'xl' } };
export const Saving: Story = { args: { busy: true } };
export const Continuous: Story = { args: { initialDraft: { mode: 'continuous', title: 'Каждый день с книгой', startDate: nextReadingDate(), durationDays: 1,
  teams: [{ name: 'Читатели Divergents', capacity: 20, captainNickname: 'Reader' }] } }, parameters: { scheme: 'dark' } };
export const Error: Story = { args: { error: 'Псевдоним капитана не найден. Проверьте написание.' } };
export const Filled: Story = { args: { initialDraft: { title: 'Одна книга ближе', startDate: nextReadingDate(), durationDays: 21,
  teams: [{ name: 'Книжный клуб', capacity: 20, captainNickname: 'Reader' }] } } };
