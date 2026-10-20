import type { Meta, StoryObj } from '@storybook/react-native';

import { FieldError } from './FieldError';
const meta = { title: 'Liven/FieldError', component: FieldError, 
  args: { message: 'Проверьте введённое значение' },
} satisfies Meta<typeof FieldError>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
