import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { BookShelfControls } from './BookShelfControls';

const meta = { title: 'Liven/Details/BookShelfControls', component: BookShelfControls, args: { status: 'reading', progress: 25, busy: false, onSelect: () => {}, onRemove: () => {} },  } satisfies Meta<typeof BookShelfControls>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Busy: Story = { args: { busy: true } }; export const NoShelf: Story = { args: { status: undefined } }; export const Read: Story = { args: { status: 'read', progress: 100 } };
