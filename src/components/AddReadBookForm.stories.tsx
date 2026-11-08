import type { Meta, StoryObj } from '@storybook/react-native';
import { AddReadBookForm } from './AddReadBookForm';
const meta = { title: 'Books/AddReadBookForm', component: AddReadBookForm,
  args: { title: '', author: '', onTitleChange: () => {}, onAuthorChange: () => {} },
} satisfies Meta<typeof AddReadBookForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Filled: Story = { args: { title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери' } };
export const Dark: Story = { ...Filled, parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { ...Filled, parameters: { scheme: 'dark', viewport: 'compact', textSize: 'xl' } };
export const Retry: Story = { ...Filled, args: { ...Filled.args, error: 'Не удалось сохранить книгу. Попробуйте ещё раз.' } };
export const Saving: Story = { ...Filled, args: { ...Filled.args, busy: true } };
