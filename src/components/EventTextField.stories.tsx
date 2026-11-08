import type { Meta, StoryObj } from '@storybook/react-native';
import { EventTextField } from './EventTextField';
const meta = { title: 'Community/EventTextField', component: EventTextField, args: { label: 'Описание', value: 'Пример текста встречи', onChange: () => {}, mode: 'description' } } satisfies Meta<typeof EventTextField>;
export default meta; type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Disabled: Story = { args: { disabled: true } };
