import type { Meta, StoryObj } from '@storybook/react-native';
import { AddReadBookSheet } from './AddReadBookSheet';
const meta = { title: 'Books/AddReadBookSheet', component: AddReadBookSheet,
  args: { onClose: () => {}, onSave: async () => {} },
} satisfies Meta<typeof AddReadBookSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const ServerError: Story = { args: { onSave: async () => { throw new Error('Не удалось сохранить книгу. Попробуйте ещё раз.'); } } };
