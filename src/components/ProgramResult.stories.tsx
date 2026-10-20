import type { Meta, StoryObj } from '@storybook/react-native';
import { demoProgram, demoProgramStats } from '../storybook/livenFixtures';
import { ProgramResultContent } from './ProgramResult';
const meta = { title: 'Liven/ProgramResultContent', component: ProgramResultContent, 
  args: { program: demoProgram, stats: demoProgramStats },
} satisfies Meta<typeof ProgramResultContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
