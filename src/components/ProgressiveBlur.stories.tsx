import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { sampleCourses } from '../storybook/courseFixtures';
import { CourseCatalogGrid } from './CourseCatalogGrid';
import { ProgressiveBlur } from './ProgressiveBlur';
import { Screen } from './Screen';
const meta = { title: 'Навигация/ProgressiveBlur', component: ProgressiveBlur,
  parameters: { canvasLayout: 'screen', reduceTransparency: false },
  render: args => <Screen tabPadding={false}>
    <CourseCatalogGrid courses={sampleCourses} ownedProgress={{}} onCoursePress={fn()} />
    <ProgressiveBlur {...args} />
  </Screen>,
} satisfies Meta<typeof ProgressiveBlur>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Bottom: Story = {};
export const Top: Story = { args: { position: 'top' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
