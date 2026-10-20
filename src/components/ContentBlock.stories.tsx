import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { ContentBlock } from './ContentBlock';
import { IconBadge } from './IconBadge';
import { ListRow } from './ListRow';
import { StoryCanvas } from './StoryCanvas';

const meta = { title: 'Surfaces/ContentBlock', component: ContentBlock,
  decorators: [(Story) => <StoryCanvas><Story /></StoryCanvas>],
  args: { children: <ListRow title="Пример блока" subtitle="Демонстрационные данные" leading={<IconBadge icon="book.fill" variant="tinted" />} /> },
} satisfies Meta<typeof ContentBlock>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Regular: Story = {};
export const Compact: Story = { args: { size: 'compact' } };
export const Flush: Story = { args: { size: 'flush' } };
export const Floating: Story = { args: { elevated: true } };
export const Dark: Story = { decorators: [(Story) => <StoryCanvas scheme="dark"><Story /></StoryCanvas>] };
