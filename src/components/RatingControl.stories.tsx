import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { RatingControl } from './RatingControl';

const meta = { title: 'Liven/Details/RatingControl', component: RatingControl, args: { value: 3, onChange: () => {} },  } satisfies Meta<typeof RatingControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Unrated: Story = { args: { value: null } }; export const Disabled: Story = { args: { disabled: true } };
