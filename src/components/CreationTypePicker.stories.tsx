import type { Meta, StoryObj } from '@storybook/react-native';
import { CreationTypePicker } from './CreationTypePicker';
const meta = { title: 'Создание/CreationTypePicker', component: CreationTypePicker,
  args: { options: [{ key: 'challenge', label: 'Челлендж' }, { key: 'meetup', label: 'Мероприятие' }], value: 'challenge', onChange: () => {} },
} satisfies Meta<typeof CreationTypePicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Reading: Story = { args: { options: [{ key: 'reading', label: 'Читательский челлендж' }], value: 'reading', onChange: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
