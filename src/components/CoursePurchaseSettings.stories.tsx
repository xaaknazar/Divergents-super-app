import type { Meta, StoryObj } from '@storybook/react-native';
import { CoursePurchaseSettings } from './CoursePurchaseSettings';

const meta = { title: 'Courses/PurchaseSettings', component: CoursePurchaseSettings,
  args: { phase: 'idle', message: null, onRestore: () => {} } } satisfies Meta<typeof CoursePurchaseSettings>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Restoring: Story = { args: { phase: 'restoring' } };
export const Restored: Story = { args: { phase: 'success', message: 'Покупка подтверждена. Курс открыт.' } };
export const Error: Story = { args: { phase: 'error', message: 'Не удалось проверить покупки. Попробуйте ещё раз — повторно оплачивать курс не нужно.' } };
