import type { Meta, StoryObj } from '@storybook/react-native';
import { ApplicantReportSection } from './ApplicantReportSection';
const meta = { title: 'Applicants/Report section', component: ApplicantReportSection,
  args: { title: 'Образование', rows: [{ label: 'Вузы', value: 'Национальный университет — управление проектами, Алматы, 2017\n\nМагистратура — организационная психология, 2019' }] } } satisfies Meta<typeof ApplicantReportSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
