import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { sampleCourses } from '../storybook/courseFixtures';
import { CourseCatalogGrid } from './CourseCatalogGrid';
import { NavBarLarge } from './NavBarLarge';
import { Screen } from './Screen';
const meta = { title: 'Навигация/Screen', component: Screen,
  parameters: { canvasLayout: 'screen' },
  args: { largeTitle: 'Обучение', onRefresh: fn(), children: <>
    <NavBarLarge title="Обучение" subtitle="Добрый день, Акназар" />
    <CourseCatalogGrid courses={[...sampleCourses, ...sampleCourses.map(c => ({ ...c, id: c.id + '-copy' }))]}
      ownedProgress={{}} onCoursePress={fn()} />
  </> },
} satisfies Meta<typeof Screen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Scrollable: Story = {};
export const NoTabs: Story = { args: { tabPadding: false } };
export const Transparent: Story = { args: { surface: 'transparent' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const WithBackdrop: Story = { args: { backdrop: 'learn' }, parameters: { reduceTransparency: false } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
