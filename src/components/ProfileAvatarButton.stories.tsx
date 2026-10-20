import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ProfileAvatarButton } from './ProfileAvatarButton';

const meta = { title: 'Навигация/ProfileAvatarButton', component: ProfileAvatarButton,
  args: { name: 'Акназар Ибраев', progress: 75, badge: 0, variant: 'plain', onPress: fn() },
  argTypes: { variant: { control: 'select', options: ['plain', 'floating'] }, progress: { control: { type: 'range', min: 0, max: 100, step: 5 } } },
} satisfies Meta<typeof ProfileAvatarButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Initials: Story = {};
export const Complete: Story = { args: { progress: 100 } };
export const WithBadge: Story = { args: { badge: 3 } };
export const ManyEvents: Story = { args: { badge: 14, progress: 40 } };
export const NoName: Story = { args: { name: null, progress: 0 } };
export const Photo: Story = { args: { photoUrl: 'https://i.pravatar.cc/200?img=12', progress: 60, badge: 2 } };
export const Floating: Story = { args: { variant: 'floating', badge: 1 }, parameters: { reduceTransparency: false } };
export const Dark: Story = { args: { badge: 5 }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { badge: 12 }, parameters: { textSize: 'xl' } };
