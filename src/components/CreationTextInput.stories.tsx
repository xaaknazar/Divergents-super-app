import type { Meta, StoryObj } from '@storybook/react-native';
import { CreationTextInput } from './CreationTextInput';
const meta = { title: 'Создание/CreationTextInput', component: CreationTextInput,
  args: { label: 'Название', value: 'Книжный клуб', onChange: () => {} },
} satisfies Meta<typeof CreationTextInput>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Number: Story = { args: { label: 'Мест', value: '20', kind: 'number' } };
export const Nickname: Story = { args: { label: 'Псевдоним', value: 'Reader', kind: 'nickname' } };
export const Disabled: Story = { args: { disabled: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
