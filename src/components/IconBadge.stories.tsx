import type { Meta,StoryObj } from '@storybook/react-native';
import { IconBadge } from './IconBadge';
const meta = { title: 'Основа/IconBadge', component: IconBadge,
  args: { icon: 'book.fill' }, argTypes: {
    tone: { control: 'select', options: ['brand', 'success', 'danger', 'neutral'] },
    size: { control: 'select', options: ['small', 'regular', 'large'] },
    variant: { control: 'select', options: ['solid', 'tinted', 'halo'] },
    shape: { control: 'select', options: ['circle', 'squircle'] },
  },
} satisfies Meta<typeof IconBadge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Sport: Story = { args: { tone: 'success', icon: 'figure.run' } };
export const Sugar: Story = { args: { tone: 'danger', icon: 'cube.fill', shape: 'squircle', size: 'large' } };
export const Route: Story = { args: { variant: 'tinted', size: 'small', icon: 'mappin.and.ellipse' } };
export const Neutral: Story = { args: { tone: 'neutral', icon: 'hand.raised.fill' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const EmptyStateHalo: Story = { args: { variant: 'halo', tone: 'neutral' } };
export const ErrorStateHalo: Story = { args: { variant: 'halo', tone: 'danger', icon: 'exclamationmark.bubble' } };
