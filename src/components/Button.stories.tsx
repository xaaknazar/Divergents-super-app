import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Основа/Button', component: Button,
  args: { label: 'Сохранить изменения', onPress: fn() },
  argTypes: {
    variant: { control: 'select', options: ['solid', 'tinted', 'outline', 'plain'] },
    tone: { control: 'select', options: ['brand', 'success', 'warning', 'danger', 'neutral'] },
    size: { control: 'select', options: ['compact', 'regular', 'comfortable', 'large'] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Tinted: Story = { args: { variant: 'tinted' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Plain: Story = { args: { variant: 'plain' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Approved: Story = { args: { tone: 'success', icon: 'checkmark', label: 'Принять' } };
export const Destructive: Story = { args: { tone: 'danger', label: 'Отклонить' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { label: 'Сохранить анкету и продолжить регистрацию', icon: 'arrow.right' }, parameters: { textSize: 'xl', viewport: 'compact' } };
