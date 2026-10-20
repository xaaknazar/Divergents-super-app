import type { Meta, StoryObj } from '@storybook/react-native';
import { DomainBar } from './talentUI';
const meta = { title: 'Профиль/DomainBar', component: DomainBar, args: { gallup: [] },
} satisfies Meta<typeof DomainBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
