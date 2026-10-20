import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingApplicantsContent } from './ReadingApplicantsContent';
import { readingApplicantFixture, readingApplicantsFixture } from '../storybook/readingApplicantFixtures';
const meta = { title: 'Reading/Applicants', component: ReadingApplicantsContent, parameters: { canvasLayout: 'content' },
  args: { data: readingApplicantsFixture, loading: false, profileLoading: false, busy: false,
    onRetry: () => {}, onSelect: () => {}, onClose: () => {}, onRetryProfile: () => {}, onDecide: () => {}, onRetryDecision: () => {} },
} satisfies Meta<typeof ReadingApplicantsContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Empty: Story = { args: { data: { ...readingApplicantsFixture, applications: [] } } };
export const Loading: Story = { args: { data: undefined, loading: true } };
export const Error: Story = { args: { data: undefined, error: 'Не удалось загрузить заявки. Проверьте соединение и повторите попытку.' } };
export const Questionnaire: Story = { args: { selectedId: readingApplicantFixture.id, applicant: readingApplicantFixture }, parameters: { scheme: 'dark' } };
export const QuestionnaireLoading: Story = { args: { selectedId: readingApplicantFixture.id, profileLoading: true } };
export const DecisionPending: Story = { args: { selectedId: readingApplicantFixture.id, applicant: readingApplicantFixture,
  pendingDecision: 'approved', decisionError: 'Нет подтверждения сервера. Проверьте решение повторно.' } };
