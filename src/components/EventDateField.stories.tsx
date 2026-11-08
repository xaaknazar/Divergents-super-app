import type { Meta, StoryObj } from '@storybook/react-native';
import { EventDateField } from './EventDateField';
const meta = { title: 'Community/EventDateField', component: EventDateField, args: { value: '2026-11-20 17:00', onChange: () => {} } } satisfies Meta<typeof EventDateField>;
export default meta; type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Disabled: Story = { args: { disabled: true } };
