import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ProfileAvatarButton } from './ProfileAvatarButton';

const meta = { title: 'Навигация/ProfileAvatarButton', component: ProfileAvatarButton, args: { onPress: fn() },
} satisfies Meta<typeof ProfileAvatarButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Disabled: Story = { args: { onPress: undefined } };
// Local malformed data URL exercises fallback without requesting a server.
export const BrokenPhoto: Story = { args: { photoUrl: 'data:image/png;base64,invalid' } };
