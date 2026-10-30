import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
import { ScreenDescription } from './ScreenDescription';

const meta = { title: 'Компоненты/CommunityPreviewProvider', component: CommunityPreviewProvider,
  
  args: { children: <ScreenDescription text="Изолированные данные сообщества" /> },
} satisfies Meta<typeof CommunityPreviewProvider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
