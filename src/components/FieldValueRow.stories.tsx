import type { Meta,StoryObj } from '@storybook/react-native';
import { FieldValueRow } from './FieldValueRow';
const meta = { title: 'Заявки/FieldValueRow', component: FieldValueRow,
  args: { label: 'Команда', value: 'Divergents team' },
} satisfies Meta<typeof FieldValueRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { value: '' } };
export const HiddenEmpty: Story = { args: { value: null, hideWhenEmpty: true } };
export const LongText: Story = { args: { label: 'Дополнительная информация', value: 'Очень длинное значение поля анкеты участника' }, parameters: { viewport: 'compact', textSize: 'xl' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
