import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingAppearanceGallery } from './ReadingAppearanceGallery';
const meta = { title: 'Reading/Appearance gallery', component: ReadingAppearanceGallery,
  args: { value: { card: 'feature', header: 'editorial' }, onChange: () => {} },
  parameters: { canvasLayout: 'content' },
} satisfies Meta<typeof ReadingAppearanceGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
