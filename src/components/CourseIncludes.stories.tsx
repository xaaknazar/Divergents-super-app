import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CourseIncludes } from './CourseIncludes';

const meta = { title: 'Liven/Details/CourseIncludes', component: CourseIncludes, args: { lessonCount: 12, hasMaterials: true },  } satisfies Meta<typeof CourseIncludes>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const NoAttachments: Story = { args: { hasMaterials: false } };
