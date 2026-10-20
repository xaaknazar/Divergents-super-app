import type { Meta, StoryObj } from '@storybook/react-native';
import { demoProgram, demoProgramStats } from '../storybook/livenFixtures';
import { ProgramResultHero } from './ProgramResultHero';
const meta = { title: 'Liven/ProgramResultHero', component: ProgramResultHero, 
  args: { program: demoProgram, stats: demoProgramStats },
} satisfies Meta<typeof ProgramResultHero>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
